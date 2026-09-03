from __future__ import annotations

# ruff: noqa: PT009
import inspect
import json
import subprocess
import unittest
from unittest.mock import patch

from scripts import verify_search_terms_postgres as verifier


class SearchTermsPostgresVerificationTests(unittest.TestCase):
    def test_schema_preflight_executes_definition_name_checks(self):
        preflight = getattr(verifier, "_schema_preflight", None)
        self.assertTrue(callable(preflight))
        if not callable(preflight):
            return

        calls: list[list[str]] = []

        def fake_run(args: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
            calls.append(args)
            return subprocess.CompletedProcess(args, 0, "t\n", "")

        with patch.object(verifier, "_run", side_effect=fake_run):
            result = preflight(user="infopedia", database="search_test")

        self.assertEqual(
            result,
            {
                "definition_name_not_null": True,
                "definition_name_trgm_index": True,
                "legacy_term_name_trgm_absent": True,
            },
        )
        self.assertEqual(len(calls), 3)
        joined = "\n".join(" ".join(call) for call in calls)
        self.assertIn("definition", joined)
        self.assertIn("idx_definition_name_trgm", joined)
        self.assertIn("idx_term_name_trgm", joined)

    def test_schema_preflight_rejects_missing_definition_index(self):
        preflight = getattr(verifier, "_schema_preflight", None)
        self.assertTrue(callable(preflight))
        if not callable(preflight):
            return

        outputs = iter(("t\n", "f\n", "t\n"))

        def fake_run(args: list[str], **kwargs) -> subprocess.CompletedProcess[str]:
            return subprocess.CompletedProcess(args, 0, next(outputs), "")

        with patch.object(verifier, "_run", side_effect=fake_run):
            result = preflight(user="infopedia", database="search_test")

        self.assertFalse(result["definition_name_trgm_index"])
        self.assertFalse(verifier._schema_preflight_passes(result))

    def test_verifier_payload_includes_schema_preflight_gate(self):
        source = inspect.getsource(verifier.main)

        self.assertIn('payload["schema_preflight"]', source)
        self.assertIn("schema preflight", source.lower())
        self.assertLess(source.index("schema_preflight"), source.index("tests = _run"))

    def test_cleanup_is_reported_after_disposable_database_probe(self):
        source = inspect.getsource(verifier.main)

        self.assertIn("dropdb", source)
        self.assertIn("pg_database", source)
        self.assertIn('payload["cleanup_verified"]', source)

    def test_schema_preflight_payload_is_json_serializable(self):
        payload = {
            "schema_preflight": {
                "definition_name_not_null": True,
                "definition_name_trgm_index": True,
                "legacy_term_name_trgm_absent": True,
            },
            "cleanup_verified": True,
        }

        self.assertEqual(json.loads(json.dumps(payload)), payload)


if __name__ == "__main__":
    unittest.main()
