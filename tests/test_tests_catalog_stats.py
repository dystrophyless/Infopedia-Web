# ruff: noqa: PT009, PT027
from __future__ import annotations

import unittest
from datetime import UTC, datetime

from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import src.models  # noqa: F401
from src.database import Base
from src.migrations.tests_migration import _migrate_test_tables
from src.tests.catalog_stats import (
    canonical_catalog_fingerprint,
    publish_test_catalog_generation,
)
from src.tests.models import (
    TestCatalogGeneration,
    TestCatalogStat,
    TestCatalogState,
    TestQuestion,
)
from src.topics.models import Book, Chapter, Topic, TopicCode, TopicMapping


class CatalogStatsTests(unittest.TestCase):
    def test_fingerprint_is_canonical_and_order_independent(self):
        rows_a = [
            ("q-2", True, 2, (3, 1)),
            ("q-1", True, 1, (1,)),
        ]
        rows_b = list(reversed(rows_a))
        assert canonical_catalog_fingerprint(rows_a) == canonical_catalog_fingerprint(rows_b)

    def test_fingerprint_includes_active_topic_and_reachable_chapters(self):
        base = canonical_catalog_fingerprint([("q-1", True, 1, (1,))])
        changed = canonical_catalog_fingerprint([("q-1", False, 1, (1,))])
        assert base != changed


class _SyncAsyncSession:
    def __init__(self, session: Session, engine):
        self.sync = session
        self.engine = engine
        self.flush_calls = 0
        self.commit_calls = 0
        self.fail_on_flush = None

    def get_bind(self):
        return self.engine

    async def execute(self, statement, params=None):
        return self.sync.execute(statement, params or {})

    async def get(self, model, identity):
        return self.sync.get(model, identity)

    def add(self, value):
        self.sync.add(value)

    def add_all(self, values):
        self.sync.add_all(list(values))

    async def flush(self):
        self.flush_calls += 1
        if self.fail_on_flush is not None and self.flush_calls == self.fail_on_flush:
            raise RuntimeError("injected publication failure")
        self.sync.flush()

    async def commit(self):
        self.commit_calls += 1
        self.sync.commit()


def _catalog_db():
    engine = create_engine("sqlite:///:memory:")
    tables = [
        Chapter.__table__,
        Book.__table__,
        Topic.__table__,
        TopicCode.__table__,
        TopicMapping.__table__,
        TestQuestion.__table__,
        TestCatalogGeneration.__table__,
        TestCatalogState.__table__,
        TestCatalogStat.__table__,
    ]
    Base.metadata.create_all(engine, tables=tables)
    session = Session(engine)
    session.add_all([Chapter(id=1, code="c1"), Chapter(id=2, code="c2")])
    session.add_all([
        Book(id=1, publisher="P", grade=7),
        Topic(id=10, name="mapped-both", page_start=1, page_end=1, book_id=1),
        Topic(id=11, name="mapped-one", page_start=1, page_end=1, book_id=1),
        Topic(id=12, name="unmapped", page_start=1, page_end=1, book_id=1),
        TopicCode(id=100, name="1.1", chapter_id=1),
        TopicCode(id=101, name="1.2", chapter_id=2),
    ])
    session.add_all([
        TopicMapping(topic_id=10, topic_code_id=100),
        TopicMapping(topic_id=10, topic_code_id=101),
        TopicMapping(topic_id=11, topic_code_id=100),
    ])
    session.add_all([
        TestQuestion(id=1, source_key="q1", topic_id=10, prompt="q1", active=True, created_at=datetime.now(UTC)),
        TestQuestion(id=2, source_key="q2", topic_id=11, prompt="q2", active=True, created_at=datetime.now(UTC)),
        TestQuestion(id=3, source_key="q3", topic_id=10, prompt="q3", active=False, created_at=datetime.now(UTC)),
        TestQuestion(id=4, source_key="q4", topic_id=12, prompt="q4", active=True, created_at=datetime.now(UTC)),
    ])
    session.commit()
    return engine, session


class CatalogStatsDatabaseTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine, self.session = _catalog_db()
        self.async_session = _SyncAsyncSession(self.session, self.engine)

    async def asyncTearDown(self):
        self.session.close()
        self.engine.dispose()

    async def test_publisher_counts_distinct_reachable_questions_and_pointer(self):
        publication = await publish_test_catalog_generation(self.async_session)

        self.assertEqual(publication.active_question_count, 2)
        self.assertEqual(publication.chapter_counts, {1: 2, 2: 1})
        self.assertEqual(self.async_session.flush_calls, 2)
        self.assertEqual(self.async_session.commit_calls, 0)
        self.assertEqual(self.session.query(TestCatalogGeneration).count(), 1)
        self.assertEqual(self.session.query(TestCatalogState).one().current_generation_id, publication.generation_id)
        self.assertFalse(self.session.query(TestCatalogStat).filter_by(chapter_id=None).count() > 1)

    async def test_same_fingerprint_is_idempotent_and_changed_generation_is_retained(self):
        first = await publish_test_catalog_generation(self.async_session)
        self.session.commit()
        again = await publish_test_catalog_generation(self.async_session)
        self.assertFalse(again.changed)
        self.assertEqual(again.generation_id, first.generation_id)

        self.session.get(TestQuestion, 2).active = False
        changed = await publish_test_catalog_generation(self.async_session)
        self.session.commit()
        self.assertTrue(changed.changed)
        self.assertNotEqual(changed.generation_id, first.generation_id)
        self.assertEqual(self.session.query(TestCatalogGeneration).count(), 2)
        self.assertEqual(self.session.query(TestCatalogState).one().current_generation_id, changed.generation_id)

    async def test_publisher_does_not_commit_and_rollback_preserves_old_pointer(self):
        first = await publish_test_catalog_generation(self.async_session)
        self.session.commit()
        self.session.get(TestQuestion, 2).active = False
        self.async_session.flush_calls = 0
        self.async_session.fail_on_flush = 2
        with self.assertRaisesRegex(RuntimeError, "injected publication failure"):
            await publish_test_catalog_generation(self.async_session)
        self.session.rollback()
        state = self.session.query(TestCatalogState).one()
        self.assertEqual(state.current_generation_id, first.generation_id)
        self.assertEqual(self.session.query(TestCatalogGeneration).count(), 1)

    async def test_partial_unique_indexes_reject_duplicate_total_and_chapter_rows(self):
        first = await publish_test_catalog_generation(self.async_session)
        self.session.commit()
        self.session.add(TestCatalogStat(generation_id=first.generation_id, chapter_id=None, active_question_count=2))
        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_migration_creates_catalog_tables_and_is_idempotent(self):
        engine = create_engine("sqlite:///:memory:")
        try:
            Base.metadata.create_all(
                engine,
                tables=[
                    Chapter.__table__,
                    Book.__table__,
                    Topic.__table__,
                    TopicCode.__table__,
                    TopicMapping.__table__,
                ],
            )
            with engine.begin() as connection:
                _migrate_test_tables(connection)
            first_tables = set(inspect(engine).get_table_names())
            with engine.begin() as connection:
                _migrate_test_tables(connection)
            second_tables = set(inspect(engine).get_table_names())
            self.assertTrue({
                "test_catalog_generation",
                "test_catalog_state",
                "test_catalog_stat",
            }.issubset(first_tables))
            self.assertEqual(first_tables, second_tables)
            index_names = {index["name"] for index in inspect(engine).get_indexes("test_catalog_stat")}
            self.assertIn("uq_test_catalog_stat_generation_total", index_names)
            self.assertIn("uq_test_catalog_stat_generation_chapter", index_names)
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
