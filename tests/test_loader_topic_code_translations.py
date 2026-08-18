import asyncio
import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from src.loader import (
    build_topic_code_translation_payload,
    load_chapters_and_topic_codes,
    validate_topic_code_translations,
)
from src.topics.models import Chapter, TopicCode, TopicCodeTranslation


ROOT = Path(__file__).resolve().parents[1]
MAPPING_PATH = ROOT / "src/data/mappingStructure.json"
TRANSLATIONS_PATH = ROOT / "src/data/topicCodeTranslations.json"


def _catalogs() -> tuple[dict, dict]:
    mapping_data = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    translation_catalog = json.loads(TRANSLATIONS_PATH.read_text(encoding="utf-8"))
    return mapping_data, translation_catalog


class _FakeResult:
    def __init__(self, row):
        self.row = row

    def scalar_one_or_none(self):
        return self.row


class _StatefulLoaderSession:
    def __init__(self):
        self.topic_codes: dict[str, TopicCode] = {}
        self.translations: dict[tuple[int, str], TopicCodeTranslation] = {}
        self.commit_count = 0
        self.rollback_count = 0
        self.execute_count = 0
        self._next_topic_code_id = 1

    async def execute(self, statement):
        self.execute_count += 1
        entity = statement.column_descriptions[0]["entity"]
        where_clause = statement.whereclause
        clauses = getattr(where_clause, "clauses", (where_clause,))
        values = {
            clause.left.key: clause.right.value
            for clause in clauses
        }

        if entity is TopicCode:
            row = self.topic_codes.get(values["name"])
        elif entity is TopicCodeTranslation:
            row = self.translations.get(
                (values["topic_code_id"], values["locale"]),
            )
        else:
            raise AssertionError(f"Unexpected entity in loader test: {entity!r}")
        return _FakeResult(row)

    def add(self, row):
        if isinstance(row, TopicCode):
            if row.id is None:
                row.id = self._next_topic_code_id
                self._next_topic_code_id += 1
            self.topic_codes[row.name] = row
        elif isinstance(row, TopicCodeTranslation):
            self.translations[(row.topic_code_id, row.locale)] = row
        else:
            raise AssertionError(f"Unexpected row in loader test: {row!r}")

    async def flush(self):
        return None

    async def commit(self):
        self.commit_count += 1

    async def rollback(self):
        self.rollback_count += 1


class TopicCodeTranslationsValidationTests(unittest.TestCase):
    def test_valid_catalog_is_returned(self):
        mapping_data, translation_catalog = _catalogs()

        validated = validate_topic_code_translations(mapping_data, translation_catalog)

        self.assertIs(validated, translation_catalog)
        self.assertEqual(len(validated), 69)

    def test_missing_and_extra_code_are_rejected(self):
        mapping_data, translation_catalog = _catalogs()
        catalog = copy.deepcopy(translation_catalog)
        catalog.pop(next(iter(catalog)))
        catalog["99.99.99"] = {"kk": "extra", "ru": "extra"}

        with self.assertRaisesRegex(ValueError, r"missing=.*extra=.*"):
            validate_topic_code_translations(mapping_data, catalog)

    def test_wrong_kk_is_rejected(self):
        mapping_data, translation_catalog = _catalogs()
        catalog = copy.deepcopy(translation_catalog)
        code = next(iter(catalog))
        catalog[code]["kk"] = "wrong"

        with self.assertRaisesRegex(ValueError, r"does not match mapping title"):
            validate_topic_code_translations(mapping_data, catalog)

    def test_empty_ru_is_rejected(self):
        mapping_data, translation_catalog = _catalogs()
        catalog = copy.deepcopy(translation_catalog)
        catalog[next(iter(catalog))]["ru"] = ""

        with self.assertRaisesRegex(ValueError, r"ru must be a non-empty string"):
            validate_topic_code_translations(mapping_data, catalog)

    def test_extra_locale_is_rejected(self):
        mapping_data, translation_catalog = _catalogs()
        catalog = copy.deepcopy(translation_catalog)
        catalog[next(iter(catalog))]["kz"] = "қазақша"

        with self.assertRaisesRegex(ValueError, r"exactly kk and ru"):
            validate_topic_code_translations(mapping_data, catalog)

    def test_upsert_payload_contains_only_kk_and_ru(self):
        mapping_data, translation_catalog = _catalogs()
        validated = validate_topic_code_translations(mapping_data, translation_catalog)
        code = next(iter(validated))

        self.assertEqual(
            build_topic_code_translation_payload(42, code, validated),
            [
                {"topic_code_id": 42, "locale": "kk", "title": validated[code]["kk"]},
                {"topic_code_id": 42, "locale": "ru", "title": validated[code]["ru"]},
            ],
        )

    def test_loader_creates_updates_and_deduplicates_both_locales(self):
        mapping_data = {
            "Unit": [
                {
                    "title": "Chapter: Unit 1",
                    "lessonGoals": [
                        "1.1.1 First goal",
                        "1.1.2 Second goal",
                    ],
                },
            ],
        }
        translation_catalog = {
            "1.1.1": {"kk": "First goal", "ru": "Первая цель"},
            "1.1.2": {"kk": "Second goal", "ru": "Вторая цель"},
        }
        fake_session = _StatefulLoaderSession()
        chapter = Chapter(id=7, code="chapter-1")

        with tempfile.TemporaryDirectory() as temporary_directory:
            mapping_path = Path(temporary_directory) / "mapping.json"
            translations_path = Path(temporary_directory) / "translations.json"

            def write_inputs():
                mapping_path.write_text(
                    json.dumps(mapping_data, ensure_ascii=False),
                    encoding="utf-8",
                )
                translations_path.write_text(
                    json.dumps(translation_catalog, ensure_ascii=False),
                    encoding="utf-8",
                )

            write_inputs()
            with patch("src.loader.load_chapter_catalog", return_value=[]), patch(
                "src.loader.resolve_chapter_by_title",
                return_value=chapter,
            ) as resolver_mock:
                asyncio.run(
                    load_chapters_and_topic_codes(
                        fake_session,
                        str(mapping_path),
                        str(translations_path),
                    ),
                )
                self.assertEqual(fake_session.commit_count, 1)
                self.assertEqual(len(fake_session.topic_codes), 2)
                self.assertEqual(len(fake_session.translations), 4)

                asyncio.run(
                    load_chapters_and_topic_codes(
                        fake_session,
                        str(mapping_path),
                        str(translations_path),
                    ),
                )
                self.assertEqual(fake_session.commit_count, 2)
                self.assertEqual(len(fake_session.translations), 4)

                mapping_data["Unit"][0]["lessonGoals"] = [
                    "1.1.1 Updated first goal",
                    "1.1.2 Second goal",
                ]
                translation_catalog["1.1.1"] = {
                    "kk": "Updated first goal",
                    "ru": "Обновлённая первая цель",
                }
                write_inputs()
                asyncio.run(
                    load_chapters_and_topic_codes(
                        fake_session,
                        str(mapping_path),
                        str(translations_path),
                    ),
                )

        self.assertEqual(fake_session.commit_count, 3)
        self.assertEqual(len(fake_session.translations), 4)
        self.assertEqual(
            fake_session.translations[(1, "kk")].title,
            "Updated first goal",
        )
        self.assertEqual(
            fake_session.translations[(1, "ru")].title,
            "Обновлённая первая цель",
        )
        self.assertEqual(
            {translation.locale for translation in fake_session.translations.values()},
            {"kk", "ru"},
        )

    def test_validation_error_happens_before_orm_and_commit(self):
        mapping_data = {
            "Unit": [
                {"title": "Chapter", "lessonGoals": ["1.1.1 First goal"]},
            ],
        }
        invalid_catalog = {"1.1.1": {"kk": "Wrong", "ru": "Первая цель"}}
        fake_session = _StatefulLoaderSession()

        with tempfile.TemporaryDirectory() as temporary_directory:
            mapping_path = Path(temporary_directory) / "mapping.json"
            translations_path = Path(temporary_directory) / "translations.json"
            mapping_path.write_text(json.dumps(mapping_data), encoding="utf-8")
            translations_path.write_text(json.dumps(invalid_catalog), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, r"does not match mapping title"):
                asyncio.run(
                    load_chapters_and_topic_codes(
                        fake_session,
                        str(mapping_path),
                        str(translations_path),
                    ),
                )

        self.assertEqual(fake_session.commit_count, 0)
        self.assertEqual(fake_session.rollback_count, 0)
        self.assertEqual(fake_session.execute_count, 0)
        self.assertEqual(fake_session.topic_codes, {})
        self.assertEqual(fake_session.translations, {})


if __name__ == "__main__":
    unittest.main()
