from __future__ import annotations

# ruff: noqa: PT009
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import FastAPI, HTTPException
from httpx import ASGITransport, AsyncClient

from src.auth.dependencies import get_current_user
from src.database import get_async_session
from src.search import router
from src.security.public_refs import encode_public_ref
from src.terms.repository import (
    SearchBookDTO,
    SearchDefinitionDTO,
    SearchTermDTO,
    SearchTermsRepositoryPage,
    SearchTopicDTO,
)


def repository_page() -> SearchTermsRepositoryPage:
    book = SearchBookDTO(id=2, publisher="Atamura", grade=10)
    topic = SearchTopicDTO(
        id=3,
        name="Algorithms",
        page_start=1,
        page_end=20,
        book=book,
    )
    term = SearchTermDTO(
        id=9,
        name="Algorithm",
        definitions=[
            SearchDefinitionDTO(id=12, name="Algorithm", text="First", page=4, topic=topic),
            SearchDefinitionDTO(id=14, name="Algorithm (alt)", text="Second", page=6, topic=topic),
        ],
    )
    return SearchTermsRepositoryPage(terms=[term], total=3, mode="prefix")


class SearchTermsRouterTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.app = FastAPI()
        self.app.include_router(router.router, prefix="/api/search")

        async def fake_user():
            return SimpleNamespace(id=42)

        async def fake_session():
            yield SimpleNamespace()

        self.app.dependency_overrides[get_current_user] = fake_user
        self.app.dependency_overrides[get_async_session] = fake_session
        self.client = AsyncClient(transport=ASGITransport(app=self.app), base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_search_exposes_only_ordinary_and_filtered_term_routes(self):
        paths = [route.path for route in self.app.routes]

        self.assertIn("/api/search/", paths)
        self.assertIn("/api/search/terms", paths)
        self.assertNotIn("/api/search", paths)
        self.assertFalse(any(path.startswith("/api/search/{task_id}") for path in paths))

    async def test_terms_route_accepts_empty_query_and_returns_dedicated_page_shape(self):
        with (
            patch("src.search.router.enforce_anti_scrape", new=AsyncMock()) as anti_scrape,
            patch("src.search.router.search_filtered_terms", new=AsyncMock(return_value=repository_page())) as search,
        ):
            response = await self.client.get(
                "/api/search/terms",
                params=[("grade", "10"), ("grade", "10"), ("skip", "1"), ("limit", "1")],
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json(),
            {
                "terms": [
                    {
                        "name": "Algorithm",
                        "public_id": encode_public_ref("term", 9),
                        "definitions": [
                            {
                                "name": "Algorithm",
                                "text": "First",
                                "topic": {
                                    "name": "Algorithms",
                                    "page_start": 1,
                                    "page_end": 20,
                                    "book": {
                                        "publisher": "Atamura",
                                        "grade": 10,
                                        "public_id": encode_public_ref("book", 2),
                                    },
                                    "public_id": encode_public_ref("topic", 3),
                                },
                                "page": 4,
                                "public_id": encode_public_ref("definition", 12),
                            },
                            {
                                "name": "Algorithm (alt)",
                                "text": "Second",
                                "topic": {
                                    "name": "Algorithms",
                                    "page_start": 1,
                                    "page_end": 20,
                                    "book": {
                                        "publisher": "Atamura",
                                        "grade": 10,
                                        "public_id": encode_public_ref("book", 2),
                                    },
                                    "public_id": encode_public_ref("topic", 3),
                                },
                                "page": 6,
                                "public_id": encode_public_ref("definition", 14),
                            },
                        ],
                    },
                ],
                "total": 3,
                "skip": 1,
                "limit": 1,
                "has_more": True,
            },
        )
        anti_scrape.assert_awaited_once()
        call = search.await_args
        self.assertEqual(call.kwargs["filters"].query, "")
        self.assertEqual(call.kwargs["filters"].grades, (10,))

    async def test_malformed_and_wrong_namespace_refs_are_generic_422(self):
        invalid_refs = ("not-a-ref", encode_public_ref("chapter", 2))
        for invalid_ref in invalid_refs:
            with self.subTest(invalid_ref=invalid_ref), patch(
                "src.search.router.enforce_anti_scrape",
                new=AsyncMock(),
            ):
                response = await self.client.get("/api/search/terms", params={"book": invalid_ref})
            self.assertEqual(response.status_code, 422)
            self.assertEqual(response.json(), {"detail": "Invalid search filters."})

    async def test_valid_deleted_reference_produces_zero_matches(self):
        deleted_book_ref = encode_public_ref("book", 999999)
        empty_page = SearchTermsRepositoryPage(terms=[], total=0, mode="all_filtered")
        with (
            patch("src.search.router.enforce_anti_scrape", new=AsyncMock()),
            patch("src.search.router.search_filtered_terms", new=AsyncMock(return_value=empty_page)) as search,
        ):
            response = await self.client.get("/api/search/terms", params={"book": deleted_book_ref})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["terms"], [])
        self.assertEqual(response.json()["total"], 0)
        self.assertEqual(search.await_args.kwargs["filters"].book_ids, (999999,))

    async def test_rate_limit_error_stops_before_repository(self):
        repository = AsyncMock()
        with (
            patch(
                "src.search.router.enforce_anti_scrape",
                new=AsyncMock(side_effect=HTTPException(status_code=429, detail="Too many requests.")),
            ),
            patch("src.search.router.search_filtered_terms", new=repository),
        ):
            response = await self.client.get("/api/search/terms")

        self.assertEqual(response.status_code, 429)
        repository.assert_not_awaited()

    async def test_terms_static_route_is_not_shadowed_by_removed_dynamic_route(self):
        empty_page = SearchTermsRepositoryPage(terms=[], total=0, mode="all_filtered")
        with (
            patch("src.search.router.enforce_anti_scrape", new=AsyncMock()),
            patch("src.search.router.search_filtered_terms", new=AsyncMock(return_value=empty_page)),
        ):
            response = await self.client.get("/api/search/terms")

        self.assertEqual(response.status_code, 200, response.text)

    async def test_terms_route_requires_authentication(self):
        del self.app.dependency_overrides[get_current_user]

        response = await self.client.get("/api/search/terms")

        self.assertEqual(response.status_code, 401)

    async def test_legacy_search_route_contract_is_unchanged(self):
        matching_definition = SearchDefinitionDTO(
            id=12,
            name="ЖЖҚ",
            text="First",
            page=4,
            topic=SearchTopicDTO(
                id=3,
                name="Algorithms",
                page_start=1,
                page_end=20,
                book=SearchBookDTO(id=2, publisher="Atamura", grade=10),
            ),
        )
        page = SearchTermsRepositoryPage(
            terms=[
                SearchTermDTO(
                    id=9,
                    name="Жедел жад",
                    definitions=[matching_definition],
                ),
            ],
            total=1,
            mode="contains",
        )
        with (
            patch("src.search.router.enforce_anti_scrape", new=AsyncMock()),
            patch("src.search.router.search_filtered_terms", new=AsyncMock(return_value=page)) as search,
        ):
            response = await self.client.get(
                "/api/search/",
                params={"query": " ЖЖҚ ", "limit": "7"},
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()[0]["name"], "Жедел жад")
        self.assertEqual(response.json()[0]["definitions"][0]["name"], "ЖЖҚ")
        search.assert_awaited_once()
        filters = search.await_args.kwargs["filters"]
        self.assertEqual(filters.query, "ЖЖҚ")
        self.assertEqual(filters.grades, ())
        self.assertEqual(filters.book_ids, ())
        self.assertEqual(filters.chapter_ids, ())
        self.assertFalse(filters.ent_only)
        self.assertEqual(search.await_args.kwargs["skip"], 0)
        self.assertEqual(search.await_args.kwargs["limit"], 7)


if __name__ == "__main__":
    unittest.main()
