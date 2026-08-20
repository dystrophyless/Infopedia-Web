# ruff: noqa: PT009, PT027
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

from src.tests.catalog import QuestionBankContract, SourceSpec, load_question_bank
from src.tests.models import TestCatalogGeneration, TestCatalogStat, TestCatalogState
from src.tests.question_bank_builder import build_question_bank
from src.tests.question_loader import (
    load_test_questions,
    resolve_topic_ids,
    seed_question_bank,
    upsert_question_options,
)


class CatalogStatsContractTests(unittest.TestCase):
    def test_stats_models_are_versioned_and_have_partial_uniqueness(self):
        self.assertIn("schema_version", TestCatalogGeneration.__table__.columns)
        self.assertIn("source_fingerprint", TestCatalogGeneration.__table__.columns)
        self.assertIn("current_generation_id", TestCatalogState.__table__.columns)
        self.assertIn("chapter_id", TestCatalogStat.__table__.columns)
        self.assertIn("active_question_count", TestCatalogStat.__table__.columns)
        self.assertTrue(TestCatalogStat.__table__.columns["chapter_id"].nullable)
        self.assertTrue(
            any(index.unique for index in TestCatalogStat.__table__.indexes)
        )


def _contract() -> QuestionBankContract:
    return QuestionBankContract(
        source_specs=(SourceSpec("sample_questions.json", "Publisher: 7-сынып", 1),),
        unmatched_topic_groups=frozenset(),
        question_count=1,
        inactive_question_count=0,
    )


def _artifact(tmp_path: Path) -> Path:
    source_dir = tmp_path / "source"
    source_dir.mkdir()
    (source_dir / "sample_questions.json").write_text(
        json.dumps(
            {
                "book": "Publisher: 7-сынып",
                "topics": [
                    {
                        "topic": "Exact topic",
                        "questions": [
                            {
                                "question": "Question",
                                "first_option": "A",
                                "second_option": "B",
                                "third_option": "C",
                                "forth_option": "D",
                                "correct_option": 1,
                                "difficulty": "easy",
                                "explanation": "Explanation",
                            },
                        ],
                    },
                ],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    structure = tmp_path / "newStructure.json"
    structure.write_text(
        json.dumps(
            {
                "Publisher: 7-сынып": {
                    "topics": [{"title": "Exact topic", "code_name": []}]
                }
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    artifact = build_question_bank(source_dir, structure, contract=_contract())
    path = tmp_path / "questions.json"
    path.write_text(json.dumps(artifact, ensure_ascii=False), encoding="utf-8")
    return path


class QuestionBankCatalogTests(unittest.TestCase):
    def test_empty_or_malformed_bank_aborts(self):
        for content in ("", " \n\t", "{not-json"):
            with (
                self.subTest(content=content),
                tempfile.TemporaryDirectory() as directory,
            ):
                path = Path(directory) / "questions.json"
                path.write_text(content, encoding="utf-8")

                with self.assertRaises(ValueError):
                    load_question_bank(path, contract=_contract())

    def test_question_content_and_metadata_changes_do_not_abort_validation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = _artifact(Path(directory))
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["source_sha256"] = "changed"
            payload["questions"][0]["prompt"] = "Tampered"
            payload["questions"][0]["source_key"] = "manually-edited-question"
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

            entries = load_question_bank(path, contract=_contract())

        self.assertEqual(entries[0].prompt, "Tampered")

    def test_unknown_fields_and_chapter_fields_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = _artifact(Path(directory))
            payload = json.loads(path.read_text(encoding="utf-8"))
            payload["questions"][0]["chapter_id"] = 1
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "fields"):
                load_question_bank(path, contract=_contract())

    def test_valid_bank_returns_topic_scoped_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            entries = load_question_bank(
                _artifact(Path(directory)), contract=_contract()
            )

        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0].book_key, "Publisher: 7-сынып")
        self.assertEqual(entries[0].topic_title, "Exact topic")
        self.assertTrue(entries[0].active)
        self.assertEqual(
            entries[0].options[0],
            {"ref": "1", "label": "A", "text": "A", "correct": True},
        )


class _NeverMutateSession:
    def __init__(self):
        self.executed = 0
        self.commits = 0

    async def execute(self, _statement):
        self.executed += 1
        raise AssertionError("Malformed artifacts must abort before database access")

    async def commit(self):
        self.commits += 1


class _RowsResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows

    def scalars(self):
        return self

    def unique(self):
        return self


class _LoaderSession:
    def __init__(self, result_rows):
        self.result_rows = list(result_rows)
        self.added = []
        self.commits = 0
        self.rollbacks = 0

    async def execute(self, _statement):
        return _RowsResult(self.result_rows.pop(0))

    def add(self, value):
        self.added.append(value)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


class QuestionBankLoaderTests(unittest.IsolatedAsyncioTestCase):
    async def test_terms_wrapper_rolls_back_owned_transaction_on_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "terms.json"
            path.write_text(
                json.dumps({"Term": {"Publisher: 7-сынып": []}}, ensure_ascii=False),
                encoding="utf-8",
            )

            class FailingSession:
                def __init__(self):
                    self.rollbacks = 0

                async def execute(self, _statement):
                    raise RuntimeError("terms failure")

                async def rollback(self):
                    self.rollbacks += 1

            from src.loader import load_terms_from_json

            session = FailingSession()
            with self.assertRaisesRegex(RuntimeError, "terms failure"):
                await load_terms_from_json(session, object(), path)

        self.assertEqual(session.rollbacks, 1)

    async def test_malformed_artifact_aborts_before_database_access(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "questions.json"
            path.write_text("{malformed", encoding="utf-8")
            session = _NeverMutateSession()

            with self.assertRaises(ValueError):
                await load_test_questions(session, path, contract=_contract())

        self.assertEqual(session.executed, 0)
        self.assertEqual(session.commits, 0)

    async def test_option_upsert_preserves_existing_rows_in_place(self):
        existing_a = SimpleNamespace(
            id=101, source_ref="1", label="old", text="old", is_correct=False
        )
        stale = SimpleNamespace(
            id=102, source_ref="stale", label="S", text="stale", is_correct=False
        )
        question = SimpleNamespace(options=[existing_a, stale])
        entry = SimpleNamespace(
            options=(
                {"ref": "1", "label": "A", "text": "updated", "correct": True},
                {"ref": "2", "label": "B", "text": "new", "correct": False},
            ),
        )

        upsert_question_options(question, entry)

        self.assertIs(question.options[0], existing_a)
        self.assertEqual(existing_a.id, 101)
        self.assertEqual(
            (existing_a.label, existing_a.text, existing_a.is_correct),
            ("A", "updated", True),
        )
        self.assertEqual([option.source_ref for option in question.options], ["1", "2"])

    async def test_exact_allowlisted_unmatched_topic_resolves_to_null(self):
        entries = load_question_bank(
            _artifact(Path(self._tmp.name)), contract=_contract()
        )
        unmatched = SimpleNamespace(
            **entries[0].__dict__
            if hasattr(entries[0], "__dict__")
            else {
                field: getattr(entries[0], field)
                for field in entries[0].__dataclass_fields__
            },
        )
        unmatched.topic_title = "Missing"
        session = _LoaderSession([[]])

        resolved = await resolve_topic_ids(
            session,
            [unmatched],
            unmatched_topic_groups={("Publisher: 7-сынып", "Missing", 1)},
        )

        self.assertEqual(resolved, {("Publisher", 7, "Missing"): None})

    async def test_seed_commits_all_rows_once_after_exact_topic_resolution(self):
        entries = load_question_bank(
            _artifact(Path(self._tmp.name)), contract=_contract()
        )
        session = _LoaderSession(
            [
                [("Publisher", 7, "Exact topic", 42)],
                [],
            ],
        )

        loaded = await seed_question_bank(session, entries, unmatched_topic_groups=())

        self.assertEqual(loaded, 1)
        self.assertEqual(session.commits, 1)
        self.assertEqual(session.rollbacks, 0)
        self.assertEqual(len(session.added), 1)
        self.assertEqual(session.added[0].topic_id, 42)

    async def asyncSetUp(self):
        self._tmp = tempfile.TemporaryDirectory()

    async def asyncTearDown(self):
        self._tmp.cleanup()


if __name__ == "__main__":
    unittest.main()
