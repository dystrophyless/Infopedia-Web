import unittest

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
    def __init__(self, terms):
        self.terms = terms
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return _ScalarResult(self.terms)


class RelatedTermRepositoryTests(unittest.IsolatedAsyncioTestCase):
    def test_candidate_ids_are_unique_same_topic_and_exclude_current(self):
        sql = str(
            related_term_ids_statement(topic_id=7, current_term_id=11)
            .compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}),
        ).lower()

        self.assertIn("select distinct definition.term_id", sql)
        self.assertIn("definition.topic_id = 7", sql)
        self.assertIn("definition.term_id != 11", sql)

    async def test_related_terms_are_server_random_and_limited_to_three(self):
        terms = [Term(id=2, name="B"), Term(id=3, name="C")]
        session = _Session(terms)

        result = await get_related_terms(
            session,
            topic_id=7,
            current_term_id=11,
        )

        self.assertEqual(result, terms)
        sql = str(
            session.statement.compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            ),
        ).lower()
        self.assertIn("order by random()", sql)
        self.assertIn("limit 3", sql)

    async def test_empty_and_fewer_than_three_candidates_are_returned_as_is(self):
        self.assertEqual(
            await get_related_terms(_Session([]), topic_id=7, current_term_id=11),
            [],
        )
        one = [Term(id=2, name="Only")]
        self.assertEqual(
            await get_related_terms(_Session(one), topic_id=7, current_term_id=11),
            one,
        )
