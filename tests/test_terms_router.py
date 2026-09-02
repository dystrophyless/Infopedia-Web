import unittest

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

import src.models  # noqa: F401 - register all SQLAlchemy relationships for model construction
from src.auth.dependencies import get_current_user
from src.database import get_async_session
from src.security.public_refs import encode_public_ref
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
        term_id=term_id,
        topic_id=term_id,
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


class RelatedTermsTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_anti_scrape = router.enforce_anti_scrape
        self.original_get_definition = router.get_definition_by_id
        self.original_get_related = router.get_related_terms

    async def asyncTearDown(self):
        router.enforce_anti_scrape = self.original_anti_scrape
        router.get_definition_by_id = self.original_get_definition
        router.get_related_terms = self.original_get_related

    @staticmethod
    def request():
        return Request({"type": "http", "method": "GET", "path": "/", "headers": []})

    async def test_enforces_related_scope_before_repository_and_returns_lightweight_unique_terms(self):
        calls = []
        current = make_term(11)
        definition = current.definitions[0]
        related = [Term(id=20, name="A"), Term(id=21, name="B"), Term(id=22, name="C")]

        async def anti_scrape(request, **kwargs):
            calls.append(("anti", kwargs))

        async def get_definition(session, *, id):
            calls.append(("definition", id))
            return definition

        async def get_related(session, **kwargs):
            calls.append(("related", kwargs))
            return related

        router.enforce_anti_scrape = anti_scrape
        router.get_definition_by_id = get_definition
        router.get_related_terms = get_related

        response = await router.get_related_term_suggestions(
            self.request(),
            encode_public_ref("term", 11),
            type("User", (), {"id": 5})(),
            object(),
            encode_public_ref("definition", 11),
        )

        self.assertEqual(calls[0], ("anti", {"scope": "terms:related", "user_id": 5, "limit": router.settings.ANTI_SCRAPE_DETAIL_LIMIT}))
        self.assertEqual(calls[1:], [("definition", 11), ("related", {"topic_id": 11, "current_term_id": 11})])
        self.assertEqual([item.name for item in response], ["A", "B", "C"])
        self.assertEqual([item.public_id for item in response], [encode_public_ref("term", value) for value in (20, 21, 22)])

    async def test_invalid_or_mismatched_refs_fail_closed_with_generic_not_found(self):
        repository_calls = []

        async def anti_scrape(request, **kwargs):
            return None

        async def get_definition(session, *, id):
            repository_calls.append(id)
            return make_term(12).definitions[0]

        router.enforce_anti_scrape = anti_scrape
        router.get_definition_by_id = get_definition

        for term_ref, definition_ref in (
            ("invalid", encode_public_ref("definition", 11)),
            (encode_public_ref("term", 11), "invalid"),
            (encode_public_ref("term", 11), encode_public_ref("definition", 12)),
        ):
            with self.subTest(term_ref=term_ref, definition_ref=definition_ref):
                with self.assertRaises(HTTPException) as raised:
                    await router.get_related_term_suggestions(
                        self.request(), term_ref, type("User", (), {"id": 5})(), object(), definition_ref,
                    )
                self.assertEqual(raised.exception.status_code, 404)
                self.assertEqual(raised.exception.detail, "Resource not found.")

        self.assertEqual(repository_calls, [12])


class RelatedTermsHttpContractTests(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(router.router, prefix="/api/terms")

    def test_related_route_requires_authentication(self):
        response = TestClient(self.app).get(
            "/api/terms/invalid/related",
            params={"definition_ref": "invalid"},
        )
        self.assertEqual(response.status_code, 401)

    def test_related_route_requires_definition_query_parameter(self):
        async def authenticated_user():
            return type("User", (), {"id": 5})()

        async def session():
            yield object()

        self.app.dependency_overrides[get_current_user] = authenticated_user
        self.app.dependency_overrides[get_async_session] = session
        response = TestClient(self.app).get(
            f"/api/terms/{encode_public_ref('term', 11)}/related",
        )
        self.assertEqual(response.status_code, 422)
