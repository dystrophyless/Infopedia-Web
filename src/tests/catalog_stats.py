"""Atomic, versioned materialization of public Tests catalog counts."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.tests.models import (
    TestCatalogGeneration,
    TestCatalogStat,
    TestCatalogState,
    TestQuestion,
)
from src.topics.models import TopicCode, TopicMapping

CATALOG_STATS_SCHEMA = 1
_LOCK_KEY = "infopedia.tests.catalog.stats"


def canonical_catalog_fingerprint(
    rows: Iterable[tuple[str, bool, int | None, Iterable[int]]],
    *,
    schema_version: int = CATALOG_STATS_SCHEMA,
) -> str:
    """Hash canonical source-key/active/topic/reachable-chapter tuples."""
    payload = [
        {
            "source_key": str(source_key),
            "active": bool(active),
            "topic_id": topic_id,
            "chapter_ids": sorted({int(chapter_id) for chapter_id in chapter_ids}),
        }
        for source_key, active, topic_id, chapter_ids in rows
    ]
    payload.sort(key=lambda item: (item["source_key"], json.dumps(item, sort_keys=True)))
    encoded = json.dumps(
        {"schema_version": schema_version, "rows": payload},
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


@dataclass(frozen=True, slots=True)
class CatalogStatsPublication:
    generation_id: int
    source_fingerprint: str
    total_count: int
    chapter_counts: dict[int, int]
    changed: bool

    @property
    def active_question_count(self) -> int:
        return self.total_count


async def _lock_publication(session: AsyncSession) -> None:
    bind = session.get_bind()
    if getattr(getattr(bind, "dialect", None), "name", None) == "postgresql":
        await session.execute(text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"), {"lock_key": _LOCK_KEY})


async def _next_sqlite_id(session: AsyncSession, model: type[object]) -> int | None:
    """Provide BigInteger primary keys on SQLite, which lacks sequence semantics."""
    bind = session.get_bind()
    if getattr(getattr(bind, "dialect", None), "name", None) != "sqlite":
        return None
    result = await session.execute(select(func.max(model.id)))
    return int(result.scalar_one() or 0) + 1


async def _reachable_rows(session: AsyncSession) -> list[tuple[str, bool, int | None, tuple[int, ...]]]:
    chapter_ids = select(TopicMapping.topic_id, TopicCode.chapter_id).join(
        TopicCode, TopicCode.id == TopicMapping.topic_code_id,
    ).where(TopicCode.chapter_id.is_not(None)).distinct().subquery()
    query = (
        select(TestQuestion.source_key, TestQuestion.active, TestQuestion.topic_id, chapter_ids.c.chapter_id)
        .outerjoin(chapter_ids, chapter_ids.c.topic_id == TestQuestion.topic_id)
        .order_by(TestQuestion.source_key, chapter_ids.c.chapter_id)
    )
    result = await session.execute(query)
    grouped: dict[str, tuple[bool, int | None, set[int]]] = {}
    for source_key, active, topic_id, chapter_id in result.all():
        current = grouped.setdefault(str(source_key), (bool(active), topic_id, set()))
        if chapter_id is not None:
            current[2].add(int(chapter_id))
    return [
        (source_key, active, topic_id, tuple(sorted(chapters)))
        for source_key, (active, topic_id, chapters) in grouped.items()
    ]


async def publish_test_catalog_stats(
    session: AsyncSession,
    *,
    schema_version: int = CATALOG_STATS_SCHEMA,
    source_fingerprint: str | None = None,
    refreshed_at: datetime | None = None,
) -> CatalogStatsPublication:
    """
    Publish one generation and atomically advance the singleton pointer.

    This core intentionally never commits or rolls back; callers own the transaction.
    """
    await _lock_publication(session)
    rows = await _reachable_rows(session)
    fingerprint = source_fingerprint or canonical_catalog_fingerprint(rows, schema_version=schema_version)
    active_reachable = [row for row in rows if row[1] and row[3]]
    chapter_counts: defaultdict[int, set[str]] = defaultdict(set)
    total_keys: set[str] = set()
    for source_key, _active, _topic_id, chapters in active_reachable:
        total_keys.add(source_key)
        for chapter_id in chapters:
            chapter_counts[chapter_id].add(source_key)
    counts = {chapter_id: len(keys) for chapter_id, keys in chapter_counts.items()}
    total_count = len(total_keys)

    state = (await session.execute(
        select(TestCatalogState).where(TestCatalogState.id == 1).with_for_update(),
    )).scalar_one_or_none()
    current = None
    if state and state.current_generation_id is not None:
        current = await session.get(TestCatalogGeneration, state.current_generation_id)
    if current and current.schema_version == schema_version and current.source_fingerprint == fingerprint:
        existing_result = await session.execute(
            select(TestCatalogStat.chapter_id, TestCatalogStat.active_question_count).where(
                TestCatalogStat.generation_id == current.id,
            ),
        )
        existing_rows = existing_result.all()
        existing_counts = {chapter_id: count for chapter_id, count in existing_rows if chapter_id is not None}
        existing_total = next((count for chapter_id, count in existing_rows if chapter_id is None), total_count)
        return CatalogStatsPublication(current.id, fingerprint, int(existing_total), existing_counts, False)

    generation = TestCatalogGeneration(
        schema_version=schema_version,
        source_fingerprint=fingerprint,
        refreshed_at=refreshed_at or datetime.now(UTC),
    )
    generation.id = await _next_sqlite_id(session, TestCatalogGeneration)
    session.add(generation)
    await session.flush()
    next_stat_id = await _next_sqlite_id(session, TestCatalogStat)
    stat_rows = [TestCatalogStat(
        id=None if next_stat_id is None else next_stat_id,
        generation_id=generation.id,
        chapter_id=None,
        active_question_count=total_count,
    )]
    for chapter_id, count in sorted(counts.items()):
        if next_stat_id is not None:
            next_stat_id += 1
        stat_rows.append(TestCatalogStat(
            id=next_stat_id,
            generation_id=generation.id,
            chapter_id=chapter_id,
            active_question_count=count,
        ))
    session.add_all(stat_rows)
    if state is None:
        state = TestCatalogState(id=1, current_generation_id=generation.id)
        session.add(state)
    else:
        state.current_generation_id = generation.id
    await session.flush()
    return CatalogStatsPublication(generation.id, fingerprint, total_count, counts, True)


publish_catalog_stats = publish_test_catalog_stats
backfill_test_catalog_stats = publish_test_catalog_stats
publish_tests_catalog_stats = publish_test_catalog_stats
publish_catalog_generation = publish_test_catalog_stats
publish_test_catalog_generation = publish_test_catalog_stats
refresh_test_catalog_stats = publish_test_catalog_stats
