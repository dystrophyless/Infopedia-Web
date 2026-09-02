import unittest
from unittest.mock import patch

from sqlalchemy.dialects import postgresql

from src.terms.models import Term
from src.terms.repository import get_related_terms, related_term_ids_statement


class _ScalarResult:
    def __init__(self, terms):
        self._terms = terms

    def scalars(self):
        return self

    def all(self):
        return self._terms


class _Session:
    def __init__(self, results):
        self.results = iter(results)
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _ScalarResult(next(self.results))


class RelatedTermRepositoryTests(unittest.IsolatedAsyncioTestCase):
    def test_candidate_ids_are_unique_same_topic_and_exclude_current(self):
        sql = str(
            related_term_ids_statement(topic_id=7, current_term_id=11)
            .compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}),
        ).lower()

        self.assertIn("select distinct definition.term_id", sql)
        self.assertIn("definition.topic_id = 7", sql)
        self.assertIn("definition.term_id != 11", sql)

    async def test_samples_full_candidate_list_and_restores_sampled_order(self):
        candidates = [2, 3, 4, 5]
        hydrated = [
            Term(id=2, name="B"),
            Term(id=4, name="D"),
            Term(id=5, name="E"),
        ]
        session = _Session([candidates, hydrated])

        with patch("random.sample", return_value=[5, 2, 4]) as sample:
            result = await get_related_terms(session, topic_id=7, current_term_id=11)

        sample.assert_called_once_with(candidates, k=3)
        self.assertEqual([term.id for term in result], [5, 2, 4])
        self.assertEqual(len(session.statements), 2)
        sql = [
            str(
                statement.compile(
                    dialect=postgresql.dialect(),
                    compile_kwargs={"literal_binds": True},
                ),
            ).lower()
            for statement in session.statements
        ]
        self.assertIn("select distinct definition.term_id", sql[0])
        self.assertNotIn("order by random()", sql[0])
        self.assertNotIn("order by random()", sql[1])
        self.assertIn("term.id in (5, 2, 4)", sql[1])

    async def test_empty_candidates_return_without_sampling_or_hydration(self):
        session = _Session([[]])

        with patch("random.sample") as sample:
            result = await get_related_terms(session, topic_id=7, current_term_id=11)

        self.assertEqual(result, [])
        sample.assert_not_called()
        self.assertEqual(len(session.statements), 1)

    async def test_single_candidate_is_sampled_with_k_one(self):
        candidates = [2]
        terms = [Term(id=2, name="B")]
        session = _Session([candidates, terms])

        with patch("random.sample", return_value=[2]) as sample:
            result = await get_related_terms(session, topic_id=7, current_term_id=11)

        sample.assert_called_once_with(candidates, k=1)
        self.assertEqual([term.id for term in result], [2])

    async def test_fewer_than_three_candidates_are_all_sampled(self):
        candidates = [2, 3]
        terms = [Term(id=3, name="C"), Term(id=2, name="B")]
        session = _Session([candidates, terms])

        with patch("random.sample", return_value=[2, 3]) as sample:
            result = await get_related_terms(session, topic_id=7, current_term_id=11)

        sample.assert_called_once_with(candidates, k=2)
        self.assertEqual([term.id for term in result], [2, 3])

    async def test_exactly_three_candidates_are_sampled_with_k_three(self):
        candidates = [2, 3, 4]
        terms = [
            Term(id=2, name="B"),
            Term(id=3, name="C"),
            Term(id=4, name="D"),
        ]
        session = _Session([candidates, terms])

        with patch("random.sample", return_value=[4, 2, 3]) as sample:
            result = await get_related_terms(session, topic_id=7, current_term_id=11)

        sample.assert_called_once_with(candidates, k=3)
        self.assertEqual([term.id for term in result], [4, 2, 3])

    async def test_missing_hydrated_candidate_is_filtered_in_sampled_order(self):
        candidates = [2, 3, 4]
        hydrated = [Term(id=2, name="B"), Term(id=4, name="D")]
        session = _Session([candidates, hydrated])

        with patch("random.sample", return_value=[4, 3, 2]):
            result = await get_related_terms(session, topic_id=7, current_term_id=11)

        self.assertEqual([term.id for term in result], [4, 2])
