# ruff: noqa: PT009
"""Read-only canonical schema gate for the configured PostgreSQL database."""

from __future__ import annotations

import asyncio
import io
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

from sqlalchemy.ext.asyncio import create_async_engine

from tests.schema_signature import (
    _normalise_expression,
    _normalise_type,
    assert_canonical_schema,
    build_schema_mismatch_manifest,
    collect_schema_mismatches,
    configured_postgres_url,
    main,
    read_schema_signature,
)

if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


class ExistingSchemaSignaturePostgresTests(unittest.IsolatedAsyncioTestCase):
    async def test_read_signature_binds_to_passed_connection(self):
        connection = object()
        with patch(
            "tests.schema_signature.introspect_postgres_schema",
            new=AsyncMock(return_value={"transaction_read_only": True}),
        ) as collector:
            result = await read_schema_signature(connection)  # type: ignore[arg-type]

        self.assertEqual(result, {"transaction_read_only": True})
        bound_engine = collector.await_args.args[0]
        self.assertIs(bound_engine.bound, connection)

    def test_mismatch_collection_reports_all_findings_and_is_jsonable(self):
        signature = {
            "server_version_num": 160000,
            "transaction_read_only": True,
            "extensions": (),
            "tables": (),
            "columns": {},
            "indexes": {},
            "constraints": {},
            "sequences": {},
            "test_catalog_generation_id_dependency_graph": {},
        }
        mismatches = collect_schema_mismatches(signature)
        kinds = {item["kind"] for item in mismatches}
        self.assertIn("server_version", kinds)
        self.assertIn("extension_missing", kinds)
        self.assertGreater(len(mismatches), 2)
        manifest = build_schema_mismatch_manifest(signature)
        self.assertEqual(manifest["mismatch_count"], len(mismatches))
        self.assertIsInstance(manifest["json"], str)
        json.dumps(manifest)

    def test_type_normalization_is_token_safe(self):
        self.assertEqual(_normalise_type("float8"), "float8")
        self.assertEqual(_normalise_type("double precision"), "float8")
        self.assertEqual(_normalise_type("character varying(17)"), "varchar(17)")

    def test_expression_normalization_handles_only_safe_equivalences(self):
        self.assertEqual(
            _normalise_expression("(chapter_id IS NULL)"),
            _normalise_expression("chapter_id IS NULL"),
        )
        self.assertEqual(
            _normalise_expression("CHECK (locale IN ('kk', 'ru'))"),
            _normalise_expression("CHECK (locale = ANY (ARRAY['kk'::text, 'ru'::text][]))"),
        )
        self.assertNotEqual(
            _normalise_expression("value = ANY (ARRAY['x', NULL])"),
            _normalise_expression("value IN ('x', NULL)"),
        )

    def test_constraint_backing_indexes_are_not_unexpected_but_duplicates_are(self):
        signature = {
            "server_version_num": 170000,
            "transaction_read_only": True,
            "extensions": ("pg_trgm", "vector"),
            "tables": (),
            "columns": {},
            "indexes": {
                "term_pkey": {
                    "table": "term",
                    "columns": ("id",),
                    "access_method": "btree",
                    "unique": True,
                    "predicate": None,
                    "valid": True,
                    "ready": True,
                },
                "rogue_duplicate_idx": {
                    "table": "term",
                    "columns": ("id",),
                    "access_method": "btree",
                    "unique": False,
                    "predicate": None,
                    "valid": True,
                    "ready": True,
                },
            },
            "constraints": {
                "term_pkey": {
                    "table": "term",
                    "type": "p",
                    "columns": ("id",),
                },
            },
            "sequences": {},
            "test_catalog_generation_id_dependency_graph": {},
        }
        unexpected = {
            item["index"]
            for item in collect_schema_mismatches(signature)
            if item["kind"] == "index_unexpected"
        }
        self.assertNotIn("term_pkey", unexpected)
        self.assertIn("rogue_duplicate_idx", unexpected)

    def test_cli_requires_explicit_test_database_url(self):
        environment = dict(os.environ)
        environment.pop("TEST_DATABASE_URL", None)
        result = subprocess.run(  # noqa: S603
            [sys.executable, "-m", "tests.schema_signature"],
            cwd=Path(__file__).resolve().parents[1],
            env=environment,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertIn("TEST_DATABASE_URL is required", result.stderr)

    def test_cli_emits_manifest_stdout_and_status_stderr(self):
        manifest = {
            "mismatches": [],
            "mismatch_count": 0,
            "signature": {"tables": ["term"]},
            "json": "[]",
        }
        stdout = io.StringIO()
        stderr = io.StringIO()
        with patch(
            "tests.schema_signature._capture_cli_manifest",
            new=AsyncMock(return_value=manifest),
        ), patch.dict(os.environ, {"TEST_DATABASE_URL": "postgresql+psycopg://placeholder"}), patch(
            "sys.stdout", stdout,
        ), patch("sys.stderr", stderr):
            result = main()

        self.assertEqual(result, 0)
        self.assertEqual(json.loads(stdout.getvalue()), manifest)
        self.assertIn("schema signature captured: tables=1 mismatches=0", stderr.getvalue())

    def test_cli_module_selects_psycopg_compatible_windows_loop(self):
        if sys.platform != "win32":
            self.skipTest("Windows-only psycopg event-loop regression")
        result = subprocess.run(  # noqa: S603
            [
                sys.executable,
                "-c",
                "import asyncio; import tests.schema_signature; "
                "print(type(asyncio.get_event_loop_policy()).__name__)",
            ],
            cwd=Path(__file__).resolve().parents[1],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0)
        self.assertEqual(result.stdout.strip(), "WindowsSelectorEventLoopPolicy")

    async def test_existing_schema_signature_is_identical_across_two_read_only_calls(self):
        database_url = configured_postgres_url()
        if not database_url:
            if os.environ.get("REQUIRE_POSTGRES_INTEGRATION") == "1":
                self.fail(
                    "NOT RUN: PostgreSQL schema signature requires TEST_DATABASE_URL "
                    "or complete POSTGRES_* configuration",
                )
            self.skipTest(
                "NOT RUN: set TEST_DATABASE_URL or complete POSTGRES_* configuration "
                "for PostgreSQL schema signature verification",
            )
        if not database_url.startswith("postgresql+psycopg"):
            self.fail("PostgreSQL schema signature requires a postgresql+psycopg URL")

        engine = create_async_engine(database_url, pool_size=1, max_overflow=0)
        try:
            async with engine.connect() as connection:
                first = await read_schema_signature(connection)
                second = await read_schema_signature(connection)
            first_manifest = build_schema_mismatch_manifest(first)
            second_manifest = build_schema_mismatch_manifest(second)
            self.assertEqual(first, second)
            self.assertEqual(first_manifest, second_manifest)
            assert_canonical_schema(first)
            self.assertTrue(first["transaction_read_only"])
        finally:
            await engine.dispose()


if __name__ == "__main__":
    unittest.main()
