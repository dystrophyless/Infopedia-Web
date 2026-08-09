# ruff: noqa: PT009, PT027
from __future__ import annotations

import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy import ForeignKeyConstraint, create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

import src.models  # noqa: F401
from src import main, prepare_app
from src.config import Settings
from src.database import Base
from src.migrations.tests_migration import (
    _check_expression_matches,
    _migrate_test_tables,
    postgresql_legacy_catalog_constraint_statements,
    postgresql_legacy_catalog_statements,
    postgresql_legacy_question_statements,
)
from src.tests.models import TestCatalogStat, TestCatalogState


class TestsMigrationTests(unittest.TestCase):
    def test_fresh_test_question_schema_maps_only_nullable_topic(self):
        table = Base.metadata.tables["test_question"]

        self.assertIn("topic_id", table.columns)
        self.assertTrue(table.columns["topic_id"].nullable)
        self.assertNotIn("chapter_id", table.columns)
        foreign_keys = {
            (constraint.columns[0].name, next(iter(constraint.elements)).target_fullname)
            for constraint in table.constraints
            if isinstance(constraint, ForeignKeyConstraint)
        }
        self.assertIn(("topic_id", "topic.id"), foreign_keys)

    def test_catalog_pointer_generation_and_stat_constraints_are_declared(self):
        state_constraints = {constraint.name for constraint in TestCatalogState.__table__.constraints}
        stat_indexes = {index.name for index in TestCatalogStat.__table__.indexes}

        self.assertIn("ck_test_catalog_state_singleton", state_constraints)
        self.assertIn("uq_test_catalog_stat_generation_total", stat_indexes)
        self.assertIn("uq_test_catalog_stat_generation_chapter", stat_indexes)
        self.assertIn("ix_test_catalog_stat_generation", stat_indexes)

    def test_first_rollout_keeps_legacy_chapter_physical_and_makes_it_nullable(self):
        statements = postgresql_legacy_question_statements({"id", "chapter_id", "source_key"})
        sql = "\n".join(statements)

        self.assertIn("ADD COLUMN topic_id", sql)
        self.assertIn("ALTER COLUMN chapter_id DROP NOT NULL", sql)
        self.assertNotIn("DROP COLUMN chapter_id", sql)
        self.assertIn("FOREIGN KEY (topic_id) REFERENCES topic(id)", sql)

    def test_existing_old_catalog_stat_renames_question_count_without_data_loss(self):
        statements = postgresql_legacy_catalog_statements({"id", "generation_id", "chapter_id", "question_count"})
        sql = "\n".join(statements).lower()

        self.assertIn("rename column question_count to active_question_count", sql)
        self.assertIn("if not exists", sql)
        self.assertNotIn("drop column question_count", sql)

    def test_catalog_stat_upgrade_adds_missing_active_count_idempotently(self):
        statements = postgresql_legacy_catalog_statements({"id", "generation_id", "chapter_id"})
        sql = "\n".join(statements).lower()

        self.assertIn("add column active_question_count", sql)
        self.assertIn("default 0", sql)
        self.assertIn("if not exists", sql)

    def test_postgresql_partial_catalog_schema_restores_constraints_and_indexes(self):
        statements = postgresql_legacy_catalog_constraint_statements(set(), set())
        sql = "\n".join(statements).lower()

        self.assertIn("ck_test_catalog_stat_nonnegative", sql)
        self.assertIn("fk_test_catalog_stat_generation", sql)
        self.assertIn("fk_test_catalog_stat_chapter", sql)
        self.assertIn("uq_test_catalog_stat_generation_total", sql)
        self.assertIn("uq_test_catalog_stat_generation_chapter", sql)

    def test_postgresql_generated_fk_names_are_recognized_semantically(self):
        existing_constraints = [
            {"name": "test_catalog_stat_active_question_count_check", "sqltext": "active_question_count >= 0"},
            {"name": "test_catalog_state_id_check", "sqltext": "id = 1"},
        ]
        existing_foreign_keys = [
            {
                "name": "test_catalog_stat_generation_id_fkey",
                "constrained_columns": ["generation_id"],
                "referred_table": "test_catalog_generation",
                "referred_columns": ["id"],
                "options": {"ondelete": "CASCADE"},
            },
            {
                "name": "test_catalog_stat_chapter_id_fkey",
                "constrained_columns": ["chapter_id"],
                "referred_table": "chapter",
                "referred_columns": ["id"],
                "options": {"ondelete": "CASCADE"},
            },
            {
                "name": "test_catalog_state_generation_id_fkey",
                "constrained_columns": ["current_generation_id"],
                "referred_table": "test_catalog_generation",
                "referred_columns": ["id"],
                "options": {"ondelete": "SET NULL"},
            },
        ]
        sql = "\n".join(
            postgresql_legacy_catalog_constraint_statements(existing_constraints, existing_foreign_keys),
        ).lower()
        self.assertNotIn("add constraint fk_test_catalog_stat_generation", sql)
        self.assertNotIn("add constraint fk_test_catalog_stat_chapter", sql)
        self.assertNotIn("add constraint fk_test_catalog_state_generation", sql)
        self.assertNotIn("add constraint ck_test_catalog_stat_nonnegative", sql)
        self.assertNotIn("add constraint ck_test_catalog_state_singleton", sql)
        self.assertIn("create unique index", sql)

    def test_postgresql_custom_fk_with_wrong_delete_action_is_repaired(self):
        existing_foreign_keys = [
            {
                "name": "legacy_generation_link",
                "constrained_columns": ["generation_id"],
                "referred_table": "test_catalog_generation",
                "referred_columns": ["id"],
                "options": {"ondelete": "SET NULL"},
            },
            {
                "name": "legacy_chapter_link",
                "constrained_columns": ["chapter_id"],
                "referred_table": "chapter",
                "referred_columns": ["id"],
                "options": {"ondelete": "CASCADE"},
            },
            {
                "name": "legacy_state_generation_link",
                "constrained_columns": ["current_generation_id"],
                "referred_table": "test_catalog_generation",
                "referred_columns": ["id"],
                "options": {"ondelete": "SET NULL"},
            },
        ]
        sql = "\n".join(postgresql_legacy_catalog_constraint_statements([], existing_foreign_keys)).lower()
        self.assertIn("add constraint fk_test_catalog_stat_generation", sql)
        self.assertNotIn("add constraint fk_test_catalog_stat_chapter", sql)
        self.assertNotIn("add constraint fk_test_catalog_state_generation", sql)

    def test_postgresql_expected_fk_name_with_wrong_semantics_is_replaced(self):
        existing_foreign_keys = [
            {
                "name": "fk_test_catalog_stat_generation",
                "constrained_columns": ["generation_id"],
                "referred_table": "legacy_generation",
                "referred_columns": ["id"],
                "options": {"ondelete": "SET NULL"},
            },
        ]
        sql = "\n".join(postgresql_legacy_catalog_constraint_statements([], existing_foreign_keys)).lower()
        self.assertIn("drop constraint fk_test_catalog_stat_generation", sql)
        self.assertIn("add constraint fk_test_catalog_stat_generation", sql)

    def test_postgresql_expected_check_name_with_wrong_expression_is_replaced(self):
        existing_constraints = [
            {"name": "ck_test_catalog_stat_nonnegative", "sqltext": "active_question_count > 0"},
            {"name": "ck_test_catalog_state_singleton", "sqltext": "id > 0"},
        ]
        sql = "\n".join(postgresql_legacy_catalog_constraint_statements(existing_constraints, [])).lower()
        self.assertIn("drop constraint ck_test_catalog_stat_nonnegative", sql)
        self.assertIn("drop constraint ck_test_catalog_state_singleton", sql)

    def test_postgresql_expected_correct_name_is_idempotent_noop(self):
        existing_constraints = [
            {"name": "ck_test_catalog_stat_nonnegative", "sqltext": "active_question_count >= 0"},
        ]
        existing_foreign_keys = [
            {
                "name": "fk_test_catalog_stat_generation",
                "constrained_columns": ["generation_id"],
                "referred_table": "test_catalog_generation",
                "referred_columns": ["id"],
                "options": {"ondelete": "CASCADE"},
            },
        ]
        sql = "\n".join(postgresql_legacy_catalog_constraint_statements(existing_constraints, existing_foreign_keys)).lower()
        self.assertNotIn("drop constraint ck_test_catalog_stat_nonnegative", sql)
        self.assertNotIn("add constraint ck_test_catalog_stat_nonnegative", sql)
        self.assertNotIn("drop constraint fk_test_catalog_stat_generation", sql)
        self.assertNotIn("add constraint fk_test_catalog_stat_generation", sql)

    def test_check_semantics_accept_only_exact_normalized_predicates(self):
        self.assertTrue(_check_expression_matches('((("active_question_count" :: INTEGER >= 0)))', "active_question_count >= 0"))
        self.assertTrue(_check_expression_matches("CAST(active_question_count AS INTEGER) >= 0", "active_question_count >= 0"))
        self.assertTrue(_check_expression_matches('CAST("active_question_count" AS INTEGER) >= 0', "active_question_count >= 0"))
        self.assertTrue(_check_expression_matches("((id = 1))", "id = 1"))
        self.assertTrue(_check_expression_matches('CAST("id" AS INTEGER) = 1', "id = 1"))
        for expression in (
            "active_question_count >= -1",
            "active_question_count >= 0 OR id = 0",
            "active_question_count >= 0 AND id = 1",
            "question_count >= 0",
            "id IN (1, 2)",
        ):
            with self.subTest(expression=expression):
                self.assertFalse(_check_expression_matches(expression, "active_question_count >= 0"))

    def test_tests_catalog_reads_are_off_by_default(self):
        self.assertFalse(Settings().TEST_CATALOG_STATS_READ_ENABLED)

    def test_sqlite_existing_catalog_stat_schema_is_backfilled_without_losing_counts(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE test_catalog_generation (id INTEGER PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE test_catalog_state (id INTEGER PRIMARY KEY, current_generation_id INTEGER)"))
            connection.execute(
                text(
                    "CREATE TABLE test_catalog_stat ("
                    "id INTEGER PRIMARY KEY, generation_id INTEGER NOT NULL, "
                    "chapter_id INTEGER, question_count INTEGER NOT NULL)",
                ),
            )
            connection.execute(text("INSERT INTO test_catalog_generation (id) VALUES (1)"))
            connection.execute(text("INSERT INTO test_catalog_stat (id, generation_id, chapter_id, question_count) VALUES (1, 1, NULL, 17)"))

            _migrate_test_tables(connection)

            columns = {column["name"] for column in inspect(connection).get_columns("test_catalog_stat")}
            self.assertIn("active_question_count", columns)
            row = connection.execute(text("SELECT active_question_count FROM test_catalog_stat WHERE id = 1")).scalar_one()
            self.assertEqual(row, 17)
        engine.dispose()

    def test_sqlite_partial_catalog_schema_enforces_check_and_foreign_keys_after_two_runs(self):
        engine = create_engine("sqlite:///:memory:")
        with engine.begin() as connection:
            connection.execute(text("PRAGMA foreign_keys=ON"))
            connection.execute(text("CREATE TABLE chapter (id INTEGER PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE test_catalog_generation (id INTEGER PRIMARY KEY)"))
            connection.execute(text("CREATE TABLE test_catalog_state (id INTEGER PRIMARY KEY, current_generation_id INTEGER)"))
            connection.execute(
                text(
                    "CREATE TABLE test_catalog_stat ("
                    "id INTEGER PRIMARY KEY, generation_id INTEGER NOT NULL, "
                    "chapter_id INTEGER, active_question_count INTEGER NOT NULL)",
                ),
            )
            connection.execute(text("INSERT INTO test_catalog_generation (id) VALUES (1)"))
            _migrate_test_tables(connection)
            _migrate_test_tables(connection)
            with self.assertRaises(IntegrityError):
                connection.execute(
                    text(
                        "INSERT INTO test_catalog_stat (id, generation_id, chapter_id, active_question_count) "
                        "VALUES (99, 1, NULL, -1)",
                    ),
                )
            with self.assertRaises(IntegrityError):
                connection.execute(
                    text(
                        "INSERT INTO test_catalog_stat (id, generation_id, chapter_id, active_question_count) "
                        "VALUES (100, 999, NULL, 1)",
                    ),
                )
        engine.dispose()


class _SessionContext:
    def __init__(self, events):
        self.events = events

    async def __aenter__(self):
        self.events.append("session-open")
        return object()

    async def __aexit__(self, *_args):
        self.events.append("session-close")


class _SessionFactory:
    def __init__(self, events):
        self.events = events

    def __call__(self):
        return _SessionContext(self.events)


class TestStartupOrdering(unittest.IsolatedAsyncioTestCase):
    async def test_runtime_startup_is_database_only(self):
        events = []

        async def mark(name):
            events.append(name)

        fake_engine = SimpleNamespace(dispose=AsyncMock(side_effect=lambda: events.append("dispose")))
        with (
            patch("src.main.async_engine", fake_engine),
            patch("src.main.ensure_user_schema_compatibility", new=lambda _engine: mark("user-schema")),
            patch("src.main.migrate_favorites_schema", new=lambda _engine: mark("favorites-migration")),
            patch("src.main.migrate_tests_schema", new=lambda _engine: mark("tests-migration")),
            patch("src.main.AsyncSessionMaker", _SessionFactory(events), create=True),
            patch("src.main.load_test_questions", new=lambda *_args: mark("catalog-load"), create=True),
        ):
            async with main.lifespan(main.app):
                events.append("yield")

        self.assertEqual(
            events,
            ["user-schema", "favorites-migration", "tests-migration", "yield", "dispose"],
        )

    async def test_prepare_loads_topics_and_mappings_before_question_seed(self):
        events = []

        async def mark(name):
            events.append(name)

        class OuterTransaction:
            async def __aenter__(self):
                events.append("outer-begin")

            async def __aexit__(self, *_args):
                events.append("outer-end")

        class FakeSession:
            def begin(self):
                return OuterTransaction()

        class SessionContext:
            async def __aenter__(self):
                events.append("session-open")
                return FakeSession()

            async def __aexit__(self, *_args):
                events.append("session-close")

        fake_engine = SimpleNamespace(
            dispose=AsyncMock(side_effect=lambda: events.append("dispose")),
        )
        with (
            patch("src.prepare_app.get_embedder", return_value=object()),
            patch("src.prepare_app.create_tables", new=lambda: mark("create-tables")),
            patch("src.prepare_app.AsyncSessionMaker", new=lambda: SessionContext()),
            patch("src.prepare_app.load_chapters_and_topic_codes_core", new=lambda *_args: mark("chapters")),
            patch("src.prepare_app.load_books_topics_and_mappings_core", new=lambda *_args: mark("topics")),
            patch("src.prepare_app.load_test_questions_core", new=lambda *_args: mark("questions")),
            patch("src.prepare_app.refresh_book_chapter_coverage_core", new=lambda *_args: mark("coverage")),
            patch("src.prepare_app.load_terms_from_json_core", new=lambda *_args: mark("terms")),
            patch("src.prepare_app.publish_test_catalog_generation", new=lambda *_args: mark("publication")),
            patch("src.prepare_app.init_similarity_extension", new=lambda *_args: mark("similarity")),
            patch("src.prepare_app.async_engine", fake_engine),
        ):
            await prepare_app.main()

        self.assertEqual(
            events,
            [
                "create-tables",
                "session-open",
                "outer-begin",
                "chapters",
                "topics",
                "questions",
                "coverage",
                "terms",
                "publication",
                "outer-end",
                "session-close",
                "similarity",
                "dispose",
            ],
        )
        self.assertLess(events.index("chapters"), events.index("topics"))
        self.assertLess(events.index("topics"), events.index("questions"))
        self.assertLess(events.index("questions"), events.index("coverage"))


if __name__ == "__main__":
    unittest.main()
