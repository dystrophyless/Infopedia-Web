from __future__ import annotations

# ruff: noqa: BLE001, E402, EM102, INP001, PLR0915, S603, S608, TRY301
import json
import os
import re
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
from src.loader import load_terms_from_json_core

DB_NAME_RE = re.compile(r"^infopedia_search_terms_test_\d{8}T\d{6}_[0-9a-f]{8}$")
SCHEMA_PREFLIGHT_QUERIES = {
    "definition_name_not_null": """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'definition'
              AND column_name = 'name'
              AND is_nullable = 'NO'
        );
    """,
    "definition_name_trgm_index": """
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_definition_name_trgm'
              AND indexdef ILIKE '%USING gin (name gin_trgm_ops)%'
        );
    """,
    "legacy_term_name_trgm_absent": """
        SELECT NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname = 'idx_term_name_trgm'
        );
    """,
}


def _database_name(timestamp: str, suffix: str) -> str:
    name = f"infopedia_search_terms_test_{timestamp}_{suffix}"
    if not DB_NAME_RE.fullmatch(name):
        raise ValueError("unsafe disposable database name")
    return name


def _parse_unittest_summary(output: str) -> tuple[int, int]:
    count_match = re.search(r"Ran (\d+) tests?", output)
    skip_match = re.search(r"skipped=(\d+)", output)
    if count_match is None:
        raise ValueError("unittest summary not found")
    return int(count_match.group(1)), int(skip_match.group(1)) if skip_match else 0


def _parse_preflight_boolean(output: str) -> bool:
    value = output.strip().lower()
    if value not in {"t", "true", "f", "false"}:
        raise ValueError(f"unexpected PostgreSQL boolean result: {output!r}")
    return value in {"t", "true"}


def _loader_readiness_checks() -> dict[str, bool]:
    """Verify the direct catalog-loader contract without loading the catalog."""
    prepare_source = (ROOT / "src" / "prepare_app.py").read_text(encoding="utf-8")
    loader_source = (ROOT / "src" / "loader.py").read_text(encoding="utf-8")
    result = {
        "loader_entrypoint_callable": callable(load_terms_from_json_core),
        "loader_entrypoint_present": "def load_terms_from_json_core" in loader_source,
        "prepare_app_direct_terms_path": 'get_data_file_path("terms.json")' in prepare_source,
        "migration_dependency_absent": "src.migrations" not in prepare_source
        and "normalization-map" not in prepare_source.lower(),
    }
    if not all(result.values()):
        failed = ", ".join(name for name, passed in result.items() if not passed)
        raise RuntimeError(f"loader readiness contract failed: {failed}")
    return result


def _schema_preflight(*, user: str, database: str) -> dict[str, bool]:
    result: dict[str, bool] = {}
    for name, query in SCHEMA_PREFLIGHT_QUERIES.items():
        check = _run(
            [
                "docker",
                "compose",
                "exec",
                "-T",
                "postgres",
                "psql",
                "-qAt",
                "-U",
                user,
                "-d",
                database,
                "-c",
                query,
            ],
        )
        if check.returncode:
            raise RuntimeError(check.stderr.strip() or f"schema preflight query failed: {name}")
        result[name] = _parse_preflight_boolean(check.stdout)
    return result


def _schema_preflight_passes(result: dict[str, bool]) -> bool:
    return set(result) == set(SCHEMA_PREFLIGHT_QUERIES) and all(value is True for value in result.values())


def _dotenv() -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def _run(args: list[str], *, env=None, stdin=None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        env=env,
        input=stdin,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )


def main() -> int:
    config = _dotenv()
    user = config["POSTGRES_USER"]
    password = config["POSTGRES_PASSWORD"]
    source = config["POSTGRES_DB"]
    port = config.get("POSTGRES_PORT", "5432")
    database = _database_name(datetime.now(UTC).strftime("%Y%m%dT%H%M%S"), uuid4().hex[:8])
    created = False
    cleanup_verified = False
    payload: dict[str, object] = {"database": database, "disposable": True}
    try:
        create = _run(["docker", "compose", "exec", "-T", "postgres", "createdb", "-U", user, database])
        if create.returncode:
            raise RuntimeError(create.stderr.strip() or "createdb failed")
        created = True
        bootstrap_environment = {
            **os.environ,
            "POSTGRES_DB": database,
            "POSTGRES_USER": user,
            "POSTGRES_PASSWORD": password,
            "POSTGRES_HOST": "127.0.0.1",
            "POSTGRES_PORT": port,
        }
        schema_bootstrap = _run(
            [
                sys.executable,
                "-c",
                (
                    "import asyncio, sys; "
                    "asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy()) "
                    "if sys.platform == 'win32' and hasattr(asyncio, 'WindowsSelectorEventLoopPolicy') else None; "
                    "from src.database import async_engine; "
                    "from src.schema import initialize_schema; "
                    "asyncio.run(initialize_schema(async_engine))"
                ),
            ],
            env=bootstrap_environment,
        )
        payload["bootstrap"] = {
            "command": "python -c initialize_schema",
            "exit_code": schema_bootstrap.returncode,
        }
        if schema_bootstrap.returncode:
            raise RuntimeError(schema_bootstrap.stderr.strip() or "canonical schema bootstrap failed")

        payload["loader_readiness"] = _loader_readiness_checks()

        schema_preflight = _schema_preflight(user=user, database=database)
        payload["schema_preflight"] = schema_preflight
        if not _schema_preflight_passes(schema_preflight):
            failed_checks = [name for name, passed in schema_preflight.items() if not passed]
            raise RuntimeError(f"schema preflight failed: {', '.join(failed_checks)}")
        database_url = f"postgresql+psycopg://{quote(user, safe='')}:{quote(password, safe='')}@127.0.0.1:{port}/{database}"
        environment = {**os.environ, "TEST_DATABASE_URL": database_url}

        schema = _run([sys.executable, "-m", "tests.schema_signature"], env=environment)
        schema_payload = json.loads(schema.stdout)
        payload["schema_signature"] = {
            "exit_code": schema.returncode,
            "tables": len(schema_payload.get("signature", {}).get("tables", ())),
            "mismatch_count": schema_payload.get("mismatch_count"),
        }
        if schema.returncode:
            raise RuntimeError("canonical schema signature failed")

        tests = _run([sys.executable, "-m", "unittest", "tests.test_search_terms_repository_postgres", "-v"], env=environment)
        test_output = tests.stdout + tests.stderr
        count, skipped = _parse_unittest_summary(test_output)
        payload["repository_tests"] = {"exit_code": tests.returncode, "tests": count, "skipped": skipped}
        if tests.returncode or skipped:
            raise RuntimeError("PostgreSQL repository tests failed or skipped")
        payload["status"] = "PASS"
        return_code = 0
    except Exception as exc:
        payload.update(status="ERROR", reason=str(exc))
        return_code = 1
    finally:
        if created:
            drop = _run(["docker", "compose", "exec", "-T", "postgres", "dropdb", "--if-exists", "-U", user, database])
            probe = _run(["docker", "compose", "exec", "-T", "postgres", "psql", "-U", user, "-d", source, "-tAc", f"SELECT 1 FROM pg_database WHERE datname='{database}'"])
            cleanup_verified = drop.returncode == 0 and probe.returncode == 0 and not probe.stdout.strip()
        payload["cleanup_verified"] = cleanup_verified
        if not cleanup_verified:
            payload["status"] = "ERROR"
            return_code = 1
        print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    return return_code


if __name__ == "__main__":
    raise SystemExit(main())
