# ruff: noqa: I001, PT009, Q004

import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
ROUTER_SOURCE = (ROOT_DIR / "src" / "favorites" / "router.py").read_text(encoding="utf-8")
MAIN_SOURCE = (ROOT_DIR / "src" / "main.py").read_text(encoding="utf-8")


class FavoritesRouterSourceContractTests(unittest.TestCase):
    def test_authenticated_routes_and_registration(self):
        self.assertIn("Depends(get_current_user)", ROUTER_SOURCE)
        self.assertIn('@router.get(\"\", response_model=FavoritesPageResponse)', ROUTER_SOURCE)
        self.assertIn('@router.post(\"/status\", response_model=FavoriteStatusesResponse)', ROUTER_SOURCE)
        self.assertIn('@router.put(\"/{term_ref}\", response_model=FavoriteMutationResponse)', ROUTER_SOURCE)
        self.assertIn('@router.delete(\"/{term_ref}\", status_code=status.HTTP_204_NO_CONTENT)', ROUTER_SOURCE)

    def test_public_refs_are_decoded_and_invalid_refs_are_not_found(self):
        self.assertIn('decode_public_ref("term", term_ref)', ROUTER_SOURCE)
        self.assertIn("status_code=status.HTTP_404_NOT_FOUND", ROUTER_SOURCE)
        self.assertIn("Field(min_length=1, max_length=100)", (ROOT_DIR / "src" / "favorites" / "schemas.py").read_text(encoding="utf-8"))

    def test_status_resolves_terms_in_one_batch_before_status_lookup(self):
        status_source = ROUTER_SOURCE[
            ROUTER_SOURCE.index("async def get_favorite_statuses") : ROUTER_SOURCE.index('@router.put("/{term_ref}"')
        ]
        self.assertIn("existing_term_ids = await get_existing_term_ids(session, term_ids=term_ids)", status_source)
        self.assertIn("if existing_term_ids != set(term_ids):", status_source)
        self.assertNotIn("_require_term", status_source)
        self.assertEqual(status_source.count("await get_existing_term_ids("), 1)
        self.assertEqual(status_source.count("await get_favorite_term_ids("), 1)

    def test_production_startup_is_schema_side_effect_free(self):
        self.assertIn("import src.favorites.models", MAIN_SOURCE)
        startup = MAIN_SOURCE[MAIN_SOURCE.index("async def lifespan"):MAIN_SOURCE.index("def get_cors_origins")]
        self.assertNotRegex(startup, r"create_all|migrat|seed|loader|ensure_user_schema")
