import unittest

import src.models  # noqa: F401 - register all SQLAlchemy relationships for model construction
from src.terms import router
from src.terms.models import Definition, Term
from src.topics.models import Book, Topic


def make_term(term_id: int) -> Term:
    book = Book(id=term_id, publisher="Atamura", grade=9)
    topic = Topic(
        id=term_id,
        name=f"Topic {term_id}",
        page_start=1,
        page_end=100,
        book=book,
    )
    term = Term(id=term_id, name=f"Term {term_id}")
    definition = Definition(
        id=term_id,
        term=term,
        topic=topic,
        text=f"Definition {term_id}",
        page=term_id,
    )
    term.definitions = [definition]
    return term


class FeaturedTermsTests(unittest.IsolatedAsyncioTestCase):
    async def test_featured_terms_use_ten_random_terms_from_database(self):
        calls = []
        terms = [make_term(term_id) for term_id in range(1, 13)]
        had_original = hasattr(router, "get_random_terms")
        original = getattr(router, "get_random_terms", None)

        async def fake_get_random_terms(session, *, quantity):
            calls.append(quantity)
            return terms[:quantity]

        router.get_random_terms = fake_get_random_terms

        try:
            featured_terms = await router._get_featured_terms(object())
        finally:
            if had_original:
                router.get_random_terms = original
            else:
                delattr(router, "get_random_terms")

        self.assertEqual(calls, [10])
        self.assertEqual(len(featured_terms), 10)
        self.assertEqual(
            [item.term.name for item in featured_terms],
            [f"Term {term_id}" for term_id in range(1, 11)],
        )
        self.assertEqual(featured_terms[0].featured_definition.topic.book.publisher, "Atamura")
