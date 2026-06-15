import unittest
from types import SimpleNamespace

from src.analyze.enums import CHAPTER_ALIASES, Chapter
from src.analyze.repository import get_chapter_model_by_analyze_chapter


class FakeScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class FakeExecuteResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return FakeScalarResult(self.rows)


class FakeSession:
    def __init__(self, rows):
        self.info = {}
        self.rows = rows
        self.execute_count = 0

    async def execute(self, query):
        self.execute_count += 1
        return FakeExecuteResult(self.rows)


class AnalyzeRepositoryTests(unittest.IsolatedAsyncioTestCase):
    async def test_chapter_models_are_cached_in_session_info(self):
        chapter_model = SimpleNamespace(
            id=1,
            name=CHAPTER_ALIASES[Chapter.COMPUTER_DEVICES][0],
        )
        session = FakeSession([chapter_model])

        first = await get_chapter_model_by_analyze_chapter(
            session,
            chapter=Chapter.COMPUTER_DEVICES,
        )
        second = await get_chapter_model_by_analyze_chapter(
            session,
            chapter=Chapter.COMPUTER_DEVICES,
        )

        self.assertIs(first, chapter_model)
        self.assertIs(second, chapter_model)
        self.assertEqual(session.execute_count, 1)


if __name__ == "__main__":
    unittest.main()
