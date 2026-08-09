# ruff: noqa: PT009
from __future__ import annotations

import unittest
from types import SimpleNamespace

from sqlalchemy.dialects import postgresql

import src.models  # noqa: F401
from src.tests.repository import (
    eligible_chapters,
    question_counts_by_chapter_statement,
    questions_statement,
)


class TestsRepositoryTests(unittest.TestCase):
    def test_eligibility_traverses_topic_mapping_and_deduplicates_chapters(self):
        chapter_a = SimpleNamespace(id=1, code="a")
        chapter_b = SimpleNamespace(id=2, code="b")
        question = SimpleNamespace(
            topic=SimpleNamespace(
                topic_codes=[
                    SimpleNamespace(chapter=chapter_b),
                    SimpleNamespace(chapter=chapter_a),
                    SimpleNamespace(chapter=chapter_a),
                    SimpleNamespace(chapter=None),
                ],
            ),
        )

        self.assertEqual(eligible_chapters(question), [chapter_a, chapter_b])

    def test_global_question_query_is_distinct_and_chapter_filter_uses_mapping_chain(self):
        sql = str(questions_statement().compile(dialect=postgresql.dialect()))
        chapter_sql = str(questions_statement(chapter_ids=[3]).compile(dialect=postgresql.dialect()))

        self.assertIn("SELECT DISTINCT", sql)
        self.assertIn("JOIN topic_mapping", sql)
        self.assertIn("JOIN topic_code", sql)
        self.assertIn("JOIN chapter", sql)
        self.assertNotIn("test_question.chapter_id", sql)
        self.assertIn("chapter.id IN", chapter_sql)

    def test_chapter_counts_keep_all_memberships_but_distinct_per_chapter(self):
        sql = str(question_counts_by_chapter_statement().compile(dialect=postgresql.dialect()))

        self.assertIn("count(distinct(test_question.id))", sql)
        self.assertIn("GROUP BY chapter.id", sql)


if __name__ == "__main__":
    unittest.main()
