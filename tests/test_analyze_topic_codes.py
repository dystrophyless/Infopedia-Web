import unittest
from pathlib import Path
from unittest.mock import AsyncMock

from src.analyze.repository import get_topic_codes_by_chapter_ids
from src.analyze.schemas import AnalyzeChapterResult
from src.terms.models import Definition  # noqa: F401
from src.topics.models import TopicCode, TopicCodeTranslation


class _ScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return self

    def all(self):
        return self.rows


def _topic_code(
    *,
    code_id: int,
    chapter_id: int | None,
    name: str,
    translations: list[tuple[str, str]],
) -> TopicCode:
    topic_code = TopicCode(id=code_id, chapter_id=chapter_id, name=name)
    topic_code.translations = [
        TopicCodeTranslation(locale=locale, title=title)
        for locale, title in translations
    ]
    return topic_code


class AnalyzeTopicCodeRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_localized_titles_fallback_and_stable_order(self):
        session = AsyncMock()
        session.execute.return_value = _ScalarResult(
            [
                _topic_code(
                    code_id=2,
                    chapter_id=10,
                    name="10.2",
                    translations=[
                        ("kk", "Қазақша 2"),
                        ("ru", "Русский 2"),
                    ],
                ),
                _topic_code(
                    code_id=1,
                    chapter_id=10,
                    name="10.1",
                    translations=[("kk", "Қазақша 1")],
                ),
                _topic_code(
                    code_id=3,
                    chapter_id=11,
                    name="11.1",
                    translations=[],
                ),
            ]
        )

        result = await get_topic_codes_by_chapter_ids(
            session,
            chapter_ids=[10, 11, 10],
            locale="ru",
        )

        self.assertEqual(
            result,
            {
                10: [
                    {"name": "10.1", "title": "Қазақша 1"},
                    {"name": "10.2", "title": "Русский 2"},
                ],
                11: [{"name": "11.1", "title": "11.1"}],
            },
        )

        kk_result = await get_topic_codes_by_chapter_ids(
            session,
            chapter_ids=[10],
            locale="kk",
        )
        self.assertEqual(kk_result[10][1]["title"], "Қазақша 2")
        self.assertEqual(session.execute.await_count, 2)

    async def test_empty_chapter_returns_empty_list_without_query_for_no_ids(self):
        session = AsyncMock()
        session.execute.return_value = _ScalarResult([])

        result = await get_topic_codes_by_chapter_ids(
            session,
            chapter_ids=[99],
            locale="kk",
        )
        self.assertEqual(result, {99: []})

        self.assertEqual(
            await get_topic_codes_by_chapter_ids(session, chapter_ids=[]),
            {},
        )
        self.assertEqual(session.execute.await_count, 1)


class AnalyzeTopicCodeResponseContractTests(unittest.TestCase):
    def test_chapter_result_contains_additive_topic_code_shape(self):
        result = AnalyzeChapterResult(
            chapter_id=1,
            code="chapter-1",
            title="Chapter",
            question_count=1,
            max_score=1,
            score=1,
            percentage=100,
            topic_codes=[{"name": "1.1", "title": "Локализованный заголовок"}],
        ).model_dump()

        self.assertEqual(
            result["topic_codes"],
            [{"name": "1.1", "title": "Локализованный заголовок"}],
        )

    def test_task_and_latest_assemblies_pass_topic_codes(self):
        root = Path(__file__).resolve().parents[1]
        service_source = (root / "src" / "analyze" / "service.py").read_text(
            encoding="utf-8"
        )
        router_source = (root / "src" / "analyze" / "router.py").read_text(
            encoding="utf-8"
        )

        for source in (service_source, router_source):
            self.assertIn("get_topic_codes_by_chapter_ids", source)
            self.assertIn("get_topic_material_summaries_by_chapter_ids", source)
            self.assertIn("select_free_chapter_id", source)
            self.assertIn("chapter_ids=[free_id] if free_id is not None else []", source)
            self.assertIn(
                "topic_codes_by_chapter.get(free_id, [])",
                source,
            )
            self.assertIn("if item.chapter_id == free_id", source)
            self.assertIn("else []", source)
            self.assertNotIn(
                "topic_codes_by_chapter.get(item.chapter_id, [])",
                source,
            )


if __name__ == "__main__":
    unittest.main()
