import unittest
from unittest.mock import AsyncMock

from src.analyze.projection import material_grades_from_topic_code_names
from src.analyze.repository import get_topic_material_summaries_by_chapter_ids
from src.analyze.schemas import AnalyzeChapterResult


class _RowResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class AnalyzeProjectionTests(unittest.TestCase):
    def test_material_grades_are_unique_sorted_and_bounded(self):
        self.assertEqual(
            material_grades_from_topic_code_names(
                ["11.2", "7.1", "10.1", "7.9", "12.1", "6.1", "bad", "x.1", None]
            ),
            [7, 10, 11],
        )

    def test_chapter_result_exposes_safe_aggregate(self):
        result = AnalyzeChapterResult(
            chapter_id=1,
            code="chapter-1",
            title="Chapter",
            question_count=1,
            max_score=1,
            score=1,
            percentage=100,
            topic_count=3,
            material_grades=[7, 10],
        ).model_dump()

        self.assertEqual(result["topic_count"], 3)
        self.assertEqual(result["material_grades"], [7, 10])


class AnalyzeMaterialSummaryRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_summary_does_not_return_topic_names_or_codes(self):
        session = AsyncMock()
        session.execute.return_value = _RowResult(
            [
                (10, "11.2"),
                (10, "7.1"),
                (10, "10.1"),
                (10, "10.invalid"),
                (10, "12.1"),
                (11, "not-a-code"),
            ]
        )

        result = await get_topic_material_summaries_by_chapter_ids(
            session, chapter_ids=[10, 11, 10]
        )

        self.assertEqual(
            result,
            {
                10: {"topic_count": 5, "material_grades": [7, 10, 11]},
                11: {"topic_count": 1, "material_grades": []},
            },
        )
        self.assertNotIn("name", result[10])
        self.assertNotIn("code", result[10])

    async def test_empty_chapter_ids_do_not_query(self):
        session = AsyncMock()

        self.assertEqual(
            await get_topic_material_summaries_by_chapter_ids(session, chapter_ids=[]),
            {},
        )
        session.execute.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
