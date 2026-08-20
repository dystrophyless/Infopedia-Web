from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from collections import Counter
from pathlib import Path
from typing import Any

from src.tests.catalog import (
    PRODUCTION_QUESTION_BANK_CONTRACT,
    QUESTION_BANK_SCHEMA,
    QuestionBankContract,
    canonical_json_bytes,
    canonical_sha256,
    validate_question_bank_payload,
)

SOURCE_QUESTION_FIELDS = {
    "question",
    "first_option",
    "second_option",
    "third_option",
    "forth_option",
    "correct_option",
    "difficulty",
    "explanation",
}
OPTION_FIELDS = ("first_option", "second_option", "third_option", "forth_option")


def _load_json(path: Path, label: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        message = f"Malformed {label} at {path}: {exc}"
        raise ValueError(message) from exc


def _trimmed(value: object, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        message = f"{label} must be a non-empty string"
        raise ValueError(message)
    return value.strip()


def _source_key_payload(  # noqa: PLR0913
    *,
    book_key: str,
    topic_title: str,
    prompt: str,
    difficulty: str,
    explanation: str | None,
    options: list[dict[str, object]],
) -> dict[str, object]:
    return {
        "schema": QUESTION_BANK_SCHEMA,
        "book_key": book_key,
        "topic_title": topic_title,
        "prompt": prompt,
        "difficulty": difficulty,
        "explanation": explanation,
        "options": options,
    }


def _question_record(
    raw: object,
    *,
    book_key: str,
    topic_title: str,
    index: int,
) -> tuple[dict[str, object], bytes]:
    if not isinstance(raw, dict) or set(raw) != SOURCE_QUESTION_FIELDS:
        message = f"Question {book_key}/{topic_title}/{index} fields do not match the source contract"
        raise ValueError(message)
    prompt = _trimmed(raw["question"], "Question prompt")
    difficulty = _trimmed(raw["difficulty"], "Question difficulty")
    explanation_raw = raw["explanation"]
    explanation = (
        _trimmed(explanation_raw, "Question explanation")
        if explanation_raw is not None
        else None
    )
    correct_option = raw["correct_option"]
    if type(correct_option) is not int or correct_option not in {1, 2, 3, 4}:
        message = (
            f"Question {book_key}/{topic_title}/{index} correct_option must be 1..4"
        )
        raise ValueError(message)

    options: list[dict[str, object]] = []
    for option_index, field in enumerate(OPTION_FIELDS, start=1):
        options.append(
            {
                "ref": str(option_index),
                "label": chr(64 + option_index),
                "text": _trimmed(raw[field], f"Question option {option_index}"),
                "correct": option_index == correct_option,
            },
        )
    active = len({option["text"] for option in options}) == len(OPTION_FIELDS)
    canonical = canonical_json_bytes(
        _source_key_payload(
            book_key=book_key,
            topic_title=topic_title,
            prompt=prompt,
            difficulty=difficulty,
            explanation=explanation,
            options=options,
        ),
    )
    return (
        {
            "book_key": book_key,
            "topic_title": topic_title,
            "prompt": prompt,
            "difficulty": difficulty,
            "explanation": explanation,
            "active": active,
            "options": options,
        },
        canonical,
    )


def build_question_bank(  # noqa: C901, PLR0912, PLR0915
    source_dir: str | Path,
    structure_path: str | Path,
    *,
    contract: QuestionBankContract = PRODUCTION_QUESTION_BANK_CONTRACT,
) -> dict[str, object]:
    source_root = Path(source_dir)
    structure = _load_json(Path(structure_path), "newStructure.json")
    if not isinstance(structure, dict):
        raise ValueError("newStructure.json must be an object")  # noqa: TRY004
    expected_books = {spec.book_key for spec in contract.source_specs}
    if set(structure) != expected_books:
        raise ValueError("newStructure.json books do not match the source allowlist")

    expected_paths = {spec.relative_path for spec in contract.source_specs}
    actual_paths = {
        path.relative_to(source_root).as_posix()
        for path in source_root.rglob("*_questions.json")
        if path.is_file()
    }
    if actual_paths != expected_paths:
        message = (
            "Question source files do not match the allowlist: "
            f"missing={sorted(expected_paths - actual_paths)}, extra={sorted(actual_paths - expected_paths)}"
        )
        raise ValueError(message)

    source_payloads: list[dict[str, object]] = []
    questions: list[dict[str, object]] = []
    unmatched_counts: Counter[tuple[str, str]] = Counter()
    occurrences: Counter[str] = Counter()
    books_manifest: list[dict[str, object]] = []
    for spec in contract.source_specs:
        path = source_root / Path(spec.relative_path)
        payload = _load_json(path, "question source")
        if not isinstance(payload, dict) or set(payload) != {"book", "topics"}:
            message = f"Question source {spec.relative_path} fields do not match the source contract"
            raise ValueError(message)
        if payload["book"] != spec.book_key:
            message = f"Question source {spec.relative_path} book does not match the allowlist"
            raise ValueError(message)
        topics = payload["topics"]
        if not isinstance(topics, list):
            message = f"Question source {spec.relative_path} topics must be a list"
            raise ValueError(message)  # noqa: TRY004
        structure_book = structure[spec.book_key]
        if not isinstance(structure_book, dict) or not isinstance(
            structure_book.get("topics"), list
        ):
            message = f"newStructure.json book {spec.book_key} is malformed"
            raise ValueError(message)  # noqa: TRY004
        structure_topics = {
            item.get("title")
            for item in structure_book["topics"]
            if isinstance(item, dict) and isinstance(item.get("title"), str)
        }

        source_question_count = 0
        for topic_index, raw_topic in enumerate(topics):
            if not isinstance(raw_topic, dict) or set(raw_topic) != {
                "topic",
                "questions",
            }:
                message = f"Topic {spec.relative_path}/{topic_index} fields do not match the source contract"
                raise ValueError(message)
            topic_title = _trimmed(raw_topic["topic"], "Source topic title")
            raw_questions = raw_topic["questions"]
            if not isinstance(raw_questions, list) or not raw_questions:
                message = f"Topic {spec.relative_path}/{topic_title} questions must be non-empty"
                raise ValueError(message)
            if topic_title not in structure_topics:
                unmatched_counts[(spec.book_key, topic_title)] += len(raw_questions)
            for question_index, raw_question in enumerate(raw_questions, start=1):
                record, canonical = _question_record(
                    raw_question,
                    book_key=spec.book_key,
                    topic_title=topic_title,
                    index=question_index,
                )
                digest = hashlib.sha256(canonical).hexdigest()
                occurrences[digest] += 1
                record = {
                    "source_key": f"{QUESTION_BANK_SCHEMA}:{digest}:{occurrences[digest]:04d}",
                    **record,
                }
                questions.append(record)
                source_question_count += 1
        if source_question_count != spec.question_count:
            message = (
                f"Question source {spec.relative_path} count drifted: "
                f"expected={spec.question_count}, actual={source_question_count}"
            )
            raise ValueError(message)
        source_payloads.append(
            {"relative_path": spec.relative_path, "payload": payload}
        )
        books_manifest.append(
            {
                "relative_path": spec.relative_path,
                "book_key": spec.book_key,
                "question_count": source_question_count,
            },
        )

    actual_unmatched = frozenset(
        (book_key, topic_title, count)
        for (book_key, topic_title), count in unmatched_counts.items()
    )
    if actual_unmatched != contract.unmatched_topic_groups:
        message = (
            "Exact unmatched topic groups drifted from the allowlist: "
            f"expected={sorted(contract.unmatched_topic_groups)}, actual={sorted(actual_unmatched)}"
        )
        raise ValueError(message)
    inactive_count = sum(not bool(question["active"]) for question in questions)
    artifact: dict[str, object] = {
        "schema": QUESTION_BANK_SCHEMA,
        "source_sha256": canonical_sha256(source_payloads),
        "questions_sha256": canonical_sha256(questions),
        "question_count": len(questions),
        "active_question_count": len(questions) - inactive_count,
        "inactive_question_count": inactive_count,
        "books": books_manifest,
        "unmatched_topic_groups": [
            {"book_key": book_key, "topic_title": topic_title, "question_count": count}
            for book_key, topic_title, count in sorted(actual_unmatched)
        ],
        "questions": questions,
    }
    validate_question_bank_payload(artifact, contract=contract)
    return artifact


def write_question_bank_atomic(
    source_dir: str | Path,
    structure_path: str | Path,
    output_path: str | Path,
    *,
    contract: QuestionBankContract = PRODUCTION_QUESTION_BANK_CONTRACT,
) -> dict[str, object]:
    artifact = build_question_bank(source_dir, structure_path, contract=contract)
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb",
            prefix=f".{destination.name}.",
            suffix=".tmp",
            dir=destination.parent,
            delete=False,
        ) as temporary:
            temporary.write(canonical_json_bytes(artifact))
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_path = Path(temporary.name)
        temporary_path.replace(destination)
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
    return artifact


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the canonical Infopedia qbank:v1 artifact"
    )
    parser.add_argument("--source-dir", required=True, type=Path)
    parser.add_argument("--structure", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    artifact = write_question_bank_atomic(args.source_dir, args.structure, args.output)
    print(
        json.dumps(
            {
                "output": str(args.output),
                "question_count": artifact["question_count"],
                "active_question_count": artifact["active_question_count"],
                "questions_sha256": artifact["questions_sha256"],
            },
            ensure_ascii=False,
        ),
    )


if __name__ == "__main__":
    main()
