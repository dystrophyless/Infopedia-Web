import re
import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
ROUTER_SOURCE = (ROOT_DIR / "src" / "topics" / "router.py").read_text(encoding="utf-8")
REPOSITORY_SOURCE = (ROOT_DIR / "src" / "topics" / "repository.py").read_text(encoding="utf-8")


class TopicCatalogSourceContractTests(unittest.TestCase):
    def test_router_exposes_catalog_endpoints_before_topic_ref_route(self):
        books_index = ROUTER_SOURCE.find('@router.get("/books"')
        chapters_index = ROUTER_SOURCE.find('@router.get("/chapters"')
        topic_ref_index = ROUTER_SOURCE.find('@router.get("/{topic_ref}"')

        self.assertGreaterEqual(books_index, 0, "Topics router should expose /books catalog")
        self.assertGreaterEqual(chapters_index, 0, "Topics router should expose /chapters catalog")
        self.assertGreaterEqual(topic_ref_index, 0, "Topics router should keep the topic detail route")
        self.assertLess(books_index, topic_ref_index, "Static /books route must be registered before /{topic_ref}")
        self.assertLess(
            chapters_index,
            topic_ref_index,
            "Static /chapters route must be registered before /{topic_ref}",
        )

    def test_router_uses_catalog_repositories_and_schemas(self):
        self.assertRegex(
            ROUTER_SOURCE,
            r"from src\.topics\.repository import \([\s\S]*get_all_books,[\s\S]*get_all_chapters,",
        )
        self.assertRegex(
            ROUTER_SOURCE,
            r"from src\.topics\.schemas import [^\n]*BookResponse[^\n]*ChapterResponse",
        )
        self.assertRegex(
            ROUTER_SOURCE,
            r'@router\.get\("/books", response_model=list\[BookResponse\]\)[\s\S]*async def get_book_catalog\([\s\S]*topics:books',
        )
        self.assertRegex(
            ROUTER_SOURCE,
            r'@router\.get\("/chapters", response_model=list\[ChapterResponse\]\)[\s\S]*async def get_chapter_catalog\([\s\S]*topics:chapters',
        )

    def test_repository_catalog_queries_are_stably_ordered(self):
        self.assertRegex(
            REPOSITORY_SOURCE,
            r"async def get_all_books\([\s\S]*select\(Book\)[\s\S]*Book\.publisher\.asc\(\)[\s\S]*Book\.grade\.asc\(\)",
        )
        self.assertRegex(
            REPOSITORY_SOURCE,
            r"async def get_all_chapters\([\s\S]*select\(Chapter\)[\s\S]*Chapter\.id\.asc\(\)",
        )

    def test_catalog_routes_precede_dynamic_topic_route_in_source_order(self):
        route_patterns = re.findall(r'@router\.get\("([^"]+)"', ROUTER_SOURCE)
        self.assertIn("/books", route_patterns)
        self.assertIn("/chapters", route_patterns)
        self.assertLess(route_patterns.index("/books"), route_patterns.index("/{topic_ref}"))
        self.assertLess(route_patterns.index("/chapters"), route_patterns.index("/{topic_ref}"))
