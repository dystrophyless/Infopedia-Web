import tempfile
import unittest
from pathlib import Path

import src.models  # noqa: F401 - register all SQLAlchemy metadata/indexes
from src.terms.catalog import load_terms_catalog, parse_terms_catalog_v2
from src.terms.models import Definition, Term
from src.terms.schemas import DefinitionCreate, DefinitionResponse

VALID = {
    "schema_version": 2,
    "terms": {
        "Жедел жад": {
            "variants": {
                "RAM": {
                    "Алматыкітап: 7-сынып": [
                        {"definition": "RAM definition", "topic": "1.2. Компьютерлік жад", "page": 9},
                    ],
                },
                "ЖЖҚ": {
                    "Атамұра: 7-сынып": [
                        {"definition": "ЖЖҚ definition", "topic": "1.3. Компьютерлік жад", "page": 17},
                    ],
                },
            },
        },
    },
}


class TermsCatalogV2Tests(unittest.TestCase):
    def test_definition_model_owns_source_name_and_trigram_index(self):
        self.assertTrue(hasattr(Definition.__table__.c, "name"))
        self.assertEqual(Definition.__table__.c.name.type.length, 255)
        self.assertFalse(Definition.__table__.c.name.nullable)
        self.assertIn(
            "idx_definition_name_trgm",
            {index.name for index in Definition.__table__.indexes},
        )
        self.assertNotIn(
            "idx_term_name_trgm",
            {index.name for index in Term.__table__.indexes},
        )

    def test_definition_create_requires_source_name(self):
        payload = DefinitionCreate(
            name="ЖЖҚ",
            text="definition",
            topic="topic",
            page=17,
        )
        self.assertEqual(payload.model_dump().get("name"), "ЖЖҚ")
        self.assertIn("name", DefinitionResponse.model_fields)

    def test_flattens_canonical_term_and_source_names_without_losing_definitions(self):
        catalog = parse_terms_catalog_v2(VALID)
        self.assertEqual(catalog.canonical_names, ("Жедел жад",))
        self.assertEqual(len(catalog.definitions), 2)
        self.assertEqual(
            [(item.canonical_name, item.source_name, item.book_key) for item in catalog.definitions],
            [
                ("Жедел жад", "RAM", "Алматыкітап: 7-сынып"),
                ("Жедел жад", "ЖЖҚ", "Атамұра: 7-сынып"),
            ],
        )

    def test_rejects_v1_catalog_instead_of_guessing_its_shape(self):
        with self.assertRaisesRegex(ValueError, "schema_version must be 2"):
            parse_terms_catalog_v2({"RAM": {"Алматыкітап: 7-сынып": []}})

    def test_rejects_empty_or_oversized_names_and_malformed_definition_payloads(self):
        invalid = {
            "schema_version": 2,
            "terms": {
                "Жедел жад": {
                    "variants": {
                        "": {
                            "Алматыкітап: 7-сынып": [
                                {"definition": "x", "topic": "topic", "page": 9},
                            ],
                        },
                    },
                },
            },
        }
        with self.assertRaisesRegex(ValueError, "source name"):
            parse_terms_catalog_v2(invalid)

    def test_collapses_exact_duplicate_definition_identities(self):
        duplicate = {
            "schema_version": 2,
            "terms": {
                "Term": {
                    "variants": {
                        "Term": {
                            "Publisher: 7-сынып": [
                                {"definition": "same", "topic": "Topic", "page": 1},
                                {"definition": "same", "topic": "Topic", "page": 1},
                            ],
                        },
                    },
                },
            },
        }
        catalog = parse_terms_catalog_v2(duplicate)
        self.assertEqual(len(catalog.definitions), 1)
        self.assertEqual(catalog.definitions[0].source_name, "Term")

    def test_load_terms_catalog_rejects_duplicate_json_object_keys(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "terms.json"
            path.write_text(
                '{"schema_version": 2, "schema_version": 2, "terms": {}}',
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "duplicate JSON object key"):
                load_terms_catalog(path)

    def test_rejects_source_name_owned_by_multiple_canonical_terms(self):
        ambiguous = {
            "schema_version": 2,
            "terms": {
                "Canonical A": {
                    "variants": {
                        "Shared": {
                            "Publisher: 7-сынып": [
                                {"definition": "a", "topic": "Topic", "page": 1},
                            ],
                        },
                    },
                },
                "Canonical B": {
                    "variants": {
                        "Shared": {
                            "Publisher: 7-сынып": [
                                {"definition": "b", "topic": "Topic", "page": 2},
                            ],
                        },
                    },
                },
            },
        }
        with self.assertRaisesRegex(ValueError, "multiple canonical terms"):
            parse_terms_catalog_v2(ambiguous)
