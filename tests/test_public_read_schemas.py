import os
import unittest
from types import SimpleNamespace

from src.terms.schemas import TermDetailedResponse


class PublicReadSchemasTest(unittest.TestCase):
    def test_public_read_schemas_emit_public_ids_and_hide_internal_ids(self):
        os.environ["SECRET_KEY"] = "schema-test-secret"
        book = SimpleNamespace(id=4, publisher="Publisher", grade=7)
        topic = SimpleNamespace(
            id=3,
            name="Topic",
            page_start=1,
            page_end=20,
            book=book,
        )
        definition = SimpleNamespace(
            id=7,
            text="Definition text",
            page=5,
            topic=topic,
        )
        term = SimpleNamespace(id=21, name="Term", definitions=[definition])

        payload = TermDetailedResponse.model_validate(term).model_dump()

        self.assertNotIn("id", payload)
        self.assertTrue(payload["public_id"].startswith("term_"))
        self.assertNotIn("21", payload["public_id"])

        definition_payload = payload["definitions"][0]
        self.assertNotIn("id", definition_payload)
        self.assertTrue(definition_payload["public_id"].startswith("definition_"))

        topic_payload = definition_payload["topic"]
        self.assertNotIn("id", topic_payload)
        self.assertTrue(topic_payload["public_id"].startswith("topic_"))

        book_payload = topic_payload["book"]
        self.assertNotIn("id", book_payload)
        self.assertTrue(book_payload["public_id"].startswith("book_"))
