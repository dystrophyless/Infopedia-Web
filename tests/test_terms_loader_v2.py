# ruff: noqa: PT009
import unittest
from types import SimpleNamespace

from src.loader import _build_pending_definitions
from src.terms.catalog import CatalogDefinition, TermsCatalogV2, parse_terms_catalog_v2


class TermsLoaderV2Tests(unittest.TestCase):
    def test_exact_duplicate_catalog_definition_yields_one_pending_insert(self):
        catalog = parse_terms_catalog_v2(
            {
                "schema_version": 2,
                "terms": {
                    "Canonical": {
                        "variants": {
                            "Source": {
                                "Book: 7-сынып": [
                                    {"definition": "same", "topic": "Topic", "page": 1},
                                    {"definition": "same", "topic": "Topic", "page": 1},
                                ],
                            },
                        },
                    },
                },
            },
        )
        pending, new_count, backfill_count, skipped = _build_pending_definitions(
            catalog,
            {"Canonical": SimpleNamespace(id=10)},
            {"Book: 7-сынып": SimpleNamespace(id=20)},
            {(20, "Topic"): SimpleNamespace(id=30)},
            {},
        )

        self.assertEqual(len(pending), 1)
        self.assertEqual((new_count, backfill_count, skipped), (1, 0, 0))
        self.assertEqual(pending[0].name, "Source")

    def test_same_canonical_term_keeps_two_source_names_as_two_definition_identities(
        self,
    ):
        catalog = TermsCatalogV2(
            canonical_names=("Жедел жад",),
            definitions=(
                CatalogDefinition(
                    "Жедел жад",
                    "RAM",
                    "Book: 7-сынып",
                    "Topic",
                    "same text",
                    9,
                ),
                CatalogDefinition(
                    "Жедел жад",
                    "ЖЖҚ",
                    "Book: 7-сынып",
                    "Topic",
                    "same text",
                    9,
                ),
            ),
        )
        term = SimpleNamespace(id=10)
        book = SimpleNamespace(id=20)
        topic = SimpleNamespace(id=30)

        pending, new_count, backfill_count, skipped = _build_pending_definitions(
            catalog,
            {"Жедел жад": term},
            {"Book: 7-сынып": book},
            {(20, "Topic"): topic},
            {},
        )

        self.assertEqual(new_count, 2)
        self.assertEqual(backfill_count, 0)
        self.assertEqual(skipped, 0)
        self.assertEqual([item.name for item in pending], ["RAM", "ЖЖҚ"])

    def test_existing_five_part_identity_is_skipped_without_reembedding(self):
        catalog = TermsCatalogV2(
            canonical_names=("Жедел жад",),
            definitions=(
                CatalogDefinition(
                    "Жедел жад",
                    "RAM",
                    "Book: 7-сынып",
                    "Topic",
                    "text",
                    9,
                ),
            ),
        )
        existing = {(10, "RAM", 30, "text", 9): (99, True)}
        pending, new_count, backfill_count, skipped = _build_pending_definitions(
            catalog,
            {"Жедел жад": SimpleNamespace(id=10)},
            {"Book: 7-сынып": SimpleNamespace(id=20)},
            {(20, "Topic"): SimpleNamespace(id=30)},
            existing,
        )
        self.assertEqual(pending, [])
        self.assertEqual((new_count, backfill_count, skipped), (0, 0, 1))
