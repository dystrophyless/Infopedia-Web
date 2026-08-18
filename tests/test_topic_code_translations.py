import unittest
from pathlib import Path
from typing import Literal

from pydantic import TypeAdapter

from src.database import Base
from src.analyze.models import AnalyzeResultItem  # noqa: F401
from src.loader import normalize_topic_code_name, parse_lesson_goal
from src.topics.models import Chapter, TopicCode, TopicCodeTranslation
from src.topics.repository import resolve_topic_code_title
from src.topics.schemas import TopicCodeResponse, TopicCreate, TopicUpdate


ROOT = Path(__file__).resolve().parents[1]


class TopicCodeTranslationTests(unittest.TestCase):
    def test_parser_keeps_code_separate_from_lesson_goal_title(self):
        self.assertEqual(parse_lesson_goal(" 7.1.1.1 describe memory "), ("7.1.1.1", "describe memory"))
        self.assertEqual(normalize_topic_code_name("7.1.1.1 old title"), "7.1.1.1")

    def test_parser_skips_malformed_titles(self):
        self.assertIsNone(parse_lesson_goal("not a topic code"))
        self.assertIsNone(parse_lesson_goal("7.1.1.1"))
        self.assertIsNone(parse_lesson_goal(None))

    def test_translation_metadata_and_locale_fallback(self):
        table = Base.metadata.tables["topic_code_translation"]
        self.assertEqual({column.name for column in table.columns}, {"id", "topic_code_id", "locale", "title"})
        topic_code = TopicCode(id=1, name="7.1.1.1")
        topic_code.translations = [
            TopicCodeTranslation(locale="kk", title="Қазақша"),
            TopicCodeTranslation(locale="ru", title="Русский"),
        ]
        self.assertEqual(resolve_topic_code_title(topic_code, "ru"), "Русский")
        self.assertEqual(resolve_topic_code_title(topic_code, "en"), "Қазақша")

    def test_response_and_input_schemas_keep_topic_code_name(self):
        topic_code = TopicCode(id=1, name="7.1.1.1")
        response = TopicCodeResponse.model_validate(topic_code)
        self.assertEqual(response.name, "7.1.1.1")
        self.assertEqual(response.title, "7.1.1.1")
        self.assertEqual(TypeAdapter(Literal["kk", "ru"]).validate_python("ru"), "ru")
        topic = TopicCreate(name="Topic", page_start=1, page_end=2, book_id=1, topic_codes=[{"id": 1, "name": "7.1.1.1"}])
        update = TopicUpdate(topic_codes=[{"id": 1, "name": "7.1.1.1"}])
        self.assertEqual(topic.topic_codes[0].name, update.topic_codes[0].name)

    def test_analyze_item_uses_only_chapter_id(self):
        columns = {column.name for column in Base.metadata.tables["analyze_result_items"].columns}
        self.assertIn("chapter_id", columns)
        self.assertNotIn("chapter", columns)
        self.assertNotIn("analyze_" + "chapter", (ROOT / "src/analyze/models.py").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
