# ruff: noqa: PT009, PT027
import unittest

from src.search.term_filters import (
    MAX_FILTER_VALUES_PER_KIND,
    InvalidTermSearchFiltersError,
    parse_term_search_filters,
)
from src.security.public_refs import encode_public_ref


class SearchTermFilterParsingTests(unittest.TestCase):
    def test_parser_trims_query_and_deduplicates_each_filter(self):
        book_ref = encode_public_ref("book", 7)
        chapter_ref = encode_public_ref("chapter", 11)

        filters = parse_term_search_filters(
            query="  Алгоритм  ",
            grades=[10, 7, 10],
            book_refs=[book_ref, book_ref],
            chapter_refs=[chapter_ref, chapter_ref],
            ent_only=True,
        )

        self.assertEqual(filters.query, "Алгоритм")
        self.assertEqual(filters.grades, (7, 10))
        self.assertEqual(filters.book_ids, (7,))
        self.assertEqual(filters.chapter_ids, (11,))
        self.assertTrue(filters.ent_only)

    def test_empty_query_is_valid(self):
        filters = parse_term_search_filters(
            query="   ",
            grades=[],
            book_refs=[],
            chapter_refs=[],
            ent_only=False,
        )

        self.assertEqual(filters.query, "")

    def test_parser_rejects_out_of_range_grades_with_generic_error(self):
        for grade in (6, 12, "ten"):
            with self.subTest(grade=grade), self.assertRaisesRegex(
                InvalidTermSearchFiltersError,
                "^Invalid search filters\\.$",
            ):
                parse_term_search_filters(
                    query="query",
                    grades=[grade],
                    book_refs=[],
                    chapter_refs=[],
                    ent_only=False,
                )

    def test_parser_rejects_malformed_and_wrong_namespace_refs_generically(self):
        invalid_refs = (
            "not-a-signed-reference",
            encode_public_ref("chapter", 3),
        )
        for book_ref in invalid_refs:
            with self.subTest(book_ref=book_ref), self.assertRaisesRegex(
                InvalidTermSearchFiltersError,
                "^Invalid search filters\\.$",
            ):
                parse_term_search_filters(
                    query="query",
                    grades=[],
                    book_refs=[book_ref],
                    chapter_refs=[],
                    ent_only=False,
                )

    def test_parser_bounds_raw_filter_cardinality_before_deduplication(self):
        repeated_ref = encode_public_ref("book", 1)

        with self.assertRaisesRegex(InvalidTermSearchFiltersError, "^Invalid search filters\\.$"):
            parse_term_search_filters(
                query="query",
                grades=[],
                book_refs=[repeated_ref] * (MAX_FILTER_VALUES_PER_KIND + 1),
                chapter_refs=[],
                ent_only=False,
            )


if __name__ == "__main__":
    unittest.main()
