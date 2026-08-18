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
    async def test_featured_terms_use_configured_definition_ids_in_order(self):
        calls = []
        definitions = [make_term(term_id).definitions[0] for term_id in (10, 4, 27, 31, 47)]
        had_original = hasattr(router, "get_featured_definitions")
        original = getattr(router, "get_featured_definitions", None)

        async def fake_get_featured_definitions(session, *, definition_ids):
            calls.append(definition_ids)
            return definitions

        router.get_featured_definitions = fake_get_featured_definitions

        try:
            featured_terms = await router._get_featured_terms(object())
        finally:
            if had_original:
                router.get_featured_definitions = original
            else:
                delattr(router, "get_featured_definitions")

        self.assertEqual(calls, [[10, 4, 27, 31, 47]])
        self.assertEqual(len(featured_terms), 5)
        self.assertEqual(
            [item.term.name for item in featured_terms],
            [f"Term {term_id}" for term_id in (10, 4, 27, 31, 47)],
        )
        self.assertEqual(featured_terms[0].featured_definition.id, 10)
