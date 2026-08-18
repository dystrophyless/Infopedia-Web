# ruff: noqa: PT009, PT027
from __future__ import annotations

import json
import re
import tempfile
import unittest
from pathlib import Path

from src.tests.catalog import (
    EXPECTED_UNMATCHED_TOPIC_GROUPS,
    PRODUCTION_QUESTION_BANK_CONTRACT,
    QuestionBankContract,
    SourceSpec,
    load_question_bank,
)
from src.tests.question_bank_builder import (
    build_question_bank,
    write_question_bank_atomic,
)

ROOT = Path(__file__).resolve().parents[1]


def _question(*, prompt: str = "Question", options: tuple[str, ...] = ("A", "B", "C", "D")) -> dict:
    return {
        "question": prompt,
        "first_option": options[0],
        "second_option": options[1],
        "third_option": options[2],
        "forth_option": options[3],
        "correct_option": 2,
        "difficulty": "easy",
        "explanation": "Because.",
    }


def _fixture_contract() -> QuestionBankContract:
    return QuestionBankContract(
        source_specs=(SourceSpec("book/book_questions.json", "Publisher: 7-сынып", 3),),
        unmatched_topic_groups=frozenset({("Publisher: 7-сынып", "Missing", 1)}),
        question_count=3,
        inactive_question_count=1,
    )


def _write_fixture_tree(tmp_path: Path) -> tuple[Path, Path]:
    source_dir = tmp_path / "source"
    source_file = source_dir / "book" / "book_questions.json"
    source_file.parent.mkdir(parents=True)
    payload = {
        "book": "Publisher: 7-сынып",
        "topics": [
            {"topic": "Matched", "questions": [_question(), _question()]},
            {"topic": "Missing", "questions": [_question(options=("x", "x", "y", "z"))]},
        ],
    }
    source_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    structure_path = tmp_path / "newStructure.json"
    structure_path.write_text(
        json.dumps(
            {
                "Publisher: 7-сынып": {
                    "topics": [{"title": "Matched", "code_name": ["7.1.1.1 goal"]}],
                },
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return source_dir, structure_path


class QuestionBankBuilderTests(unittest.TestCase):
    def test_builder_uses_canonical_hash_keys_occurrence_suffix_and_no_chapter_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            source_dir, structure_path = _write_fixture_tree(Path(directory))

            artifact = build_question_bank(source_dir, structure_path, contract=_fixture_contract())

        first_key, second_key = (item["source_key"] for item in artifact["questions"][:2])
        first_prefix, first_occurrence = first_key.rsplit(":", 1)
        second_prefix, second_occurrence = second_key.rsplit(":", 1)
        self.assertEqual(first_prefix, second_prefix)
        self.assertEqual((first_occurrence, second_occurrence), ("0001", "0002"))
        self.assertTrue(first_key.startswith("qbank:v1:"))
        self.assertFalse(artifact["questions"][2]["active"])
        self.assertEqual(
            artifact["unmatched_topic_groups"],
            [{"book_key": "Publisher: 7-сынып", "topic_title": "Missing", "question_count": 1}],
        )
        self.assertNotIn("chapter", json.dumps(artifact["questions"], ensure_ascii=False).casefold())

    def test_builder_rejects_unallowlisted_source_files(self):
        with tempfile.TemporaryDirectory() as directory:
            source_dir, structure_path = _write_fixture_tree(Path(directory))
            extra = source_dir / "extra_questions.json"
            extra.write_text("{}", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "allowlist"):
                build_question_bank(source_dir, structure_path, contract=_fixture_contract())

    def test_atomic_writer_keeps_previous_artifact_when_build_fails(self):
        with tempfile.TemporaryDirectory() as directory:
            source_dir, structure_path = _write_fixture_tree(Path(directory))
            output = Path(directory) / "questions.json"
            output.write_text("previous", encoding="utf-8")
            source_file = source_dir / "book" / "book_questions.json"
            source_file.write_text("{malformed", encoding="utf-8")

            with self.assertRaisesRegex(ValueError, "Malformed"):
                write_question_bank_atomic(source_dir, structure_path, output, contract=_fixture_contract())

            self.assertEqual(output.read_text(encoding="utf-8"), "previous")

    def test_generated_production_artifact_has_revised_contract_counts_and_checksum(self):
        entries = load_question_bank(ROOT / "src" / "data" / "questions.json")

        self.assertEqual(len(entries), PRODUCTION_QUESTION_BANK_CONTRACT.question_count)
        self.assertEqual(len(entries), 7_325)
        self.assertEqual(sum(entry.active for entry in entries), 7_315)
        self.assertEqual(sum(not entry.active for entry in entries), 10)
        self.assertEqual(
            EXPECTED_UNMATCHED_TOPIC_GROUPS,
            frozenset(
                {
                    ("Арман-ПВ: 10-сынып", "Пайдаланылған әдебиеттер", 15),
                    ("Арман-ПВ: 8-сынып", "§12. Кірістірілген функциялар_ мәтіндік және логикалық функциялар", 15),
                    ("Алматыкітап: 9-сынып", "5.2. Артық фон мен ойын кейіпкерлері", 15),
                },
            ),
        )

    def test_generated_artifact_has_expected_distinct_and_per_chapter_eligibility_counts(self):
        entries = load_question_bank(ROOT / "src" / "data" / "questions.json")
        structure = json.loads((ROOT / "src" / "data" / "newStructure.json").read_text(encoding="utf-8"))
        mapping = json.loads((ROOT / "src" / "data" / "mappingStructure.json").read_text(encoding="utf-8"))
        code_pattern = re.compile(r"(?<!\d)(\d+(?:\.\d+){3})(?!\d)")
        chapter_by_code = {
            match.group(1): chapter
            for chapter, rows in mapping.items()
            for row in rows
            for goal in row.get("lessonGoals", [])
            if (match := code_pattern.search(goal))
        }
        chapters_by_topic = {}
        for book_key, book in structure.items():
            for topic in book["topics"]:
                raw_codes = topic.get("code_name") or []
                if isinstance(raw_codes, str):
                    raw_codes = [raw_codes]
                chapters_by_topic[(book_key, topic["title"])] = {
                    chapter_by_code[code]
                    for value in raw_codes
                    for code in code_pattern.findall(value)
                    if code in chapter_by_code
                }

        memberships = [
            chapters_by_topic.get((entry.book_key, entry.topic_title), set())
            for entry in entries
        ]
        distinct_raw = sum(bool(chapters) for chapters in memberships)
        chapter_links_raw = sum(map(len, memberships))
        distinct_active = sum(entry.active and bool(chapters) for entry, chapters in zip(entries, memberships, strict=True))
        chapter_links_active = sum(
            len(chapters) if entry.active else 0
            for entry, chapters in zip(entries, memberships, strict=True)
        )

        self.assertEqual((distinct_raw, chapter_links_raw), (4_935, 4_995))
        self.assertEqual((distinct_active, chapter_links_active), (4_930, 4_990))


if __name__ == "__main__":
    unittest.main()
