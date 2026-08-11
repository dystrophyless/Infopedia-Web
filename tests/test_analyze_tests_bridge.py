# ruff: noqa: PT009, PT027
import unittest
from types import SimpleNamespace

import src.models  # noqa: F401 - register SQLAlchemy relationships
from src.analyze.repository import (
    _analyze_result_options,
    get_analyze_result_by_user_id,
    get_latest_analyze_result_for_tests,
)


class _Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _Session:
    def __init__(self, value):
        self.value = value
        self.query = None

    async def execute(self, query):
        self.query = query
        return _Result(self.value)


class AnalyzeTestsBridgeRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_latest_analyze_reader_is_user_scoped_and_deterministic(self):
        latest = SimpleNamespace(items=[])
        session = _Session(latest)

        result = await get_analyze_result_by_user_id(session, user_id=42, locale="ru")

        self.assertIs(result, latest)
        sql = str(session.query)
        self.assertIn("analyze_results.user_id = :user_id_1", sql)
        self.assertIn("analyze_results.created_at DESC, analyze_results.id DESC", sql)
        self.assertEqual(len(session.query._with_options), 1)

    async def test_shared_latest_reader_keeps_localized_chapter_loader(self):
        self.assertIn("Chapter.translations", str(_analyze_result_options()[0].path))

    async def test_shared_latest_reader_applies_requested_chapter_locale(self):
        localized_titles = {
            "ru": "Русский раздел",
            "kk": "Қазақша бөлім",
        }
        for locale, title in localized_titles.items():
            chapter = SimpleNamespace(
                code="chapter-code",
                translations=[SimpleNamespace(locale=locale, title=title)],
            )
            session = _Session(SimpleNamespace(items=[SimpleNamespace(chapter=chapter)]))

            result = await get_analyze_result_by_user_id(session, user_id=42, locale=locale)

            self.assertEqual(result.items[0].chapter.title, title)

    async def test_weak_bridge_reader_is_lean_and_preserves_latest_scope_order(self):
        latest = SimpleNamespace(items=[])
        session = _Session(latest)

        result = await get_latest_analyze_result_for_tests(session, user_id=42)

        self.assertIs(result, latest)
        self.assertNotIn("Chapter.translations", str(session.query._with_options[0].path))
        self.assertIn("analyze_results.user_id = :user_id_1", str(session.query))
        self.assertIn("analyze_results.created_at DESC, analyze_results.id DESC", str(session.query))


if __name__ == "__main__":
    unittest.main()
