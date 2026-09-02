from __future__ import annotations

# ruff: noqa: BLE001, EM102, INP001, PLR0915, S603, S608, TRY301
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
        dump = _run(["docker", "compose", "exec", "-T", "postgres", "pg_dump", "-U", user, source])
        if dump.returncode:
            raise RuntimeError(dump.stderr.strip() or "pg_dump failed")
        restore = _run(
            ["docker", "compose", "exec", "-T", "postgres", "psql", "-q", "-v", "ON_ERROR_STOP=1", "-U", user, database],
            stdin=dump.stdout,
        )
        if restore.returncode:
            raise RuntimeError(restore.stderr.strip() or "psql restore failed")
        schema_preflight = _schema_preflight(user=user, database=database)
        payload["schema_preflight"] = schema_preflight
        if not _schema_preflight_passes(schema_preflight):
            failed_checks = [name for name, passed in schema_preflight.items() if not passed]
            raise RuntimeError(f"schema preflight failed: {', '.join(failed_checks)}")
        database_url = f"postgresql+psycopg://{quote(user, safe='')}:{quote(password, safe='')}@127.0.0.1:{port}/{database}"
        environment = {**os.environ, "TEST_DATABASE_URL": database_url}
        tests = _run([sys.executable, "-m", "unittest", "tests.test_search_terms_repository_postgres", "-v"], env=environment)
        test_output = tests.stdout + tests.stderr
        count, skipped = _parse_unittest_summary(test_output)
        payload["repository_tests"] = {"exit_code": tests.returncode, "tests": count, "skipped": skipped}
        if tests.returncode or skipped:
            raise RuntimeError("PostgreSQL repository tests failed or skipped")
        benchmark = _run([sys.executable, "scripts/benchmark_search_terms.py"], env=environment)
        benchmark_payload = json.loads(benchmark.stdout)
        payload["benchmark"] = benchmark_payload
        payload["benchmark_exit_code"] = benchmark.returncode
        if benchmark.returncode or benchmark_payload.get("status") != "PASS":
            raise RuntimeError("benchmark did not pass")
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
