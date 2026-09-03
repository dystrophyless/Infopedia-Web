from __future__ import annotations

# ruff: noqa: PT009, S603
import inspect
import json
import os
import subprocess
import sys
import unittest
from pathlib import Path

import src.models  # noqa: F401 - register SQLAlchemy relationships
from scripts import benchmark_search_terms
from scripts.benchmark_search_terms import (
    _compiled,
    _reference_page_sql,
    _table_copy_scale,
)
from scripts.verify_search_terms_postgres import _database_name, _parse_unittest_summary
from src.search.term_filters import TermSearchFilters
from src.terms.repository import build_search_terms_statements

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "benchmark_search_terms.py"


class SearchTermsBenchmarkHarnessTests(unittest.TestCase):
    def test_benchmark_schema_copies_definition_source_names_and_index(self):
        source = inspect.getsource(benchmark_search_terms._create_schema)

        self.assertIn("name varchar(255) NOT NULL", source)
        self.assertIn("d.name", source)
        self.assertIn("bench_definition_name_trgm", source)
        self.assertNotIn("bench_term_name_trgm", source)

    def test_representative_name_comes_from_definition_name(self):
        source = inspect.getsource(benchmark_search_terms._representative_filters)

        self.assertIn("min(d.name)", source)
        self.assertNotIn("min(t.name)", source)

    def test_reference_sql_matches_definition_name(self):
        reference_sql = _reference_page_sql(mode="prefix")

        self.assertIn("d.name ILIKE", reference_sql)
        self.assertNotIn("t.name ILIKE", reference_sql)
        self.assertIn("GROUP BY d.term_id", reference_sql)

    def test_compose_verifier_uses_strict_disposable_database_name(self):
        self.assertEqual(
            _database_name("20260810T120102", "abc12345"),
            "infopedia_search_terms_test_20260810T120102_abc12345",
        )

    def test_compose_verifier_parses_test_and_skip_counts(self):
        self.assertEqual(_parse_unittest_summary("Ran 6 tests in 1.2s\nOK\n"), (6, 0))
        self.assertEqual(
            _parse_unittest_summary("Ran 6 tests in 1.2s\nOK (skipped=2)\n"),
            (6, 2),
        )

    def test_10x_fixture_scales_facts_without_changing_filter_dimensions(self):
        for table in ("book", "chapter", "topic_code", "topic", "topic_mapping"):
            with self.subTest(table=table):
                self.assertEqual(_table_copy_scale(table, 10), 1)
        self.assertEqual(_table_copy_scale("term", 10), 10)
        self.assertEqual(_table_copy_scale("definition", 10), 10)

    def test_literalized_prefix_statement_keeps_one_character_escape(self):
        filters = TermSearchFilters(
            query="prefix",
            grades=(),
            book_ids=(),
            chapter_ids=(),
            ent_only=False,
        )
        statement = build_search_terms_statements(
            filters=filters,
            mode="prefix",
            skip=0,
            limit=20,
            page_term_ids=[],
        ).page

        self.assertIn("ESCAPE E'\\\\'", _compiled(statement))

    def test_missing_test_database_url_is_machine_readable_not_run(self):
        environment = os.environ.copy()
        environment.pop("TEST_DATABASE_URL", None)

        completed = subprocess.run(
            [sys.executable, str(SCRIPT)],
            cwd=ROOT,
            env=environment,
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )

        self.assertEqual(completed.returncode, 3, completed.stderr)
        payload = json.loads(completed.stdout)
        self.assertEqual(payload["status"], "NOT_RUN")
        self.assertEqual(payload["reason"], "TEST_DATABASE_URL is not set")
        self.assertEqual(payload["runs"], 5)
        self.assertEqual(payload["warmups"], 1)


if __name__ == "__main__":
    unittest.main()
