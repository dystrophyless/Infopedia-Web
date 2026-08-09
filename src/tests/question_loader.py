from __future__ import annotations

from collections.abc import Collection
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.loader import parse_book_key
from src.tests.catalog import (
    EXPECTED_UNMATCHED_TOPIC_GROUPS,
    PRODUCTION_QUESTION_BANK_CONTRACT,
    QUESTIONS_PATH,
    QuestionBankContract,
    QuestionBankEntry,
    load_question_bank,
)
from src.tests.catalog_stats import publish_test_catalog_generation
from src.tests.models import TestQuestion, TestQuestionOption
from src.topics.models import Book, Topic


def _in_outer_transaction(session: AsyncSession) -> bool:
    try:
        return bool(session.in_transaction())
    except (AttributeError, TypeError):
        return False


def _entry_topic_key(entry: QuestionBankEntry) -> tuple[str, int, str]:
    publisher, grade = parse_book_key(entry.book_key)
    return publisher, grade, entry.topic_title


async def resolve_topic_ids(
    session: AsyncSession,
    entries: Collection[QuestionBankEntry],
    *,
    unmatched_topic_groups: Collection[tuple[str, str, int]] = EXPECTED_UNMATCHED_TOPIC_GROUPS,
) -> dict[tuple[str, int, str], int | None]:
    unmatched_keys = {
        (*parse_book_key(book_key), topic_title)
        for book_key, topic_title, _count in unmatched_topic_groups
    }
    requested_keys = {_entry_topic_key(entry) for entry in entries}
    keys_to_resolve = requested_keys - unmatched_keys
    result = await session.execute(
        select(Book.publisher, Book.grade, Topic.name, Topic.id)
        .join(Topic, Topic.book_id == Book.id),
    )
    resolved = {
        (str(publisher), int(grade), str(topic_title)): int(topic_id)
        for publisher, grade, topic_title, topic_id in result.all()
        if (str(publisher), int(grade), str(topic_title)) in keys_to_resolve
    }
    missing = keys_to_resolve - set(resolved)
    if missing:
        message = f"Question bank topic mapping drifted; exact DB topics are missing: {sorted(missing)}"
        raise ValueError(message)
    return {**resolved, **dict.fromkeys(requested_keys & unmatched_keys)}


def upsert_question_options(question: TestQuestion | object, entry: QuestionBankEntry | object) -> None:
    existing_by_ref = {
        str(option.source_ref): option
        for option in list(getattr(question, "options", ()))
    }
    desired_refs: list[str] = []
    ordered_options: list[TestQuestionOption | object] = []
    for raw_option in entry.options:
        source_ref = str(raw_option["ref"])
        desired_refs.append(source_ref)
        option = existing_by_ref.get(source_ref)
        if option is None:
            option = TestQuestionOption(source_ref=source_ref)
        option.label = str(raw_option["label"])
        option.text = str(raw_option["text"])
        option.is_correct = bool(raw_option["correct"])
        ordered_options.append(option)
    question.options[:] = ordered_options
    if len(desired_refs) != len(set(desired_refs)):
        message = f"Question {entry.source_key!r} contains duplicate option refs"
        raise ValueError(message)


async def seed_question_bank(
    session: AsyncSession,
    entries: list[QuestionBankEntry],
    *,
    unmatched_topic_groups: Collection[tuple[str, str, int]] = EXPECTED_UNMATCHED_TOPIC_GROUPS,
    manage_transaction: bool = True,
) -> int:
    owns_transaction = manage_transaction and not _in_outer_transaction(session)
    if not entries:
        raise ValueError("Question bank must not be empty")

    try:
        topic_ids = await resolve_topic_ids(
            session,
            entries,
            unmatched_topic_groups=unmatched_topic_groups,
        )
        result = await session.execute(
            select(TestQuestion).options(selectinload(TestQuestion.options)),
        )
        existing_by_key = {
            question.source_key: question
            for question in result.scalars().unique().all()
        }
        incoming_keys = {entry.source_key for entry in entries}
        for question in existing_by_key.values():
            if question.source_key not in incoming_keys:
                question.active = False

        for entry in entries:
            topic_id = topic_ids[_entry_topic_key(entry)]
            question = existing_by_key.get(entry.source_key)
            if question is None:
                question = TestQuestion(source_key=entry.source_key)
                session.add(question)
            question.topic_id = topic_id
            question.prompt = entry.prompt
            question.explanation = entry.explanation
            question.active = entry.active
            upsert_question_options(question, entry)
        if owns_transaction and hasattr(session, "get_bind"):
            await publish_test_catalog_generation(session)
        if owns_transaction:
            await session.commit()
    except Exception:
        if owns_transaction:
            await session.rollback()
        raise
    return len(entries)


async def load_test_questions(
    session: AsyncSession,
    path: str | Path = QUESTIONS_PATH,
    *,
    contract: QuestionBankContract = PRODUCTION_QUESTION_BANK_CONTRACT,
    manage_transaction: bool = True,
) -> int:
    owns_transaction = manage_transaction and not _in_outer_transaction(session)
    entries = load_question_bank(path, contract=contract)
    try:
        loaded = await seed_question_bank(
            session,
            entries,
            unmatched_topic_groups=contract.unmatched_topic_groups,
            manage_transaction=False if owns_transaction else manage_transaction,
        )
        if owns_transaction and hasattr(session, "get_bind"):
            await publish_test_catalog_generation(session)
        if owns_transaction:
            await session.commit()
    except Exception:
        if owns_transaction:
            await session.rollback()
        raise
    return loaded


async def seed_question_bank_core(
    session: AsyncSession,
    entries: list[QuestionBankEntry],
    *,
    unmatched_topic_groups: Collection[tuple[str, str, int]] = EXPECTED_UNMATCHED_TOPIC_GROUPS,
) -> int:
    return await seed_question_bank(
        session,
        entries,
        unmatched_topic_groups=unmatched_topic_groups,
        manage_transaction=False,
    )


async def load_test_questions_core(
    session: AsyncSession,
    path: str | Path = QUESTIONS_PATH,
    *,
    contract: QuestionBankContract = PRODUCTION_QUESTION_BANK_CONTRACT,
) -> int:
    return await load_test_questions(session, path, contract=contract, manage_transaction=False)
