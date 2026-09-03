# ruff: noqa: PLR0915, PT009, PT027
"""Loader-free disposable PostgreSQL contract for the canonical bootstrap."""

from __future__ import annotations

import os
import re
import unittest
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import tests.schema_signature  # noqa: F401 - installs Windows psycopg policy
from src.schema import initialize_schema
from src.topics.chapter_catalog import load_chapter_catalog
from src.topics.chapter_seed import seed_chapter_catalog
from src.topics.models import Chapter, ChapterTranslation
from tests.schema_signature import assert_canonical_schema, read_schema_signature


def _validated_disposable_admin_url():
    if os.environ.get("ALLOW_DISPOSABLE_POSTGRES") != "1":
        raise ValueError("ALLOW_DISPOSABLE_POSTGRES=1 is required")
    raw_url = os.environ.get("TEST_DISPOSABLE_ADMIN_URL", "").strip()
    if not raw_url.startswith("postgresql+psycopg://"):
        raise ValueError("TEST_DISPOSABLE_ADMIN_URL must use postgresql+psycopg://")
    admin_url = make_url(raw_url)
    if admin_url.database != "postgres":
        raise ValueError("TEST_DISPOSABLE_ADMIN_URL must target database postgres")
    return admin_url


class SchemaBootstrapPostgresContractTests(unittest.IsolatedAsyncioTestCase):
    def test_admin_configuration_fails_closed(self):
        original_opt_in = os.environ.pop("ALLOW_DISPOSABLE_POSTGRES", None)
        original_url = os.environ.pop("TEST_DISPOSABLE_ADMIN_URL", None)
        try:
            with self.assertRaises(ValueError):
                _validated_disposable_admin_url()
            os.environ["ALLOW_DISPOSABLE_POSTGRES"] = "1"
            os.environ["TEST_DISPOSABLE_ADMIN_URL"] = "postgresql+psycopg://example@localhost:5432/infopedia"
            with self.assertRaises(ValueError):
                _validated_disposable_admin_url()
        finally:
            if original_opt_in is not None:
                os.environ["ALLOW_DISPOSABLE_POSTGRES"] = original_opt_in
            else:
                os.environ.pop("ALLOW_DISPOSABLE_POSTGRES", None)
            if original_url is not None:
                os.environ["TEST_DISPOSABLE_ADMIN_URL"] = original_url
            else:
                os.environ.pop("TEST_DISPOSABLE_ADMIN_URL", None)

    async def test_fresh_initializer_seed_idempotence_and_fail_closed_index(self):
        if not os.environ.get("TEST_DISPOSABLE_ADMIN_URL", "").strip():
            if os.environ.get("REQUIRE_POSTGRES_INTEGRATION") == "1":
                self.fail("NOT RUN: TEST_DISPOSABLE_ADMIN_URL is required for disposable PostgreSQL bootstrap verification")
            self.skipTest("NOT RUN: set TEST_DISPOSABLE_ADMIN_URL and ALLOW_DISPOSABLE_POSTGRES=1 for disposable verification")

        try:
            source = _validated_disposable_admin_url()
        except ValueError as exc:
            self.fail(str(exc))
        database_name = f"infopedia_schema_contract_{uuid4().hex[:12]}"
        self.assertRegex(database_name, r"^infopedia_schema_contract_[0-9a-f]{12}$")
        admin_url = source.set(database=source.database or "infopedia")
        target_url = source.set(database=database_name)
        admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT", pool_size=1, max_overflow=0)
        target_engine = None
        created = False
        try:
            async with admin_engine.connect() as connection:
                await connection.execute(text(f'CREATE DATABASE "{database_name}"'))
            created = True
            target_engine = create_async_engine(target_url, pool_size=2, max_overflow=0)
            await initialize_schema(target_engine)
            sessions = async_sessionmaker(target_engine, expire_on_commit=False)

            async with sessions() as session:
                first = await seed_chapter_catalog(session)
                await session.commit()
            async with sessions() as session:
                second = await seed_chapter_catalog(session)
                await session.commit()
            self.assertGreater(first.inserted_chapters, 0)
            self.assertGreater(first.inserted_translations, 0)
            self.assertEqual(second.inserted_chapters, 0)
            self.assertEqual(second.updated_translations, 0)
            self.assertEqual(second.inserted_translations, 0)

            async with sessions() as session:
                external = Chapter(code=f"external-{uuid4().hex[:10]}")
                session.add(external)
                await session.flush()
                session.add(ChapterTranslation(chapter_id=external.id, locale="kk", title="External row"))
                await session.commit()
                external_code = external.code

            catalog_item = load_chapter_catalog()[0]
            catalog_code = str(catalog_item["code"])
            expected_title = str(catalog_item["translations"]["kk"])
            async with sessions() as session:
                chapter = (await session.scalars(select(Chapter).where(Chapter.code == catalog_code))).one()
                translation = (
                    await session.scalars(
                        select(ChapterTranslation).where(
                            ChapterTranslation.chapter_id == chapter.id,
                            ChapterTranslation.locale == "kk",
                        ),
                    )
                ).one()
                translation.title = "drifted title"
                await session.commit()
            async with sessions() as session:
                repaired = await seed_chapter_catalog(session)
                await session.commit()
                self.assertEqual(repaired.updated_translations, 1)
                repaired_translation = (
                    await session.scalars(
                        select(ChapterTranslation).where(
                            ChapterTranslation.chapter_id == chapter.id,
                            ChapterTranslation.locale == "kk",
                        ),
                    )
                ).one()
                self.assertEqual(repaired_translation.title, expected_title)
                external = (await session.scalars(select(Chapter).where(Chapter.code == external_code))).one()
                external_translation = (
                    await session.scalars(
                        select(ChapterTranslation).where(ChapterTranslation.chapter_id == external.id),
                    )
                ).one()
                self.assertEqual(external_translation.title, "External row")

            async with target_engine.connect() as connection:
                signature = await read_schema_signature(connection)
            assert_canonical_schema(signature)
            self.assertEqual(len(signature["tables"]), 27)
            self.assertTrue(signature["transaction_read_only"])

            async with target_engine.begin() as connection:
                await connection.execute(text("DROP INDEX public.idx_definition_name_trgm"))
                await connection.execute(text("CREATE INDEX idx_definition_name_trgm ON public.definition (name)"))
            with self.assertRaises(RuntimeError):
                await initialize_schema(target_engine)
        finally:
            if target_engine is not None:
                await target_engine.dispose()
            if created:
                if not re.fullmatch(r"infopedia_schema_contract_[0-9a-f]{12}", database_name):
                    raise AssertionError("refusing to clean up an unexpected database name")
                async with admin_engine.connect() as connection:
                    await connection.execute(
                        text(
                            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                            "WHERE datname = :database_name AND pid <> pg_backend_pid()",
                        ),
                        {"database_name": database_name},
                    )
                    await connection.execute(text(f'DROP DATABASE "{database_name}"'))
            await admin_engine.dispose()


if __name__ == "__main__":
    unittest.main()
