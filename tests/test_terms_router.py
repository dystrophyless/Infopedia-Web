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
from src.terms.schemas import (
    DefinitionCreate,
    TermCreate,
    TermDetailedResponse,
    TermUpdate,
)
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
        name=f"Source {term_id}",
        text=f"Definition {term_id}",
        page=term_id,
    )
    term.definitions = [definition]
    return term


def make_featured_definition() -> Definition:
    """Build a featured definition whose source and canonical names differ."""
    topic = Topic(
        id=1,
        name="1.2. Компьютерлік жад",
        page_start=1,
        page_end=100,
        book=Book(id=1, publisher="Atamura", grade=7),
    )
    term = Term(id=4, name="Жедел жад")
    definition = Definition(
        id=10,
        name="RAM",
        term_id=term.id,
        term=term,
        topic_id=topic.id,
        topic=topic,
        text="definition",
        page=9,
    )
    term.definitions = [definition]
    return definition


class BuildTermDefinitionsTests(unittest.IsolatedAsyncioTestCase):
    async def test_build_preserves_requested_source_name(self):
        topic = Topic(
            id=1,
            name="Topic 1",
            page_start=1,
            page_end=100,
            book=Book(id=1, publisher="Atamura", grade=9),
        )
        original_get_topic_by_name = router.get_topic_by_name
        original_get_embedder = router.get_embedder
        test_case = self

        async def fake_get_topic_by_name(session, *, name):
            self.assertEqual(name, "Topic 1")
            return topic

        class Embedder:
            def encode(self, text):
                test_case.assertEqual(text, "definition")
                return [0.1, 0.2]

        router.get_topic_by_name = fake_get_topic_by_name
        router.get_embedder = lambda: Embedder()

        try:
            definitions = await router._build_term_definitions(
                object(),
                [
                    DefinitionCreate(
                        name="ЖЖҚ",
                        text="definition",
                        topic="Topic 1",
                        page=17,
                    ),
                ],
            )
        finally:
            router.get_topic_by_name = original_get_topic_by_name
            router.get_embedder = original_get_embedder

        self.assertTrue(hasattr(definitions[0], "name"))
        self.assertEqual(definitions[0].name, "ЖЖҚ")

    async def test_create_and_update_payloads_serialize_source_names(self):
        topic = Topic(
            id=1,
            name="Topic 1",
            page_start=1,
            page_end=100,
            book=Book(id=1, publisher="Atamura", grade=9),
        )
        original_get_topic_by_name = router.get_topic_by_name
        original_get_embedder = router.get_embedder
        test_case = self

        async def fake_get_topic_by_name(session, *, name):
            self.assertEqual(name, "Topic 1")
            return topic

        class Embedder:
            def encode(self, text):
                test_case.assertEqual(text, "definition")
                return [0.1, 0.2]

        router.get_topic_by_name = fake_get_topic_by_name
        router.get_embedder = lambda: Embedder()

        try:
            create_payload = TermCreate(
                name="Жедел жад",
                definitions=[
                    DefinitionCreate(
                        name="RAM",
                        text="definition",
                        topic="Topic 1",
                        page=17,
                    ),
                ],
            )
            update_payload = TermUpdate(
                name="Жедел жад",
                definitions=[
                    DefinitionCreate(
                        name="ЖЖҚ",
                        text="definition",
                        topic="Topic 1",
                        page=17,
                    ),
                ],
            )

            for payload, expected_name in (
                (create_payload, "RAM"),
                (update_payload, "ЖЖҚ"),
            ):
                definitions = await router._build_term_definitions(
                    object(),
                    payload.definitions,
                )
                definitions[0].id = 10
                term = Term(
                    id=4,
                    name=payload.name or "Жедел жад",
                    definitions=definitions,
                )
                response = TermDetailedResponse.model_validate(term)
                self.assertEqual(response.name, "Жедел жад")
                self.assertEqual(response.definitions[0].name, expected_name)
        finally:
            router.get_topic_by_name = original_get_topic_by_name
            router.get_embedder = original_get_embedder


class FeaturedTermsTests(unittest.IsolatedAsyncioTestCase):
    async def test_featured_terms_use_configured_definition_ids_in_order(self):
        calls = []
        definitions = [
            make_featured_definition(),
            *(make_term(term_id).definitions[0] for term_id in (4, 27, 31, 47)),
        ]
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
            ["Жедел жад", "Term 4", "Term 27", "Term 31", "Term 47"],
        )
        self.assertEqual(featured_terms[0].featured_definition.id, 10)
        self.assertEqual(featured_terms[0].term.name, "Жедел жад")
        self.assertEqual(featured_terms[0].featured_definition.name, "RAM")


class RelatedTermsTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.original_anti_scrape = router.enforce_anti_scrape
        self.original_decode_related_refs = router._decode_related_refs_or_404
        self.original_get_related = router.get_related_terms

    async def asyncTearDown(self):
        router.enforce_anti_scrape = self.original_anti_scrape
        router._decode_related_refs_or_404 = self.original_decode_related_refs
        router.get_related_terms = self.original_get_related

    @staticmethod
    def request():
        return Request({"type": "http", "method": "GET", "path": "/", "headers": []})

    async def test_enforces_related_scope_before_repository_and_returns_lightweight_unique_terms(self):
        calls = []
        current = make_term(11)
        definition = current.definitions[0]
        related = [Term(id=20, name="A"), Term(id=21, name="B"), Term(id=22, name="C")]

        class Session:
            async def get(self, model, definition_id):
                calls.append(("definition", model, definition_id))
                return definition

        async def anti_scrape(request, **kwargs):
            calls.append(("anti", kwargs))

        async def get_related(session, **kwargs):
            calls.append(("related", kwargs))
            return related

        router.enforce_anti_scrape = anti_scrape
        router.get_related_terms = get_related

        response = await router.get_related_term_suggestions(
            self.request(),
            encode_public_ref("term", 11),
            type("User", (), {"id": 5})(),
            Session(),
            encode_public_ref("definition", 11),
        )

        self.assertEqual(calls[0], ("anti", {"scope": "terms:related", "user_id": 5, "limit": router.settings.ANTI_SCRAPE_DETAIL_LIMIT}))
        self.assertEqual(
            calls[1:],
            [
                ("definition", Definition, 11),
                ("related", {"topic_id": 11, "current_term_id": 11}),
            ],
        )
        self.assertEqual([item.name for item in response], ["A", "B", "C"])
        self.assertEqual([item.public_id for item in response], [encode_public_ref("term", value) for value in (20, 21, 22)])
        self.assertTrue(all("definition_name" not in item.model_dump() for item in response))

    async def test_invalid_or_mismatched_refs_fail_closed_with_generic_not_found(self):
        repository_calls = []

        class Session:
            async def get(self, model, definition_id):
                repository_calls.append((model, definition_id))
                return make_term(12).definitions[0]

        async def anti_scrape(request, **kwargs):
            return None

        router.enforce_anti_scrape = anti_scrape

        for term_ref, definition_ref in (
            ("invalid", encode_public_ref("definition", 11)),
            (encode_public_ref("term", 11), "invalid"),
            (encode_public_ref("term", 11), encode_public_ref("definition", 12)),
        ):
            with self.subTest(term_ref=term_ref, definition_ref=definition_ref):
                with self.assertRaises(HTTPException) as raised:
                    await router.get_related_term_suggestions(
                        self.request(), term_ref, type("User", (), {"id": 5})(), Session(), definition_ref,
                    )
                self.assertEqual(raised.exception.status_code, 404)
                self.assertEqual(raised.exception.detail, "Resource not found.")

        self.assertEqual(repository_calls, [(Definition, 12)])

    async def test_invalid_refs_are_rate_limited_before_decoding(self):
        calls = []

        async def anti_scrape(request, **kwargs):
            calls.append("anti")

        def decode_related_refs(term_ref, definition_ref):
            calls.append("decode")
            return self.original_decode_related_refs(term_ref, definition_ref)

        router.enforce_anti_scrape = anti_scrape
        router._decode_related_refs_or_404 = decode_related_refs

        with self.assertRaises(HTTPException) as raised:
            await router.get_related_term_suggestions(
                self.request(),
                "invalid",
                type("User", (), {"id": 5})(),
                object(),
                encode_public_ref("definition", 11),
            )

        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(calls, ["anti", "decode"])


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
