# ruff: noqa: PT009, PT027
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from src.migrations.terms_v2 import load_normalization_mapping, migrate_terms_v2


class NormalizationMappingTests(unittest.TestCase):
    def test_loads_schema_v1_mapping_to_old_and_canonical_names(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "terms.normalization-map.json"
            path.write_text(
                json.dumps(
                    {
                        "schema_version": 1,
                        "mapping": {
                            "RAM": {"canonical_name": "Жедел жад"},
                            "ЖЖҚ": {"canonical_name": "Жедел жад"},
                        },
                    },
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )

            self.assertEqual(
                load_normalization_mapping(path),
                {"RAM": "Жедел жад", "ЖЖҚ": "Жедел жад"},
            )

    def test_rejects_invalid_mapping_payloads(self):
        invalid_payloads = (
            {"schema_version": 2, "mapping": {}},
            {"schema_version": 1},
            {"schema_version": 1, "mapping": {"": {"canonical_name": "x"}}},
            {"schema_version": 1, "mapping": {"RAM": {}}},
        )
        for payload in invalid_payloads:
            with self.subTest(payload=payload), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / "map.json"
                path.write_text(json.dumps(payload), encoding="utf-8")
                with self.assertRaises(ValueError):
                    load_normalization_mapping(path)


class TermsV2MigrationPostgresTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        database_url = os.environ.get("TEST_DATABASE_URL", "").strip()
        if not database_url:
            if os.environ.get("REQUIRE_POSTGRES_INTEGRATION") == "1":
                self.fail("NOT RUN: TEST_DATABASE_URL is required for terms v2 migration verification")
            self.skipTest("NOT RUN: set TEST_DATABASE_URL for PostgreSQL terms v2 migration verification")
        if not database_url.startswith("postgresql+psycopg://"):
            self.fail("PostgreSQL terms v2 migration gate requires postgresql+psycopg:// TEST_DATABASE_URL")

        self.schema = f"terms_v2_migration_{uuid4().hex}"
        self.engine: AsyncEngine = create_async_engine(database_url, pool_size=2, max_overflow=0)
        try:
            async with self.engine.begin() as connection:
                await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                await connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                vector_type = await connection.scalar(text("SELECT to_regtype('vector')"))
                if vector_type is None:
                    self.fail("TEST_DATABASE_URL does not provide pgvector")
                quoted = '"' + self.schema.replace('"', '""') + '"'
                await connection.execute(text(f"CREATE SCHEMA {quoted}"))
                await connection.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
                for ddl in (
                    "CREATE TABLE term (id integer PRIMARY KEY, name varchar(255) NOT NULL UNIQUE)",
                    """CREATE TABLE definition (
                        id integer PRIMARY KEY,
                        term_id integer NOT NULL REFERENCES term(id),
                        topic_id integer NOT NULL,
                        text text NOT NULL,
                        page integer NOT NULL,
                        embedding vector(1024)
                    )""",
                    """CREATE TABLE favorite_term (
                        user_id integer NOT NULL,
                        term_id integer NOT NULL REFERENCES term(id) ON DELETE CASCADE,
                        created_at timestamptz NOT NULL,
                        PRIMARY KEY (user_id, term_id)
                    )""",
                    "CREATE INDEX idx_term_name_trgm ON term USING gin (name gin_trgm_ops)",
                ):
                    await connection.execute(text(ddl))
                await self._insert_fixture(connection)
        except BaseException:
            await self.engine.dispose()
            raise

    async def _insert_fixture(self, connection):
        await connection.execute(
            text("INSERT INTO term (id, name) VALUES (1, 'Жедел жад'), (2, 'RAM'), (3, 'ЖЖҚ')"),
        )
        embedding = "[" + ",".join(["0.125"] * 1024) + "]"
        await connection.execute(
            text(
                "INSERT INTO definition (id, term_id, topic_id, text, page, embedding) "
                "VALUES (101, 2, 10, 'ram definition', 9, CAST(:embedding AS vector)), "
                "       (102, 3, 11, 'zhzhq definition', 17, CAST(:embedding AS vector)), "
                "       (103, 1, 12, 'canonical definition', 21, CAST(:embedding AS vector))",
            ),
            {"embedding": embedding},
        )
        first = datetime(2026, 1, 1, tzinfo=UTC)
        second = first + timedelta(days=1)
        await connection.execute(
            text(
                "INSERT INTO favorite_term (user_id, term_id, created_at) VALUES "
                "(1, 1, :first), (1, 2, :second), (2, 3, :first)",
            ),
            {"first": first, "second": second},
        )

    async def asyncTearDown(self):
        if not hasattr(self, "engine"):
            return
        try:
            quoted = '"' + self.schema.replace('"', '""') + '"'
            async with self.engine.begin() as connection:
                await connection.execute(text(f"DROP SCHEMA IF EXISTS {quoted} CASCADE"))
        finally:
            await self.engine.dispose()

    async def _scalar(self, sql: str, **params):
        quoted = '"' + self.schema.replace('"', '""') + '"'
        async with self.engine.connect() as connection:
            await connection.execute(text(f"SET search_path TO {quoted}, public"))
            return await connection.scalar(text(sql), params)

    async def _migrate(self, mapping: dict[str, str]):
        quoted = '"' + self.schema.replace('"', '""') + '"'
        async with self.engine.begin() as connection:
            await connection.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
            return await migrate_terms_v2(connection, mapping=mapping)

    async def test_migrates_old_term_identities_without_losing_rows_or_favorites(self):
        definitions_before = await self._scalar("SELECT count(*) FROM definition")
        original_embedding = await self._scalar("SELECT embedding::text FROM definition WHERE id = 101")

        stats = await self._migrate({"RAM": "Жедел жад", "ЖЖҚ": "Жедел жад"})

        self.assertEqual(stats.definitions_before, definitions_before)
        self.assertEqual(await self._scalar("SELECT count(*) FROM definition"), definitions_before)
        self.assertEqual(await self._scalar("SELECT count(*) FROM definition WHERE name IS NULL"), 0)
        canonical_term_id = await self._scalar("SELECT id FROM term WHERE name = 'Жедел жад'")
        self.assertEqual(await self._scalar("SELECT term_id FROM definition WHERE id = 101"), canonical_term_id)
        self.assertEqual(await self._scalar("SELECT name FROM definition WHERE id = 101"), "RAM")
        self.assertEqual(await self._scalar("SELECT name FROM definition WHERE id = 102"), "ЖЖҚ")
        self.assertEqual(await self._scalar("SELECT embedding::text FROM definition WHERE id = 101"), original_embedding)
        self.assertEqual(await self._scalar("SELECT count(*) FROM term WHERE name IN ('RAM', 'ЖЖҚ')"), 0)
        self.assertEqual(
            await self._scalar(
                "SELECT count(*) FROM favorite_term WHERE user_id = 1 AND term_id = :canonical",
                canonical=canonical_term_id,
            ),
            1,
        )
        self.assertEqual(await self._scalar("SELECT count(*) FROM favorite_term WHERE user_id = 1"), 1)
        self.assertEqual(
            await self._scalar(
                "SELECT count(*) FROM pg_indexes WHERE schemaname = :schema "
                "AND indexname = 'idx_definition_name_trgm'",
                schema=self.schema,
            ),
            1,
        )
        self.assertEqual(
            await self._scalar(
                "SELECT count(*) FROM pg_indexes WHERE schemaname = :schema "
                "AND indexname = 'idx_term_name_trgm'",
                schema=self.schema,
            ),
            0,
        )

    async def test_rerun_is_idempotent_and_keeps_canonical_rows(self):
        await self._migrate({"RAM": "Жедел жад", "ЖЖҚ": "Жедел жад"})
        snapshot = (
            await self._scalar("SELECT count(*) FROM definition"),
            await self._scalar("SELECT string_agg(id::text || ':' || term_id::text || ':' || name, ',' ORDER BY id) FROM definition"),
            await self._scalar("SELECT count(*) FROM favorite_term"),
        )

        stats = await self._migrate({"RAM": "Жедел жад", "ЖЖҚ": "Жедел жад"})

        self.assertEqual(stats.definitions_before, snapshot[0])
        self.assertEqual(
            (
                await self._scalar("SELECT count(*) FROM definition"),
                await self._scalar("SELECT string_agg(id::text || ':' || term_id::text || ':' || name, ',' ORDER BY id) FROM definition"),
                await self._scalar("SELECT count(*) FROM favorite_term"),
            ),
            snapshot,
        )
        self.assertEqual(
            await self._scalar(
                "SELECT count(*) FROM pg_indexes WHERE schemaname = :schema "
                "AND indexname = 'idx_definition_name_trgm'",
                schema=self.schema,
            ),
            1,
        )
        self.assertEqual(
            await self._scalar(
                "SELECT count(*) FROM pg_indexes WHERE schemaname = :schema "
                "AND indexname = 'idx_term_name_trgm'",
                schema=self.schema,
            ),
            0,
        )

    async def test_missing_canonical_name_rolls_back_all_changes(self):
        quoted = '"' + self.schema.replace('"', '""') + '"'
        with self.assertRaises(ValueError):
            async with self.engine.begin() as connection:
                await connection.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
                await migrate_terms_v2(connection, mapping={"RAM": "Missing canonical"})

        self.assertEqual(await self._scalar("SELECT count(*) FROM information_schema.columns WHERE table_schema = :schema AND table_name = 'definition' AND column_name = 'name'", schema=self.schema), 0)
        self.assertEqual(await self._scalar("SELECT count(*) FROM term WHERE name = 'RAM'"), 1)
        self.assertEqual(await self._scalar("SELECT count(*) FROM favorite_term WHERE term_id = 2"), 1)


if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


if __name__ == "__main__":
    unittest.main()
