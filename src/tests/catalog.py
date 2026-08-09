from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from src.data import DATA_DIR

QUESTIONS_PATH = DATA_DIR / "questions.json"
QUESTION_BANK_SCHEMA = "qbank:v1"
OPTION_COUNT = 4


@dataclass(frozen=True, slots=True)
class SourceSpec:
    relative_path: str
    book_key: str
    question_count: int


EXPECTED_UNMATCHED_TOPIC_GROUPS = frozenset(
    {
        ("Арман-ПВ: 10-сынып", "Пайдаланылған әдебиеттер", 15),
        (
            "Арман-ПВ: 8-сынып",
            "§12. Кірістірілген функциялар_ мәтіндік және логикалық функциялар",
            15,
        ),
        ("Алматыкітап: 9-сынып", "5.2. Артық фон мен ойын кейіпкерлері", 15),
    },
)


@dataclass(frozen=True, slots=True)
class QuestionBankContract:
    source_specs: tuple[SourceSpec, ...]
    unmatched_topic_groups: frozenset[tuple[str, str, int]]
    question_count: int
    inactive_question_count: int


PRODUCTION_QUESTION_BANK_CONTRACT = QuestionBankContract(
    source_specs=(
        SourceSpec("10almaty/10almaty_questions.json", "Алматыкітап: 10-сынып", 825),
        SourceSpec("10arman/10arman_questions.json", "Арман-ПВ: 10-сынып", 675),
        SourceSpec("10atamura/10atamura_questions.json", "Атамұра: 10-сынып", 615),
        SourceSpec("11almaty/11almaty_questions.json", "Алматыкітап: 11-сынып", 570),
        SourceSpec("11arman/11arman_questions.json", "Арман-ПВ: 11-сынып", 540),
        SourceSpec("11atamura/11atamura_questions.json", "Атамұра: 11-сынып", 360),
        SourceSpec("7almaty/7almaty_questions.json", "Алматыкітап: 7-сынып", 450),
        SourceSpec("7arman/7arman_questions.json", "Арман-ПВ: 7-сынып", 480),
        SourceSpec("7atamura/7atamura_questions.json", "Атамұра: 7-сынып", 360),
        SourceSpec("8almaty/8almaty_questions.json", "Алматыкітап: 8-сынып", 420),
        SourceSpec("8arman/8arman_questions.json", "Арман-ПВ: 8-сынып", 465),
        SourceSpec("8atamura/8atamura_questions.json", "Атамұра: 8-сынып", 285),
        SourceSpec("9almaty/9almaty_questions.json", "Алматыкітап: 9-сынып", 495),
        SourceSpec("9arman/9arman_questions.json", "Арман-ПВ: 9-сынып", 455),
        SourceSpec("9atamura/9atamura_questions.json", "Атамұра: 9-сынып", 330),
    ),
    unmatched_topic_groups=EXPECTED_UNMATCHED_TOPIC_GROUPS,
    question_count=7_325,
    inactive_question_count=10,
)


@dataclass(frozen=True, slots=True)
class QuestionBankEntry:
    source_key: str
    book_key: str
    topic_title: str
    prompt: str
    difficulty: str
    explanation: str | None
    active: bool
    options: tuple[dict[str, Any], ...]


TOP_LEVEL_FIELDS = {
    "schema",
    "source_sha256",
    "questions_sha256",
    "question_count",
    "active_question_count",
    "inactive_question_count",
    "books",
    "unmatched_topic_groups",
    "questions",
}
QUESTION_FIELDS = {
    "source_key",
    "book_key",
    "topic_title",
    "prompt",
    "difficulty",
    "explanation",
    "active",
    "options",
}
OPTION_FIELDS = {"ref", "label", "text", "correct"}
BOOK_FIELDS = {"relative_path", "book_key", "question_count"}
UNMATCHED_FIELDS = {"book_key", "topic_title", "question_count"}
SOURCE_KEY_RE = re.compile(r"^qbank:v1:[0-9a-f]{64}:[0-9]{4}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def canonical_json_bytes(value: object) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def canonical_sha256(value: object) -> str:
    return hashlib.sha256(canonical_json_bytes(value)).hexdigest()


def _exact_fields(value: object, fields: set[str], label: str) -> dict[str, Any]:
    if not isinstance(value, dict) or set(value) != fields:
        actual = sorted(value) if isinstance(value, dict) else type(value).__name__
        message = f"{label} fields do not match the qbank:v1 contract: {actual}"
        raise ValueError(message)
    return value


def _nonempty_string(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip() or value != value.strip():
        message = f"{label} must be a trimmed non-empty string"
        raise ValueError(message)
    return value


def _expected_books(contract: QuestionBankContract) -> list[dict[str, object]]:
    return [
        {
            "relative_path": spec.relative_path,
            "book_key": spec.book_key,
            "question_count": spec.question_count,
        }
        for spec in contract.source_specs
    ]


def _expected_unmatched(contract: QuestionBankContract) -> list[dict[str, object]]:
    return [
        {"book_key": book_key, "topic_title": topic_title, "question_count": count}
        for book_key, topic_title, count in sorted(contract.unmatched_topic_groups)
    ]


def validate_question_bank_payload(  # noqa: C901, PLR0912, PLR0915
    payload: object,
    *,
    contract: QuestionBankContract = PRODUCTION_QUESTION_BANK_CONTRACT,
) -> list[QuestionBankEntry]:
    root = _exact_fields(payload, TOP_LEVEL_FIELDS, "Question bank")
    if root["schema"] != QUESTION_BANK_SCHEMA:
        raise ValueError("Question bank schema must be qbank:v1")
    if not isinstance(root["source_sha256"], str) or not SHA256_RE.fullmatch(root["source_sha256"]):
        raise ValueError("Question bank source_sha256 must be a lowercase SHA-256 digest")
    if root["books"] != _expected_books(contract):
        raise ValueError("Question bank books do not match the source allowlist")
    if root["unmatched_topic_groups"] != _expected_unmatched(contract):
        raise ValueError("Question bank unmatched topics do not match the exact allowlist")

    questions = root["questions"]
    if not isinstance(questions, list):
        raise ValueError("Question bank questions must be a list")  # noqa: TRY004
    if root["question_count"] != contract.question_count or len(questions) != contract.question_count:
        raise ValueError("Question bank question count drifted from the allowlist")
    if root["inactive_question_count"] != contract.inactive_question_count:
        raise ValueError("Question bank inactive count drifted from the allowlist")
    expected_active = contract.question_count - contract.inactive_question_count
    if root["active_question_count"] != expected_active:
        raise ValueError("Question bank active count drifted from the allowlist")
    allowed_books = {spec.book_key for spec in contract.source_specs}
    entries: list[QuestionBankEntry] = []
    source_keys: set[str] = set()
    book_counts: Counter[str] = Counter()
    topic_counts: Counter[tuple[str, str]] = Counter()
    inactive_count = 0
    for index, raw_question in enumerate(questions):
        question = _exact_fields(raw_question, QUESTION_FIELDS, f"Question {index}")
        source_key = _nonempty_string(question["source_key"], f"Question {index} source_key")
        if not SOURCE_KEY_RE.fullmatch(source_key):
            message = f"Question {index} source_key is not a qbank:v1 canonical key"
            raise ValueError(message)
        if source_key in source_keys:
            raise ValueError("Question bank contains duplicate source_key values")
        source_keys.add(source_key)
        book_key = _nonempty_string(question["book_key"], f"Question {index} book_key")
        if book_key not in allowed_books:
            message = f"Question {index} book_key is outside the allowlist"
            raise ValueError(message)
        topic_title = _nonempty_string(question["topic_title"], f"Question {index} topic_title")
        prompt = _nonempty_string(question["prompt"], f"Question {index} prompt")
        difficulty = _nonempty_string(question["difficulty"], f"Question {index} difficulty")
        explanation = question["explanation"]
        if explanation is not None:
            explanation = _nonempty_string(explanation, f"Question {index} explanation")
        if type(question["active"]) is not bool:
            message = f"Question {index} active must be a boolean"
            raise ValueError(message)

        raw_options = question["options"]
        if not isinstance(raw_options, list) or len(raw_options) != OPTION_COUNT:
            message = f"Question {index} must contain exactly four options"
            raise ValueError(message)
        options: list[dict[str, Any]] = []
        for option_index, raw_option in enumerate(raw_options, start=1):
            option = _exact_fields(raw_option, OPTION_FIELDS, f"Question {index} option {option_index}")
            expected_ref = str(option_index)
            expected_label = chr(64 + option_index)
            if option["ref"] != expected_ref or option["label"] != expected_label:
                message = f"Question {index} option ordering drifted"
                raise ValueError(message)
            text = _nonempty_string(option["text"], f"Question {index} option {option_index} text")
            if type(option["correct"]) is not bool:
                message = f"Question {index} option correctness must be boolean"
                raise ValueError(message)
            options.append(
                {
                    "ref": expected_ref,
                    "label": expected_label,
                    "text": text,
                    "correct": option["correct"],
                },
            )
        if sum(option["correct"] for option in options) != 1:
            message = f"Question {index} must contain exactly one correct option"
            raise ValueError(message)

        active = question["active"]
        inactive_count += int(not active)
        book_counts[book_key] += 1
        topic_counts[(book_key, topic_title)] += 1
        entries.append(
            QuestionBankEntry(
                source_key=source_key,
                book_key=book_key,
                topic_title=topic_title,
                prompt=prompt,
                difficulty=difficulty,
                explanation=explanation,
                active=active,
                options=tuple(options),
            ),
        )

    if inactive_count != contract.inactive_question_count:
        raise ValueError("Question bank inactive records do not match the manifest")
    if root["questions_sha256"] != canonical_sha256(questions):
        raise ValueError("Question bank questions checksum mismatch")
    expected_book_counts = {spec.book_key: spec.question_count for spec in contract.source_specs}
    if dict(book_counts) != expected_book_counts:
        raise ValueError("Question bank per-book counts drifted from the allowlist")
    for book_key, topic_title, expected_count in contract.unmatched_topic_groups:
        if topic_counts[(book_key, topic_title)] != expected_count:
            raise ValueError("Question bank unmatched group counts drifted from the allowlist")
    return entries


def load_question_bank(
    path: str | Path = QUESTIONS_PATH,
    *,
    contract: QuestionBankContract = PRODUCTION_QUESTION_BANK_CONTRACT,
) -> list[QuestionBankEntry]:
    raw = Path(path).read_text(encoding="utf-8")
    if not raw.strip():
        raise ValueError("Question bank is empty")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        message = f"Malformed question bank: {exc}"
        raise ValueError(message) from exc
    return validate_question_bank_payload(payload, contract=contract)
