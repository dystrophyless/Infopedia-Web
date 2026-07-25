import unittest
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_SOURCE = (ROOT_DIR / "src" / "favorites" / "repository.py").read_text(encoding="utf-8")


class FavoritesRepositorySourceContractTests(unittest.TestCase):
    def test_listing_is_user_scoped_and_stably_newest_first(self):
        self.assertIn("FavoriteTerm.user_id == user_id", REPOSITORY_SOURCE)
        self.assertIn("FavoriteTerm.created_at.desc()", REPOSITORY_SOURCE)
        self.assertIn("FavoriteTerm.term_id.desc()", REPOSITORY_SOURCE)

    def test_listing_eager_loads_definition_topic_and_book(self):
        self.assertIn("selectinload(Term.definitions)", REPOSITORY_SOURCE)
        self.assertIn("joinedload(Definition.topic)", REPOSITORY_SOURCE)
        self.assertIn("joinedload(Topic.book)", REPOSITORY_SOURCE)

    def test_mutations_are_idempotent(self):
        self.assertIn("if existing is not None:", REPOSITORY_SOURCE)
        self.assertIn("delete(FavoriteTerm)", REPOSITORY_SOURCE)

    def test_status_term_validation_is_a_single_in_query(self):
        self.assertIn("async def get_existing_term_ids", REPOSITORY_SOURCE)
        self.assertIn("select(Term.id).where(Term.id.in_(term_ids))", REPOSITORY_SOURCE)
