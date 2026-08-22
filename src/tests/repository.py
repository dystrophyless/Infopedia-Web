from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC

from sqlalchemy import Integer, Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.tests.catalog_stats import CATALOG_STATS_SCHEMA
from src.tests.errors import TestCatalogNotReadyError, TestCatalogStaleError
from src.tests.models import (
    TestAttempt,
    TestAttemptAnswer,
    TestAttemptQuestion,
    TestCatalogGeneration,
    TestCatalogStat,
    TestCatalogState,
    TestQuestion,
)
from src.topics.models import Chapter, Topic, TopicCode, TopicMapping


def _question_load_options():
    return (
        selectinload(TestQuestion.options),
        selectinload(TestQuestion.topic)
        .selectinload(Topic.topic_codes)
        .selectinload(TopicCode.chapter)
        .selectinload(Chapter.translations),
    )


def eligible_chapters(question: TestQuestion | object) -> list[Chapter]:
    topic = getattr(question, "topic", None)
    chapters_by_id: dict[int, Chapter] = {}
    for topic_code in getattr(topic, "topic_codes", ()) or ():
        chapter = getattr(topic_code, "chapter", None)
        if chapter is not None:
            chapters_by_id[int(chapter.id)] = chapter
    return [chapters_by_id[chapter_id] for chapter_id in sorted(chapters_by_id)]


def questions_statement(*, chapter_ids: Sequence[int] | None = None) -> Select:
    statement = (
        select(TestQuestion)
        .join(Topic, TestQuestion.topic_id == Topic.id)
        .join(TopicMapping, TopicMapping.topic_id == Topic.id)
        .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
        .join(Chapter, Chapter.id == TopicCode.chapter_id)
        .where(TestQuestion.active.is_(True))
        .distinct()
        .order_by(TestQuestion.source_key.asc(), TestQuestion.id.asc())
    )
    if chapter_ids is not None:
        statement = statement.where(Chapter.id.in_(list(chapter_ids)))
    return statement


def question_counts_by_chapter_statement() -> Select:
    return (
        select(Chapter.id, func.count(func.distinct(TestQuestion.id)))
        .select_from(TestQuestion)
        .join(Topic, TestQuestion.topic_id == Topic.id)
        .join(TopicMapping, TopicMapping.topic_id == Topic.id)
        .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
        .join(Chapter, Chapter.id == TopicCode.chapter_id)
        .where(TestQuestion.active.is_(True))
        .group_by(Chapter.id)
    )


async def get_attempt_for_update(
    session: AsyncSession,
    *,
    attempt_id: int,
    user_id: int,
) -> TestAttempt | None:
    result = await session.execute(
        select(TestAttempt)
        .options(selectinload(TestAttempt.questions).selectinload(TestAttemptQuestion.answer))
        .where(TestAttempt.id == attempt_id, TestAttempt.user_id == user_id)
        .with_for_update(),
    )
    return result.scalar_one_or_none()


async def get_attempt(
    session: AsyncSession,
    *,
    attempt_id: int,
    user_id: int,
) -> TestAttempt | None:
    result = await session.execute(
        select(TestAttempt)
        .options(selectinload(TestAttempt.questions).selectinload(TestAttemptQuestion.answer))
        .where(TestAttempt.id == attempt_id, TestAttempt.user_id == user_id),
    )
    return result.scalar_one_or_none()


async def get_attempt_question_for_update(
    session: AsyncSession,
    *,
    attempt_id: int,
    question_id: int,
) -> TestAttemptQuestion | None:
    result = await session.execute(
        select(TestAttemptQuestion)
        .options(selectinload(TestAttemptQuestion.answer))
        .where(TestAttemptQuestion.attempt_id == attempt_id, TestAttemptQuestion.question_id == question_id)
        .with_for_update(),
    )
    return result.scalar_one_or_none()


async def lock_attempt_questions(session: AsyncSession, *, attempt_id: int) -> list[TestAttemptQuestion]:
    result = await session.execute(
        select(TestAttemptQuestion)
        .where(TestAttemptQuestion.attempt_id == attempt_id)
        .order_by(TestAttemptQuestion.ordinal.asc())
        .with_for_update(),
    )
    return list(result.scalars().all())


async def list_questions(
    session: AsyncSession,
    *,
    chapter_ids: Sequence[int] | None = None,
) -> list[TestQuestion]:
    result = await session.execute(
        questions_statement(chapter_ids=chapter_ids).options(*_question_load_options()),
    )
    return list(result.scalars().unique().all())


async def list_chapters(session: AsyncSession, *, locale: str) -> list[Chapter]:
    result = await session.execute(
        select(Chapter)
        .options(selectinload(Chapter.translations))
        .order_by(Chapter.id.asc()),
    )
    chapters = list(result.scalars().unique().all())
    for chapter in chapters:
        translations = {item.locale: item.title for item in chapter.translations}
        chapter.title = translations.get(locale) or translations.get("kk") or chapter.code
    return chapters


async def question_counts_by_chapter(session: AsyncSession) -> dict[int, int]:
    result = await session.execute(question_counts_by_chapter_statement())
    return {chapter_id: int(count) for chapter_id, count in result.all()}


async def list_completed_attempts(session: AsyncSession, *, user_id: int) -> list[TestAttempt]:
    result = await session.execute(
        select(TestAttempt)
        .options(selectinload(TestAttempt.questions).selectinload(TestAttemptQuestion.answer))
        .where(
            TestAttempt.user_id == user_id,
            TestAttempt.status == "completed",
            TestAttempt.completed_at.is_not(None),
        )
        .order_by(TestAttempt.completed_at.desc(), TestAttempt.id.desc()),
    )
    return list(result.scalars().unique().all())


def previous_completed_attempt_statement(
    *,
    user_id: int,
    mode: str,
    exclude_attempt_id: int,
) -> Select:
    return (
        select(TestAttempt)
        .where(
            TestAttempt.user_id == user_id,
            TestAttempt.mode == mode,
            TestAttempt.status == "completed",
            TestAttempt.completed_at.is_not(None),
            TestAttempt.id != exclude_attempt_id,
        )
        .order_by(TestAttempt.completed_at.desc(), TestAttempt.id.desc())
        .limit(1)
    )


async def get_previous_completed_attempt(
    session: AsyncSession,
    *,
    user_id: int,
    mode: str,
    exclude_attempt_id: int,
) -> TestAttempt | None:
    result = await session.execute(
        previous_completed_attempt_statement(
            user_id=user_id,
            mode=mode,
            exclude_attempt_id=exclude_attempt_id,
        ),
    )
    return result.scalar_one_or_none()


def dashboard_history_statement(*, user_id: int) -> Select:
    """Return immutable per-question answer rows for one user's completed attempts."""
    return (
        select(
            TestAttempt.id.label("attempt_id"),
            TestAttempt.completed_at.label("completed_at"),
            TestAttempt.mode.label("mode"),
            TestAttempt.chapter_id.label("attempt_chapter_id"),
            TestAttemptQuestion.chapter_id.label("chapter_id"),
            TestAttemptAnswer.awarded_weight.label("awarded_weight"),
        )
        .select_from(TestAttempt)
        .join(TestAttemptQuestion, TestAttemptQuestion.attempt_id == TestAttempt.id)
        .outerjoin(TestAttemptAnswer, TestAttemptAnswer.attempt_question_id == TestAttemptQuestion.id)
        .where(
            TestAttempt.user_id == user_id,
            TestAttempt.status == "completed",
            TestAttempt.completed_at.is_not(None),
        )
        .order_by(TestAttempt.completed_at.desc(), TestAttempt.id.desc(), TestAttemptQuestion.ordinal.asc())
    )


def dashboard_recent_statement(*, user_id: int) -> Select:
    return (
        select(
            TestAttempt.id.label("id"),
            TestAttempt.mode.label("mode"),
            TestAttempt.title.label("title"),
            TestAttempt.completed_at.label("completed_at"),
        )
        .where(
            TestAttempt.user_id == user_id,
            TestAttempt.status == "completed",
            TestAttempt.completed_at.is_not(None),
        )
        .order_by(TestAttempt.completed_at.desc(), TestAttempt.id.desc())
        .limit(3)
    )


def dashboard_catalog_snapshot_statement(*, weak_chapter_ids: Sequence[int] = ()) -> Select:
    """Read the singleton pointer, immutable generation, stats and one weak pool count."""
    weak_ids = tuple(sorted({int(chapter_id) for chapter_id in weak_chapter_ids}))
    if weak_ids:
        weak_count = (
            select(func.count(func.distinct(TestQuestion.id)))
            .select_from(TestQuestion)
            .join(TopicMapping, TopicMapping.topic_id == TestQuestion.topic_id)
            .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
            .where(
                TestQuestion.active.is_(True),
                TopicCode.chapter_id.in_(weak_ids),
            )
            .scalar_subquery()
        )
    else:
        weak_count = select(func.cast(0, Integer)).scalar_subquery()
    return (
        select(
            TestCatalogState.current_generation_id.label("current_generation_id"),
            TestCatalogGeneration.id.label("generation_id"),
            TestCatalogGeneration.schema_version.label("schema_version"),
            TestCatalogGeneration.source_fingerprint.label("source_fingerprint"),
            TestCatalogGeneration.refreshed_at.label("refreshed_at"),
            TestCatalogStat.chapter_id.label("chapter_id"),
            TestCatalogStat.active_question_count.label("active_question_count"),
            weak_count.label("weak_question_count"),
        )
        .select_from(TestCatalogState)
        .outerjoin(
            TestCatalogGeneration,
            TestCatalogGeneration.id == TestCatalogState.current_generation_id,
        )
        .outerjoin(
            TestCatalogStat,
            TestCatalogStat.generation_id == TestCatalogGeneration.id,
        )
        .where(TestCatalogState.id == 1)
    )


def _row_value(row: object, key: str, index: int) -> object:
    if hasattr(row, "_mapping"):
        mapping = getattr(row, "_mapping", {})
        if key in mapping:
            return mapping[key]
    try:
        return row[index]  # type: ignore[index]
    except (IndexError, KeyError, TypeError):
        return getattr(row, key, None)


def _validate_catalog_rows(rows: Sequence[object]) -> dict[str, object]:  # noqa: C901, PLR0912
    if not rows:
        raise TestCatalogNotReadyError
    current_generation_id = _row_value(rows[0], "current_generation_id", 0)
    generation_id = _row_value(rows[0], "generation_id", 1)
    if current_generation_id is None:
        raise TestCatalogNotReadyError
    raw_schema_version = _row_value(rows[0], "schema_version", 2)
    if isinstance(raw_schema_version, bool):
        raise TestCatalogStaleError("Catalog generation metadata is stale")
    if isinstance(raw_schema_version, int):
        schema_version = raw_schema_version
    elif isinstance(raw_schema_version, str) and raw_schema_version and all(
        "0" <= char <= "9" for char in raw_schema_version
    ):
        try:
            schema_version = int(raw_schema_version)
        except ValueError as exc:
            raise TestCatalogStaleError("Catalog generation metadata is stale") from exc
    else:
        raise TestCatalogStaleError("Catalog generation metadata is stale")
    fingerprint = _row_value(rows[0], "source_fingerprint", 3)
    refreshed_at = _row_value(rows[0], "refreshed_at", 4)
    if generation_id is None:
        raise TestCatalogStaleError("Catalog pointer references a missing generation")
    if schema_version != CATALOG_STATS_SCHEMA or not fingerprint or refreshed_at is None:
        raise TestCatalogStaleError("Catalog generation metadata is stale")
    chapter_counts: dict[int, int] = {}
    total_count: int | None = None
    for row in rows:
        chapter_id = _row_value(row, "chapter_id", 5)
        raw_count = _row_value(row, "active_question_count", 6)
        if raw_count is None:
            continue
        try:
            count = int(raw_count)
        except (TypeError, ValueError) as exc:
            raise TestCatalogStaleError("Catalog stats contain a non-numeric count") from exc
        if count < 0:
            raise TestCatalogStaleError("Catalog stats contain a negative count")
        if chapter_id is None:
            total_count = count
        else:
            chapter_counts[int(chapter_id)] = count
    if total_count is None:
        raise TestCatalogStaleError("Catalog stats are incomplete")
    weak_count = _row_value(rows[0], "weak_question_count", 7)
    return {
        "schema_version": int(schema_version),
        "generation_id": int(generation_id),
        "refreshed_at": refreshed_at if getattr(refreshed_at, "tzinfo", None) else refreshed_at.replace(tzinfo=UTC),
        "total_count": total_count,
        "chapter_counts": chapter_counts,
        "weak_question_count": int(weak_count or 0),
    }


async def read_dashboard_snapshot(
    session: AsyncSession,
    *,
    user_id: int,
    weak_chapter_ids: Sequence[int] = (),
) -> dict[str, object]:
    """Bounded read model for the feature-flagged dashboard path."""
    history = await read_dashboard_history(session, user_id=user_id)
    catalog = await read_dashboard_catalog_snapshot(
        session,
        weak_chapter_ids=weak_chapter_ids,
    )
    return {**history, "catalog": catalog}


async def read_dashboard_history(session: AsyncSession, *, user_id: int) -> dict[str, list[dict[str, object]]]:
    history_result = await session.execute(dashboard_history_statement(user_id=user_id))
    history = [
        {
            "attempt_id": _row_value(row, "attempt_id", 0),
            "completed_at": _row_value(row, "completed_at", 1),
            "mode": _row_value(row, "mode", 2),
            "attempt_chapter_id": _row_value(row, "attempt_chapter_id", 3),
            "chapter_id": _row_value(row, "chapter_id", 4),
            "awarded_weight": _row_value(row, "awarded_weight", 5),
        }
        for row in history_result.all()
    ]
    recent_result = await session.execute(dashboard_recent_statement(user_id=user_id))
    recent = [
        {
            "id": _row_value(row, "id", 0),
            "mode": _row_value(row, "mode", 1),
            "title": _row_value(row, "title", 2),
            "completed_at": _row_value(row, "completed_at", 3),
        }
        for row in recent_result.all()
    ]
    return {"history": history, "recent": recent}


async def read_dashboard_catalog_snapshot(
    session: AsyncSession,
    *,
    weak_chapter_ids: Sequence[int] = (),
) -> dict[str, object]:
    catalog_result = await session.execute(
        dashboard_catalog_snapshot_statement(weak_chapter_ids=weak_chapter_ids),
    )
    return _validate_catalog_rows(catalog_result.all())


# Explicit aliases keep the reader name discoverable to callers and tests.
read_tests_dashboard_snapshot = read_dashboard_snapshot
tests_dashboard_snapshot = read_dashboard_snapshot
