"""
Read-only rollout checks for the materialized Tests catalog.

This module deliberately exposes SQLAlchemy ``SELECT`` statements and pure
comparison logic only.  Rollout operators may run them against a separately
approved connection; importing or testing this module never mutates a DB.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from sqlalchemy import Select, distinct, func, select

from src.tests.catalog_stats import CATALOG_STATS_SCHEMA, canonical_catalog_fingerprint
from src.tests.models import (
    TestCatalogGeneration,
    TestCatalogStat,
    TestCatalogState,
    TestQuestion,
)
from src.topics.models import TopicCode, TopicMapping


@dataclass(frozen=True, slots=True)
class CatalogParityComparison:
    expected_schema_version: int
    published_schema_version: int
    published_fingerprint: str
    live_fingerprint: str
    published_total: int
    live_total: int
    published_chapter_counts: dict[int, int]
    live_chapter_counts: dict[int, int]

    @property
    def matches(self) -> bool:
        return (
            self.expected_schema_version == self.published_schema_version
            and self.published_fingerprint == self.live_fingerprint
            and self.published_total == self.live_total
            and self.published_chapter_counts == self.live_chapter_counts
        )

    @property
    def mismatches(self) -> tuple[str, ...]:
        errors: list[str] = []
        if self.expected_schema_version != self.published_schema_version:
            errors.append("schema_version")
        if self.published_fingerprint != self.live_fingerprint:
            errors.append("source_fingerprint")
        if self.published_total != self.live_total:
            errors.append("published_total")
        if self.published_chapter_counts != self.live_chapter_counts:
            errors.append("chapter_counts")
        return tuple(errors)


def published_catalog_query() -> Select:
    """Read the current pointer, generation metadata, and all stat rows."""
    return (
        select(
            TestCatalogGeneration.schema_version,
            TestCatalogGeneration.source_fingerprint,
            TestCatalogStat.chapter_id,
            TestCatalogStat.active_question_count,
        )
        .select_from(TestCatalogState)
        .join(
            TestCatalogGeneration,
            TestCatalogGeneration.id == TestCatalogState.current_generation_id,
        )
        .join(TestCatalogStat, TestCatalogStat.generation_id == TestCatalogGeneration.id)
        .where(TestCatalogState.id == 1)
    )


def live_catalog_counts_query() -> Select:
    """Count distinct active questions reachable through topic mappings."""
    return (
        select(
            TopicCode.chapter_id,
            func.count(distinct(TestQuestion.id)).label("active_question_count"),
        )
        .select_from(TestQuestion)
        .join(TopicMapping, TopicMapping.topic_id == TestQuestion.topic_id)
        .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
        .where(TestQuestion.active.is_(True), TopicCode.chapter_id.is_not(None))
        .group_by(TopicCode.chapter_id)
    )


def live_catalog_fingerprint_query() -> Select:
    """Return source rows needed to calculate the canonical fingerprint."""
    return (
        select(
            TestQuestion.source_key,
            TestQuestion.active,
            TestQuestion.topic_id,
            TopicCode.chapter_id,
        )
        .select_from(TestQuestion)
        .outerjoin(TopicMapping, TopicMapping.topic_id == TestQuestion.topic_id)
        .outerjoin(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
        .order_by(TestQuestion.source_key, TopicCode.chapter_id)
    )


def normalize_live_catalog_rows(
    rows: Iterable[tuple[str, bool, int | None, int | None | Iterable[int]]],
) -> list[tuple[str, bool, int | None, tuple[int, ...]]]:
    """Group one row per mapping into publisher-compatible canonical rows."""
    grouped: dict[str, tuple[bool, int | None, set[int]]] = {}
    for source_key, active, topic_id, chapter_value in rows:
        key = str(source_key)
        current = grouped.setdefault(key, (bool(active), topic_id, set()))
        if current[0] != bool(active) or current[1] != topic_id:
            message = f"Conflicting eligibility attributes for source_key={key!r}"
            raise ValueError(message)
        if chapter_value is None:
            continue
        if isinstance(chapter_value, int):
            current[2].add(int(chapter_value))
        else:
            current[2].update(int(chapter_id) for chapter_id in chapter_value if chapter_id is not None)
    return [
        (source_key, active, topic_id, tuple(sorted(chapters)))
        for source_key, (active, topic_id, chapters) in sorted(grouped.items())
    ]


async def read_live_catalog_rows(session) -> list[tuple[str, bool, int | None, tuple[int, ...]]]:
    """Execute the fingerprint SELECT and normalize duplicate mapping rows."""
    result = await session.execute(live_catalog_fingerprint_query())
    return normalize_live_catalog_rows(result.all())


def compare_catalog_parity(  # noqa: PLR0913 - explicit rollout contract fields
    *,
    published_schema_version: int,
    published_fingerprint: str,
    published_total: int,
    published_chapter_counts: dict[int, int],
    live_rows: Iterable[tuple[str, bool, int | None, Iterable[int]]],
    expected_schema_version: int = CATALOG_STATS_SCHEMA,
) -> CatalogParityComparison:
    """Compare published values with exact live aggregates and fingerprint."""
    rows = normalize_live_catalog_rows(live_rows)
    active_reachable = [row for row in rows if bool(row[1]) and tuple(row[3])]
    live_keys = {str(row[0]) for row in active_reachable}
    live_chapter_keys: dict[int, set[str]] = {}
    for source_key, _active, _topic_id, chapters in active_reachable:
        for chapter_id in chapters:
            live_chapter_keys.setdefault(int(chapter_id), set()).add(str(source_key))
    return CatalogParityComparison(
        expected_schema_version=expected_schema_version,
        published_schema_version=int(published_schema_version),
        published_fingerprint=str(published_fingerprint),
        live_fingerprint=canonical_catalog_fingerprint(rows, schema_version=expected_schema_version),
        published_total=int(published_total),
        live_total=len(live_keys),
        published_chapter_counts=dict(published_chapter_counts),
        live_chapter_counts={chapter_id: len(keys) for chapter_id, keys in live_chapter_keys.items()},
    )


build_catalog_parity_queries = (published_catalog_query, live_catalog_counts_query, live_catalog_fingerprint_query)
