# ruff: noqa: PT009, PT027
from __future__ import annotations

import asyncio
import os
import re
import sys
import unittest
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import src.models  # noqa: F401 - register SQLAlchemy relationships
from src.search.term_filters import TermSearchFilters
from src.terms.repository import (
    SearchTermsRepositoryInvariantError,
    build_search_terms_statements,
    search_filtered_terms,
)


def filters(
    *,
    query: str = "",
    grades: tuple[int, ...] = (),
    book_ids: tuple[int, ...] = (),
    chapter_ids: tuple[int, ...] = (),
    ent_only: bool = False,
) -> TermSearchFilters:
    return TermSearchFilters(
        query=query,
        grades=grades,
        book_ids=book_ids,
        chapter_ids=chapter_ids,
        ent_only=ent_only,
    )


def compiled(statement) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        ),
    )


class SearchTermsStatementTests(unittest.TestCase):
    def test_count_page_and_hydration_share_definition_qualification_shape(self):
        statements = build_search_terms_statements(
            filters=filters(grades=(10,), book_ids=(2,), chapter_ids=(3,), ent_only=True),
            mode="all_filtered",
            skip=20,
            limit=10,
            page_term_ids=[7, 8],
        )
        count_sql = compiled(statements.count)
        page_sql = compiled(statements.page)
        hydration_sql = compiled(statements.hydration)

        for sql in (count_sql, page_sql, hydration_sql):
            normalized = sql.upper()
            self.assertIn("TOPIC.BOOK_ID IN (2)", normalized)
            self.assertIn("BOOK.GRADE IN (10)", normalized)
            self.assertIn("EXISTS (SELECT 1", normalized)
            self.assertIn("TOPIC_CODE.CHAPTER_ID IN (3)", normalized)
            self.assertIn("TOPIC_CODE.CHAPTER_ID IS NOT NULL", normalized)

        self.assertIn("COUNT(DISTINCT(DEFINITION.TERM_ID))", re.sub(r"\s+", "", count_sql.upper()))
        self.assertIn("GROUP BY definition.term_id", page_sql)
        self.assertIn("ORDER BY min(definition.id), definition.term_id", page_sql)
        self.assertIn("OFFSET 20", page_sql)
        self.assertIn("LIMIT 10", page_sql)
        self.assertIn("term.id IN (7, 8)", hydration_sql)
        self.assertNotIn("ORDER BY term.id", hydration_sql)

    def test_chapter_mapping_is_correlated_exists_not_an_outer_join(self):
        statements = build_search_terms_statements(
            filters=filters(chapter_ids=(4,)),
            mode="all_filtered",
            skip=0,
            limit=20,
            page_term_ids=[1],
        )
        page_sql = compiled(statements.page).lower()
        before_exists, exists_sql = page_sql.split("exists", maxsplit=1)

        self.assertNotIn("topic_mapping", before_exists)
        self.assertIn("topic_mapping join topic_code", exists_sql)

    def test_name_predicate_targets_definition_name(self):
        statements = build_search_terms_statements(
            filters=filters(query="ЖЖҚ", chapter_ids=(1,)),
            mode="prefix",
            skip=0,
            limit=20,
            page_term_ids=[],
        )
        prefix_sql = compiled(statements.page).lower()

        self.assertIn("definition.name ilike", prefix_sql)
        self.assertNotIn("term.name ilike", prefix_sql)


class SearchTermsPostgresTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        database_url = os.environ.get("TEST_DATABASE_URL", "")
        if not database_url:
            self.skipTest("NOT RUN: set TEST_DATABASE_URL for PostgreSQL search repository verification")
        if not database_url.startswith("postgresql+psycopg"):
            self.fail("PostgreSQL search repository gate requires postgresql+psycopg TEST_DATABASE_URL")

        self.schema = f"search_terms_{uuid4().hex}"
        self.engine = create_async_engine(database_url, pool_size=2, max_overflow=0)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)
        try:
            async with self.engine.begin() as connection:
                extension = await connection.scalar(text("SELECT to_regprocedure('similarity(text,text)')"))
                if extension is None:
                    self.skipTest("NOT RUN: TEST_DATABASE_URL does not provide pg_trgm")
                quoted = '"' + self.schema.replace('"', '""') + '"'
                await connection.execute(text(f"CREATE SCHEMA {quoted}"))
                await connection.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
                for ddl in (
                    "CREATE TABLE book (id integer PRIMARY KEY, publisher varchar(255) NOT NULL, grade integer NOT NULL)",
                    "CREATE TABLE chapter (id integer PRIMARY KEY, code varchar(128) NOT NULL)",
                    "CREATE TABLE topic_code (id integer PRIMARY KEY, name varchar(512) NOT NULL, chapter_id integer REFERENCES chapter(id))",
                    "CREATE TABLE topic (id integer PRIMARY KEY, name varchar(255) NOT NULL, page_start integer NOT NULL, page_end integer NOT NULL, book_id integer NOT NULL REFERENCES book(id))",
                    "CREATE TABLE topic_mapping (topic_code_id integer NOT NULL REFERENCES topic_code(id), topic_id integer NOT NULL REFERENCES topic(id), PRIMARY KEY (topic_code_id, topic_id))",
                    "CREATE TABLE term (id integer PRIMARY KEY, name varchar(255) NOT NULL UNIQUE)",
                    "CREATE TABLE definition (id integer PRIMARY KEY, term_id integer NOT NULL REFERENCES term(id), name varchar(255) NOT NULL, topic_id integer NOT NULL REFERENCES topic(id), text text NOT NULL, page integer NOT NULL)",
                ):
                    await connection.execute(text(ddl))
                await self._insert_fixture(connection)
        except unittest.SkipTest:
            await self.engine.dispose()
            raise

    async def _insert_fixture(self, connection):
        statements = (
            "INSERT INTO book VALUES (1, 'Selected', 10), (2, 'Other', 11), (3, 'Selected grade 11', 11)",
            "INSERT INTO chapter VALUES (1, 'selected'), (2, 'other')",
            "INSERT INTO topic_code VALUES (1, 'selected-a', 1), (2, 'selected-b', 1), (3, 'other', 2), (4, 'unmapped', NULL)",
            "INSERT INTO topic VALUES (1, 'Qualifying', 1, 20, 1), (2, 'Nonqualifying', 21, 40, 2), (3, 'Selected grade 11', 41, 60, 3), (4, 'No ENT', 61, 80, 1)",
            "INSERT INTO topic_mapping VALUES (1, 1), (2, 1), (3, 2), (4, 4)",
            "INSERT INTO term VALUES (1, 'Жедел жад'), (2, 'Басқа термин'), (3, 'Канонический один'), (4, 'Канонический два'), (5, 'Counterexample')",
            (
                "INSERT INTO definition (id, term_id, name, topic_id, text, page) VALUES "
                "(1, 1, 'RAM', 1, 'ram definition', 2), "
                "(2, 1, 'ЖЖҚ', 1, 'zhzhq definition', 3), "
                "(3, 1, 'Жедел жады (ЖЖҚ немесе RAM)', 1, 'combined definition', 4), "
                "(4, 2, 'Басқа термин', 1, 'other definition', 5), "
                "(5, 3, 'Alpha', 1, 'alpha definition', 6), "
                "(6, 4, 'Alphabet', 1, 'alphabet definition', 7), "
                "(7, 5, 'Beta Alpha', 1, 'contains definition', 8), "
                "(8, 5, 'Selected grade 11', 3, 'selected grade wrong book', 9)"
            ),
        )
        for statement in statements:
            await connection.execute(text(statement))

    async def asyncTearDown(self):
        if not hasattr(self, "engine"):
            return
        try:
            quoted = '"' + self.schema.replace('"', '""') + '"'
            async with self.engine.begin() as connection:
                await connection.execute(text(f"DROP SCHEMA IF EXISTS {quoted} CASCADE"))
        finally:
            await self.engine.dispose()

    async def _search(self, **kwargs):
        quoted = '"' + self.schema.replace('"', '""') + '"'
        async with self.sessions() as session:
            await session.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
            return await search_filtered_terms(session, filters=filters(**kwargs), skip=0, limit=20)

    async def test_same_definition_semantics_and_qualifying_hydration(self):
        page = await self._search(book_ids=(1,), grades=(10,), chapter_ids=(1,), ent_only=True)

        self.assertEqual(page.total, 5)
        self.assertEqual([term.id for term in page.terms], [1, 2, 3, 4, 5])
        alpha = page.terms[0]
        self.assertEqual([definition.id for definition in alpha.definitions], [1, 2, 3])
        self.assertEqual(alpha.definitions[0].name, "RAM")
        self.assertEqual(alpha.definitions[0].text, "ram definition")
        self.assertEqual(alpha.definitions[0].topic.book.publisher, "Selected")
        self.assertEqual(alpha.definitions[0].topic.book.grade, 10)

        counterexample = await self._search(book_ids=(1,), grades=(11,))
        self.assertEqual(counterexample.total, 0)
        self.assertEqual(counterexample.terms, [])

    async def test_total_distinct_and_page_boundaries_are_stable(self):
        quoted = '"' + self.schema.replace('"', '""') + '"'
        async with self.sessions() as session:
            await session.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
            first = await search_filtered_terms(session, filters=filters(chapter_ids=(1,)), skip=0, limit=2)
            second = await search_filtered_terms(session, filters=filters(chapter_ids=(1,)), skip=2, limit=2)

        self.assertEqual(first.total, 5)
        self.assertEqual(second.total, 5)
        self.assertEqual([term.id for term in first.terms], [1, 2])
        self.assertEqual([term.id for term in second.terms], [3, 4])
        self.assertTrue({term.id for term in first.terms}.isdisjoint(term.id for term in second.terms))

    async def test_prefix_contains_similarity_and_empty_query_modes(self):
        empty = await self._search(query="", chapter_ids=(1,))
        prefix = await self._search(query="Alph", chapter_ids=(1,))
        contains = await self._search(query="pha", chapter_ids=(1,))
        similarity = await self._search(query="Alphx", chapter_ids=(1,))

        self.assertEqual(empty.mode, "all_filtered")
        self.assertEqual([term.name for term in prefix.terms], ["Канонический один", "Канонический два"])
        self.assertEqual(prefix.mode, "prefix")
        self.assertEqual(
            [term.name for term in contains.terms],
            ["Канонический один", "Канонический два", "Counterexample"],
        )
        self.assertEqual(contains.mode, "contains")
        self.assertEqual(similarity.mode, "similarity")
        self.assertIn("Канонический один", [term.name for term in similarity.terms])

    async def test_source_name_search_returns_one_canonical_term_and_only_matching_definitions(self):
        page = await self._search(query="ЖЖҚ", chapter_ids=(1,))

        self.assertEqual(page.total, 1)
        self.assertEqual([term.name for term in page.terms], ["Жедел жад"])
        self.assertTrue(page.terms[0].definitions)
        self.assertEqual([definition.id for definition in page.terms[0].definitions], [2])
        self.assertTrue(all("ЖЖҚ" in definition.name for definition in page.terms[0].definitions))

    async def test_multiple_ram_source_variants_do_not_duplicate_canonical_term(self):
        page = await self._search(query="RAM", chapter_ids=(1,))

        self.assertEqual([term.name for term in page.terms].count("Жедел жад"), 1)

    async def test_similarity_ranking_uses_source_names_not_canonical_names(self):
        page = await self._search(query="Alphx", chapter_ids=(1,))

        self.assertEqual(page.mode, "similarity")
        self.assertEqual(page.terms[0].name, "Канонический один")
        self.assertEqual(page.terms[0].definitions[0].name, "Alpha")

    async def test_missing_hydration_rows_raise_invariant_failure(self):
        quoted = '"' + self.schema.replace('"', '""') + '"'
        async with self.sessions() as session:
            await session.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
            with (
                patch("src.terms.repository._hydrate_search_terms", return_value=[]),
                self.assertRaises(SearchTermsRepositoryInvariantError),
            ):
                await search_filtered_terms(session, filters=filters(chapter_ids=(1,)), skip=0, limit=2)


if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


if __name__ == "__main__":
    unittest.main()
