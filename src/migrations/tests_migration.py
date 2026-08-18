"""Additive compatibility migration for server-owned test attempts."""

from __future__ import annotations

import re
from collections.abc import Collection, Mapping

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine

from src.tests.models import (
    TestAttempt,
    TestAttemptAnswer,
    TestAttemptQuestion,
    TestCatalogGeneration,
    TestCatalogStat,
    TestCatalogState,
    TestQuestion,
    TestQuestionOption,
)

TEST_TABLES = (
    TestCatalogGeneration.__table__,
    TestCatalogState.__table__,
    TestCatalogStat.__table__,
    TestQuestion.__table__,
    TestQuestionOption.__table__,
    TestAttempt.__table__,
    TestAttemptQuestion.__table__,
    TestAttemptAnswer.__table__,
)


def _strip_redundant_outer_parentheses(expression: str) -> str:
    value = expression.strip()
    while value.startswith("(") and value.endswith(")"):
        depth = 0
        enclosed = True
        for index, character in enumerate(value):
            if character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
                if depth == 0 and index != len(value) - 1:
                    enclosed = False
                    break
        if not enclosed or depth != 0:
            break
        value = value[1:-1].strip()
    return value


def _normalize_check_expression(expression: object) -> str:
    value = str(expression).strip().lower()
    if value.startswith("check"):
        value = value[5:].strip()
    value = value.replace('"', "").replace("`", "")
    value = re.sub(
        r"cast\(\s*([a-z_][a-z0-9_]*)\s+as\s+(?:smallint|integer|bigint|numeric|decimal|int)\s*\)",
        r"\1",
        value,
    )
    value = re.sub(
        r"::\s*(?:smallint|integer|bigint|numeric|decimal|int)(?:\[\])?",
        "",
        value,
    )
    value = re.sub(r"\s+", "", value)
    return _strip_redundant_outer_parentheses(value)


def _check_expression_matches(expression: object, expected: str) -> bool:
    return _normalize_check_expression(expression) == _normalize_check_expression(expected)


def postgresql_legacy_question_statements(existing_columns: Collection[str]) -> list[str]:
    """Return the first-rollout compatibility DDL without dropping legacy data."""
    statements: list[str] = []
    if "topic_id" not in existing_columns:
        statements.append("ALTER TABLE test_question ADD COLUMN topic_id INTEGER")
    if "chapter_id" in existing_columns:
        statements.append("ALTER TABLE test_question ALTER COLUMN chapter_id DROP NOT NULL")
    statements.extend(
        [
            """
            DO $qbank$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_test_question_topic_id'
                ) THEN
                    ALTER TABLE test_question
                    ADD CONSTRAINT fk_test_question_topic_id
                    FOREIGN KEY (topic_id) REFERENCES topic(id) ON DELETE SET NULL;
                END IF;
            END
            $qbank$
            """,
            "CREATE INDEX IF NOT EXISTS ix_test_question_topic_active "
            "ON test_question (topic_id, active)",
        ],
    )
    return statements


def postgresql_legacy_catalog_statements(existing_columns: Collection[str]) -> list[str]:
    """
    Upgrade the first catalog-stat rollout without discarding published counts.

    Older installations used ``question_count``.  Rename it when present so
    existing values survive; otherwise add the new non-null column with a safe
    zero default.  The guarded block is idempotent and safe to rerun.
    """
    columns = {str(column) for column in existing_columns}
    if "active_question_count" in columns:
        return []
    return [
        """
        DO $catalog$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'test_catalog_stat'
                  AND column_name = 'question_count'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'test_catalog_stat'
                  AND column_name = 'active_question_count'
            ) THEN
                ALTER TABLE test_catalog_stat
                RENAME COLUMN question_count TO active_question_count;
            ELSIF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'test_catalog_stat'
                  AND column_name = 'active_question_count'
            ) THEN
                ALTER TABLE test_catalog_stat
                ADD COLUMN active_question_count INTEGER NOT NULL DEFAULT 0;
            END IF;
        END
        $catalog$
        """,
    ]


def postgresql_legacy_catalog_constraint_statements(
    existing_constraints: Collection[str | Mapping[str, object]],
    existing_foreign_keys: Collection[str | Mapping[str, object]],
) -> list[str]:
    """Restore catalog pointer/stat constraints and indexes idempotently."""
    existing_constraint_names = {
        str(item.get("name")) if isinstance(item, Mapping) else str(item)
        for item in existing_constraints
    }
    existing_fk_names = {
        str(item.get("name")) if isinstance(item, Mapping) else str(item)
        for item in existing_foreign_keys
    }
    present = existing_constraint_names | existing_fk_names

    def has_fk(source: str, referred_table: str, ondelete: str) -> bool:
        for item in existing_foreign_keys:
            if not isinstance(item, Mapping):
                continue
            source_columns = tuple(str(value) for value in item.get("constrained_columns", ()))
            referred_columns = tuple(str(value) for value in item.get("referred_columns", ()))
            options = item.get("options")
            actual_ondelete = str(options.get("ondelete")) if isinstance(options, Mapping) else "None"
            if (
                source_columns == (source,)
                and referred_columns == ("id",)
                and str(item.get("referred_table")) == referred_table
                and actual_ondelete.upper() == ondelete.upper()
            ):
                return True
        return False

    semantic_checks = {
        "ck_test_catalog_stat_nonnegative": any(
            isinstance(item, Mapping)
            and _check_expression_matches(item.get("sqltext", ""), "active_question_count >= 0")
            for item in existing_constraints
        ),
        "ck_test_catalog_state_singleton": any(
            isinstance(item, Mapping)
            and _check_expression_matches(item.get("sqltext", ""), "id = 1")
            for item in existing_constraints
        ),
        "fk_test_catalog_stat_generation": has_fk("generation_id", "test_catalog_generation", "CASCADE"),
        "fk_test_catalog_stat_chapter": has_fk("chapter_id", "chapter", "CASCADE"),
        "fk_test_catalog_state_generation": has_fk("current_generation_id", "test_catalog_generation", "SET NULL"),
    }
    statements: list[str] = []
    statements_by_name = {
        "ck_test_catalog_stat_nonnegative": """
            DO $catalog_constraint$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_test_catalog_stat_nonnegative') THEN
                    ALTER TABLE test_catalog_stat ADD CONSTRAINT ck_test_catalog_stat_nonnegative CHECK (active_question_count >= 0) NOT VALID;
                    ALTER TABLE test_catalog_stat VALIDATE CONSTRAINT ck_test_catalog_stat_nonnegative;
                END IF;
            END $catalog_constraint$
            """,
        "fk_test_catalog_stat_generation": """
            DO $catalog_constraint$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_test_catalog_stat_generation') THEN
                    ALTER TABLE test_catalog_stat ADD CONSTRAINT fk_test_catalog_stat_generation FOREIGN KEY (generation_id) REFERENCES test_catalog_generation(id) ON DELETE CASCADE NOT VALID;
                    ALTER TABLE test_catalog_stat VALIDATE CONSTRAINT fk_test_catalog_stat_generation;
                END IF;
            END $catalog_constraint$
            """,
        "fk_test_catalog_stat_chapter": """
            DO $catalog_constraint$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_test_catalog_stat_chapter') THEN
                    ALTER TABLE test_catalog_stat ADD CONSTRAINT fk_test_catalog_stat_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE NOT VALID;
                    ALTER TABLE test_catalog_stat VALIDATE CONSTRAINT fk_test_catalog_stat_chapter;
                END IF;
            END $catalog_constraint$
            """,
        "ck_test_catalog_state_singleton": """
            DO $catalog_constraint$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_test_catalog_state_singleton') THEN
                    ALTER TABLE test_catalog_state ADD CONSTRAINT ck_test_catalog_state_singleton CHECK (id = 1) NOT VALID;
                    ALTER TABLE test_catalog_state VALIDATE CONSTRAINT ck_test_catalog_state_singleton;
                END IF;
            END $catalog_constraint$
            """,
        "fk_test_catalog_state_generation": """
            DO $catalog_constraint$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_test_catalog_state_generation') THEN
                    ALTER TABLE test_catalog_state ADD CONSTRAINT fk_test_catalog_state_generation FOREIGN KEY (current_generation_id) REFERENCES test_catalog_generation(id) ON DELETE SET NULL NOT VALID;
                    ALTER TABLE test_catalog_state VALIDATE CONSTRAINT fk_test_catalog_state_generation;
                END IF;
            END $catalog_constraint$
            """,
    }
    replacement_by_name = {
        "ck_test_catalog_stat_nonnegative": """
            DO $catalog_constraint$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_test_catalog_stat_nonnegative') THEN
                    ALTER TABLE test_catalog_stat DROP CONSTRAINT ck_test_catalog_stat_nonnegative;
                END IF;
                ALTER TABLE test_catalog_stat ADD CONSTRAINT ck_test_catalog_stat_nonnegative CHECK (active_question_count >= 0) NOT VALID;
                ALTER TABLE test_catalog_stat VALIDATE CONSTRAINT ck_test_catalog_stat_nonnegative;
            END $catalog_constraint$
            """,
        "fk_test_catalog_stat_generation": """
            DO $catalog_constraint$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_test_catalog_stat_generation') THEN
                    ALTER TABLE test_catalog_stat DROP CONSTRAINT fk_test_catalog_stat_generation;
                END IF;
                ALTER TABLE test_catalog_stat ADD CONSTRAINT fk_test_catalog_stat_generation FOREIGN KEY (generation_id) REFERENCES test_catalog_generation(id) ON DELETE CASCADE NOT VALID;
                ALTER TABLE test_catalog_stat VALIDATE CONSTRAINT fk_test_catalog_stat_generation;
            END $catalog_constraint$
            """,
        "fk_test_catalog_stat_chapter": """
            DO $catalog_constraint$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_test_catalog_stat_chapter') THEN
                    ALTER TABLE test_catalog_stat DROP CONSTRAINT fk_test_catalog_stat_chapter;
                END IF;
                ALTER TABLE test_catalog_stat ADD CONSTRAINT fk_test_catalog_stat_chapter FOREIGN KEY (chapter_id) REFERENCES chapter(id) ON DELETE CASCADE NOT VALID;
                ALTER TABLE test_catalog_stat VALIDATE CONSTRAINT fk_test_catalog_stat_chapter;
            END $catalog_constraint$
            """,
        "ck_test_catalog_state_singleton": """
            DO $catalog_constraint$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_test_catalog_state_singleton') THEN
                    ALTER TABLE test_catalog_state DROP CONSTRAINT ck_test_catalog_state_singleton;
                END IF;
                ALTER TABLE test_catalog_state ADD CONSTRAINT ck_test_catalog_state_singleton CHECK (id = 1) NOT VALID;
                ALTER TABLE test_catalog_state VALIDATE CONSTRAINT ck_test_catalog_state_singleton;
            END $catalog_constraint$
            """,
        "fk_test_catalog_state_generation": """
            DO $catalog_constraint$ BEGIN
                IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_test_catalog_state_generation') THEN
                    ALTER TABLE test_catalog_state DROP CONSTRAINT fk_test_catalog_state_generation;
                END IF;
                ALTER TABLE test_catalog_state ADD CONSTRAINT fk_test_catalog_state_generation FOREIGN KEY (current_generation_id) REFERENCES test_catalog_generation(id) ON DELETE SET NULL NOT VALID;
                ALTER TABLE test_catalog_state VALIDATE CONSTRAINT fk_test_catalog_state_generation;
            END $catalog_constraint$
            """,
    }
    for name, statement in statements_by_name.items():
        if semantic_checks.get(name, False):
            continue
        if name in present:
            statements.append(replacement_by_name[name])
            continue
        statements.append(statement)
    statements.extend(
        [
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_test_catalog_stat_generation_total "
            "ON test_catalog_stat (generation_id) WHERE chapter_id IS NULL",
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_test_catalog_stat_generation_chapter "
            "ON test_catalog_stat (generation_id, chapter_id) WHERE chapter_id IS NOT NULL",
            "CREATE INDEX IF NOT EXISTS ix_test_catalog_stat_generation "
            "ON test_catalog_stat (generation_id)",
        ],
    )
    return statements


def _sqlite_catalog_stat_needs_rebuild(inspector) -> bool:
    checks = inspector.get_check_constraints(TestCatalogStat.__tablename__)
    has_check = any("active_question_count" in str(item.get("sqltext", "")) for item in checks)
    foreign_keys = inspector.get_foreign_keys(TestCatalogStat.__tablename__)
    targets = {str(item.get("referred_table")) for item in foreign_keys}
    return not has_check or not {"test_catalog_generation", "chapter"}.issubset(targets)


def _rebuild_sqlite_catalog_stat(sync_connection, inspector) -> None:
    """Rebuild a partial SQLite table to add constraints while preserving rows."""
    legacy_name = "test_catalog_stat_legacy"
    columns = {str(column["name"]) for column in inspector.get_columns(TestCatalogStat.__tablename__)}
    for index in inspector.get_indexes(TestCatalogStat.__tablename__):
        sync_connection.execute(text(f"DROP INDEX IF EXISTS {index['name']}"))
    sync_connection.execute(text(f"ALTER TABLE {TestCatalogStat.__tablename__} RENAME TO {legacy_name}"))
    TestCatalogStat.__table__.create(sync_connection, checkfirst=False)
    if "active_question_count" in columns:
        source_select = "SELECT id, generation_id, chapter_id, active_question_count FROM test_catalog_stat_legacy"
    else:
        source_select = "SELECT id, generation_id, chapter_id, question_count FROM test_catalog_stat_legacy"
    sync_connection.execute(
        text(
            "INSERT INTO test_catalog_stat (id, generation_id, chapter_id, active_question_count) "
            + source_select,
        ),
    )
    sync_connection.execute(text(f"DROP TABLE {legacy_name}"))


def _migrate_test_tables(sync_connection) -> None:  # noqa: C901, PLR0912 - compatibility branches are explicit
    inspector = inspect(sync_connection)
    stat_existed = inspector.has_table(TestCatalogStat.__tablename__)
    for table in (TestCatalogGeneration.__table__, TestCatalogState.__table__, TestCatalogStat.__table__):
        table.create(sync_connection, checkfirst=True)
    if stat_existed:
        existing_stat_columns = {
            str(column["name"])
            for column in inspector.get_columns(TestCatalogStat.__tablename__)
        }
        if sync_connection.dialect.name == "postgresql":
            for statement in postgresql_legacy_catalog_statements(existing_stat_columns):
                sync_connection.execute(text(statement))
            existing_constraints = [
                item
                for table_name in (TestCatalogStat.__tablename__, TestCatalogState.__tablename__)
                for item in inspector.get_check_constraints(table_name)
            ]
            existing_foreign_keys = [
                item
                for table_name in (TestCatalogStat.__tablename__, TestCatalogState.__tablename__)
                for item in inspector.get_foreign_keys(table_name)
            ]
            for statement in postgresql_legacy_catalog_constraint_statements(
                existing_constraints,
                existing_foreign_keys,
            ):
                sync_connection.execute(text(statement))
        elif _sqlite_catalog_stat_needs_rebuild(inspector):
            _rebuild_sqlite_catalog_stat(sync_connection, inspector)
        elif "active_question_count" not in existing_stat_columns:
            if "question_count" in existing_stat_columns:
                sync_connection.execute(
                    text(
                        "ALTER TABLE test_catalog_stat RENAME COLUMN question_count "
                        "TO active_question_count",
                    ),
                )
            else:
                sync_connection.execute(
                    text(
                        "ALTER TABLE test_catalog_stat ADD COLUMN active_question_count "
                        "INTEGER NOT NULL DEFAULT 0",
                    ),
                )
    for index in TestCatalogStat.__table__.indexes:
        index.create(sync_connection, checkfirst=True)
    if not inspector.has_table(TestQuestion.__tablename__):
        TestQuestion.__table__.create(sync_connection, checkfirst=True)
    else:
        existing_columns = {
            str(column["name"])
            for column in inspector.get_columns(TestQuestion.__tablename__)
        }
        if sync_connection.dialect.name == "postgresql":
            for statement in postgresql_legacy_question_statements(existing_columns):
                sync_connection.execute(text(statement))
        elif "topic_id" not in existing_columns:
            sync_connection.execute(
                text(
                    "ALTER TABLE test_question ADD COLUMN topic_id INTEGER "
                    "REFERENCES topic(id) ON DELETE SET NULL",
                ),
            )

    for table in TEST_TABLES[3:]:
        table.create(sync_connection, checkfirst=True)


async def migrate_tests_schema(engine: AsyncEngine) -> None:
    async with engine.begin() as connection:
        await connection.run_sync(_migrate_test_tables)
