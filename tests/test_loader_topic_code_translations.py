import copy
import json
import unittest
from pathlib import Path

from src.loader import (
    build_topic_code_translation_payload,
    validate_topic_code_translations,
)


ROOT = Path(__file__).resolve().parents[1]
MAPPING_PATH = ROOT / "src/data/mappingStructure.json"
TRANSLATIONS_PATH = ROOT / "src/data/topicCodeTranslations.json"


def _catalogs() -> tuple[dict, dict]:
    mapping_data = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    translation_catalog = json.loads(TRANSLATIONS_PATH.read_text(encoding="utf-8"))
    return mapping_data, translation_catalog


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


if __name__ == "__main__":
    unittest.main()
