import unittest

from src.terms.catalog import parse_terms_catalog_v2


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
