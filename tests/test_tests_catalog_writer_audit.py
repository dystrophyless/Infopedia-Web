# ruff: noqa: PT009, N815
"""Static audit for every production writer that can change Tests eligibility.

The audit intentionally uses Python's AST instead of raw-text grep.  A new
mutation must either be routed through an allowlisted transaction-aware symbol
or fail with the source path and symbol that needs review.
"""

from __future__ import annotations

import ast
import re
import tempfile
import unittest
from pathlib import Path

from sqlalchemy.dialects import postgresql, sqlite

import src.models  # noqa: F401 - register all ORM relationships before compiling selects
from src.tests.catalog_rollout import (
    build_catalog_parity_queries,
    compare_catalog_parity,
    normalize_live_catalog_rows,
    read_live_catalog_rows,
)
from src.tests.catalog_stats import canonical_catalog_fingerprint

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "src"
MUTABLE_FIELDS = {"active", "topic_id", "chapter_id", "topic_code_id"}
MODEL_NAMES = {"TestQuestion", "TopicMapping", "TopicCode"}
TABLE_NAMES = ("test_question", "topic_mapping", "topic_code")
PROPAGATOR_NAMES = {
    "load_chapters_and_topic_codes",
    "load_chapters_and_topic_codes_core",
    "load_books_topics_and_mappings",
    "load_books_topics_and_mappings_core",
    "seed_question_bank",
    "seed_question_bank_core",
    "load_test_questions",
    "load_test_questions_core",
}

# These helpers contain the ORM mutations, but their public wrappers own the
# transaction boundary that the audit is intended to protect. Report the
# wrapper symbol when it calls one of these known implementation helpers while
# continuing to discover any other private writer that appears in the future.
PRIVATE_WRITER_HELPERS = {
    "_load_chapters_and_topic_codes_impl",
    "_load_books_topics_and_mappings_impl",
}

# Exact symbols that are currently permitted to mutate eligibility inputs.
# Keep wrappers and migration entry-points explicit: a new writer must be
# reviewed rather than silently becoming part of the rollout contract.
ALLOWLIST = {
    "src.loader:load_chapters_and_topic_codes",
    "src.loader:load_chapters_and_topic_codes_core",
    "src.loader:load_books_topics_and_mappings",
    "src.loader:load_books_topics_and_mappings_core",
    "src.prepare_app:main.load_all",
    "src.tests.question_loader:seed_question_bank",
    "src.tests.question_loader:load_test_questions",
    "src.tests.question_loader:seed_question_bank_core",
    "src.tests.question_loader:load_test_questions_core",
}


def _module_name(path: Path, root: Path = ROOT) -> str:
    return ".".join(path.relative_to(root).with_suffix("").parts)


def _contains_model_or_table(node: ast.AST) -> bool:
    text = ast.unparse(node)
    return any(name in text for name in (*MODEL_NAMES, *TABLE_NAMES))


class _WriterVisitor(ast.NodeVisitor):
    def __init__(self, module: str) -> None:
        self.module = module
        self.scope: list[str] = []
        self.candidates: set[str] = set()

    @property
    def symbol(self) -> str:
        return f"{self.module}:{'.'.join(self.scope) or '<module>'}"

    def _mark_candidate(self) -> None:
        if self.scope and self.scope[-1] in PRIVATE_WRITER_HELPERS:
            return
        self.candidates.add(self.symbol)

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()

    visit_AsyncFunctionDef = visit_FunctionDef

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.scope.append(node.name)
        self.generic_visit(node)
        self.scope.pop()

    def visit_Assign(self, node: ast.Assign) -> None:
        for target in node.targets:
            self._inspect_target(target, node.value)
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        self._inspect_target(node.target, node.value)
        self.generic_visit(node)

    def visit_AugAssign(self, node: ast.AugAssign) -> None:
        self._inspect_target(node.target, node.value)
        self.generic_visit(node)

    def _inspect_target(self, target: ast.AST, value: ast.AST | None) -> None:
        if isinstance(target, ast.Attribute) and target.attr in MUTABLE_FIELDS:
            base = ast.unparse(target.value)
            if re.search(r"(?:question|topic|mapping|code)", base, re.IGNORECASE):
                self._mark_candidate()
        if isinstance(value, ast.Call):
            function = value.func.id if isinstance(value.func, ast.Name) else ""
            if function in MODEL_NAMES:
                self._mark_candidate()

    def visit_Call(self, node: ast.Call) -> None:
        function = ast.unparse(node.func)
        if function.rsplit(".", 1)[-1] in (*PROPAGATOR_NAMES, *PRIVATE_WRITER_HELPERS):
            self._mark_candidate()
        method = function.rsplit(".", 1)[-1]
        if method in {"add", "add_all", "delete", "execute", "bulk_insert_mappings", "bulk_update_mappings"}:
            if any(_contains_model_or_table(argument) for argument in node.args):
                self._mark_candidate()
            if method == "delete" and any(
                isinstance(argument, ast.Name) and re.search(r"(?:question|topic|mapping|code)", argument.id, re.IGNORECASE)
                for argument in node.args
            ):
                self._mark_candidate()
        if isinstance(node.func, ast.Name) and node.func.id in MODEL_NAMES:
            self._mark_candidate()
        if isinstance(node.func, ast.Name) and node.func.id == "text":
            sql = " ".join(const.value for const in ast.walk(node) if isinstance(const, ast.Constant) and isinstance(const.value, str))
            lowered = sql.lower()
            if any(table in lowered for table in TABLE_NAMES) and any(keyword in lowered for keyword in ("insert", "update", "delete", "alter", "create")):
                self._mark_candidate()
        self.generic_visit(node)

    def visit_Constant(self, node: ast.Constant) -> None:
        if isinstance(node.value, str):
            lowered = node.value.lower()
            if any(table in lowered for table in TABLE_NAMES) and any(
                keyword in lowered for keyword in ("insert", "update", "delete", "alter", "create")
            ):
                self._mark_candidate()
        self.generic_visit(node)


def discover_writer_symbols(source_root: Path = SOURCE_ROOT) -> set[str]:
    symbols: set[str] = set()
    module_root = ROOT if source_root == SOURCE_ROOT else source_root
    for path in source_root.rglob("*.py"):
        if any(part in {"__pycache__"} for part in path.parts):
            continue
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        visitor = _WriterVisitor(_module_name(path, module_root))
        visitor.visit(tree)
        symbols.update(visitor.candidates)
    return symbols


class CatalogWriterAuditTests(unittest.TestCase):
    def test_all_eligibility_writers_are_explicitly_allowlisted(self) -> None:
        discovered = discover_writer_symbols()
        unknown = sorted(discovered - ALLOWLIST)
        self.assertFalse(
            unknown,
            "Unrecognized Tests eligibility writer(s): "
            + ", ".join(unknown)
            + ". Add an exact symbol to the allowlist only after reviewing its transaction boundary.",
        )

    def test_required_transaction_aware_symbols_are_present(self) -> None:
        discovered = discover_writer_symbols()
        missing = sorted(ALLOWLIST - discovered)
        self.assertFalse(missing, "Allowlisted writer symbol(s) disappeared or no longer mutate eligibility: " + ", ".join(missing))

    def test_rollout_parity_queries_are_read_only_and_count_distinct_questions(self) -> None:
        self.assertEqual(len(build_catalog_parity_queries), 3)
        statements = [query().compile(dialect=dialect) for query in build_catalog_parity_queries for dialect in (postgresql.dialect(), sqlite.dialect())]
        rendered = "\n".join(str(statement).lower() for statement in statements)
        self.assertIn("count(distinct", rendered)
        self.assertIn("current_generation_id", rendered)
        self.assertNotRegex(rendered, r"\b(insert|update|delete|alter|create|drop)\b")

    def test_rollout_parity_compares_fingerprint_total_and_chapters(self) -> None:
        rows = [
            ("q1", True, 10, (1,)),
            ("q2", True, 11, (1, 2)),
            ("q3", False, 11, (2,)),
        ]
        fingerprint = canonical_catalog_fingerprint(rows)
        matching = compare_catalog_parity(
            published_schema_version=1,
            published_fingerprint=fingerprint,
            published_total=2,
            published_chapter_counts={1: 2, 2: 1},
            live_rows=rows,
        )
        self.assertTrue(matching.matches)
        self.assertEqual(matching.mismatches, ())

        stale = compare_catalog_parity(
            published_schema_version=1,
            published_fingerprint=fingerprint,
            published_total=1,
            published_chapter_counts={1: 1},
            live_rows=rows,
        )
        self.assertFalse(stale.matches)
        self.assertEqual(stale.mismatches, ("published_total", "chapter_counts"))

    def test_live_rows_normalize_duplicate_mapping_rows_and_null_chapters(self) -> None:
        raw_rows = [
            ("q2", True, 11, 2),
            ("q1", True, 10, 1),
            ("q2", True, 11, 1),
            ("q3", False, 12, None),
            ("q4", True, None, None),
        ]
        normalized = normalize_live_catalog_rows(raw_rows)
        self.assertEqual(
            normalized,
            [
                ("q1", True, 10, (1,)),
                ("q2", True, 11, (1, 2)),
                ("q3", False, 12, ()),
                ("q4", True, None, ()),
            ],
        )
        fingerprint = canonical_catalog_fingerprint(normalized)
        comparison = compare_catalog_parity(
            published_schema_version=1,
            published_fingerprint=fingerprint,
            published_total=2,
            published_chapter_counts={1: 2, 2: 1},
            live_rows=raw_rows,
        )
        self.assertTrue(comparison.matches)

    def test_writer_audit_reports_future_topic_mapping_writer_with_path_and_symbol(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            module = root / "future_writer.py"
            module.write_text(
                "def future_writer(mapping, code):\n    mapping.topic_code_id = code\n",
                encoding="utf-8",
            )
            discovered = discover_writer_symbols(root)
        unknown = sorted(discovered - ALLOWLIST)
        self.assertEqual(unknown, ["future_writer:future_writer"])
        message = "Unrecognized Tests eligibility writer(s): " + ", ".join(unknown)
        self.assertIn("future_writer:future_writer", message)

    def test_live_fingerprint_execution_helper_normalizes_database_rows(self) -> None:
        class Result:
            def all(self):
                return [("q", True, 1, 2), ("q", True, 1, 1)]

        class Session:
            async def execute(self, _query):
                return Result()

        import asyncio

        rows = asyncio.run(read_live_catalog_rows(Session()))
        self.assertEqual(rows, [("q", True, 1, (1, 2))])


if __name__ == "__main__":
    unittest.main()
