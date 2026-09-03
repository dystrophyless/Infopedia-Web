# ruff: noqa: PT009
from __future__ import annotations

import inspect
import unittest
from pathlib import Path

from scripts import verify_search_terms_postgres as verifier

ROOT = Path(__file__).resolve().parents[1]


class CleanBootstrapContractTests(unittest.TestCase):
    def test_one_shot_terms_migration_module_and_package_are_removed(self):
        self.assertFalse((ROOT / "src/migrations/terms_v2.py").exists())
        self.assertFalse((ROOT / "src/migrations/__init__.py").exists())

    def test_prepare_app_bootstraps_current_terms_json_without_migration_import(self):
        source = (ROOT / "src/prepare_app.py").read_text(encoding="utf-8")
        self.assertIn('get_data_file_path("terms.json")', source)
        self.assertNotIn("src.migrations", source)
        self.assertNotIn("normalization", source.lower())
        self.assertIn("load_terms_from_json_core", source)

    def test_verifier_uses_fresh_bootstrap_and_never_restores_persistent_dump(self):
        source = inspect.getsource(verifier.main)
        self.assertIn("initialize_schema", source)
        self.assertIn("loader_readiness", source)
        self.assertIn("createdb", source)
        self.assertNotIn("pg_dump", source)
        self.assertNotIn("restore", source.lower())
        self.assertNotIn("docker run", source)
        self.assertNotIn("infopediaweb_", source)

    def test_loader_readiness_contract_does_not_load_terms_catalog(self):
        checks = getattr(verifier, "_loader_readiness_checks", None)
        self.assertTrue(callable(checks))
        self.assertNotIn("load_terms_catalog", inspect.getsource(checks))


if __name__ == "__main__":
    unittest.main()
