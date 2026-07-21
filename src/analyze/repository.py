import logging
import re

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.analyze.exceptions import UnsupportedAnalyzeDocumentError
from src.analyze.models import AnalyzeResult, AnalyzeResultItem
from src.analyze.projection import material_grades_from_topic_code_names
from src.topics.chapter_catalog import normalize_chapter
from src.topics.models import Chapter, TopicCode
from src.topics.repository import (
    resolve_chapter_by_title,
    resolve_chapter_title,
    resolve_topic_code_title,
)

logger = logging.getLogger(__name__)

_MAX_CHAPTER_DIAGNOSTIC_LENGTH = 500
_CHAPTER_LOOKUP_ALLOW_EXTENSIONS = True
_CHAPTER_LOOKUP_STRATEGY = "normalized_exact_then_extensions_then_fuzzy_92"
_CHAPTER_FALLBACK_MODES = (
    "extension,dot_segment,boundary_aware_substring,fuzzy_92"
)


def _sanitize_chapter_diagnostic(value: object) -> str:
    sanitized = "".join(
        character if character.isprintable() else " "
        for character in str(value)
    )
    sanitized = " ".join(sanitized.split())
    if not sanitized:
        return "<empty>"
    return sanitized[:_MAX_CHAPTER_DIAGNOSTIC_LENGTH]


def _chapter_lookup_diagnostic(
    exc: ValueError,
) -> tuple[str, str, str, str, str]:
    lookup_strategy = _CHAPTER_LOOKUP_STRATEGY if _CHAPTER_LOOKUP_ALLOW_EXTENSIONS else (
        "normalized_exact_then_fuzzy_92"
    )
    fallback_modes = (
        _CHAPTER_FALLBACK_MODES
        if _CHAPTER_LOOKUP_ALLOW_EXTENSIONS
        else "not_applicable"
    )
    message = str(exc)
    candidates_match = re.search(r"\bcandidates=(\d+)\b", message)
    candidates = candidates_match.group(1) if candidates_match else "unavailable"
    reason_marker = "lookup_reason="
    if reason_marker in message:
        lookup_reason = message.split(reason_marker, 1)[1].split(";", 1)[0]
        lookup_reason = lookup_reason.split(")", 1)[0]
        fallback_attempted = (
            "true"
            if lookup_reason.startswith("no_")
            or lookup_reason in {
                "ambiguous_fallback_match",
                "ambiguous_fuzzy_top_score",
            }
            else "unknown"
        )
        return (
            lookup_strategy,
            lookup_reason,
            fallback_attempted,
            fallback_modes,
            candidates,
        )
    if message.startswith("Ambiguous chapter title"):
        return (
            lookup_strategy,
            "ambiguous_match",
            "unknown",
            "not_determined",
            candidates,
        )
    if not _CHAPTER_LOOKUP_ALLOW_EXTENSIONS:
        return lookup_strategy, "no_match", "false", fallback_modes, candidates
    return (
        lookup_strategy,
        "no_match_after_fallback",
        "true",
        fallback_modes,
        candidates,
    )


async def get_chapter_model_by_title(
    session: AsyncSession,
    *,
    value: str,
) -> Chapter:
    return await resolve_chapter_by_title(
        session,
        value,
        allow_extensions=True,
        allow_fuzzy=True,
    )


async def create_analyze_result(
    session: AsyncSession,
    *,
    user_id: int,
    parsed_data: list[dict],
) -> AnalyzeResult:
    result = AnalyzeResult(user_id=user_id)

    for row_index, row in enumerate(parsed_data):
        value = str(row["topic"])
        normalized_value = normalize_chapter(value)
        try:
            chapter = await get_chapter_model_by_title(
                session,
                value=value,
            )
        except ValueError as exc:
            value_length = len(normalized_value)
            chapter_diagnostic = _sanitize_chapter_diagnostic(value)
            (
                lookup_strategy,
                lookup_reason,
                fallback_attempted,
                fallback_modes,
                candidates,
            ) = _chapter_lookup_diagnostic(exc)
            logger.warning(
                "Не удалось сопоставить раздел документа "
                "code=unsupported_document stage=validation_failed "
                "reason=chapter_not_found "
                "row_index=%s value_length=%s "
                "chapter_value=%r "
                "lookup_strategy=%s "
                "fallback_attempted=%s fallback_modes=%s "
                "candidates=%s lookup_reason=%s",
                row_index,
                value_length,
                chapter_diagnostic,
                lookup_strategy,
                fallback_attempted,
                fallback_modes,
                candidates,
                lookup_reason,
            )
            raise UnsupportedAnalyzeDocumentError(
                reason="chapter_not_found",
                context={"row_index": row_index, "value_length": value_length},
            ) from exc

        result.items.append(
            AnalyzeResultItem(
                chapter_id=chapter.id,
                question_count=row["question_count"],
                max_score=row["max_score"],
                score=row["score"],
                percentage=row["percentage"],
            )
        )

    session.add(result)
    await session.flush()
    return result


def _analyze_result_options():
    return (
        selectinload(AnalyzeResult.items)
        .selectinload(AnalyzeResultItem.chapter)
        .selectinload(Chapter.translations),
    )


def _apply_chapter_locale(result: AnalyzeResult | None, locale: str) -> AnalyzeResult | None:
    if result is None:
        return None
    for item in result.items:
        if item.chapter is not None:
            resolve_chapter_title(item.chapter, locale)
    return result


async def get_topic_codes_by_chapter_ids(
    session: AsyncSession,
    *,
    chapter_ids: list[int],
    locale: str = "kk",
) -> dict[int, list[dict[str, str]]]:
    unique_chapter_ids = list(dict.fromkeys(chapter_ids))
    if not unique_chapter_ids:
        return {}

    query = (
        select(TopicCode)
        .where(TopicCode.chapter_id.in_(unique_chapter_ids))
        .options(selectinload(TopicCode.translations))
        .order_by(
            TopicCode.chapter_id.asc(),
            TopicCode.id.asc(),
            TopicCode.name.asc(),
        )
    )
    result = await session.execute(query)
    topic_codes_by_chapter = {chapter_id: [] for chapter_id in unique_chapter_ids}

    topic_codes = sorted(
        (
            topic_code
            for topic_code in result.scalars().all()
            if topic_code.chapter_id is not None
        ),
        key=lambda topic_code: (
            topic_code.chapter_id,
            topic_code.id,
            topic_code.name,
        ),
    )
    for topic_code in topic_codes:
        topic_codes_by_chapter.setdefault(topic_code.chapter_id, []).append(
            {
                "name": topic_code.name,
                "title": resolve_topic_code_title(topic_code, locale),
            }
        )

    return topic_codes_by_chapter


async def get_topic_counts_by_chapter_ids(
    session: AsyncSession,
    *,
    chapter_ids: list[int],
) -> dict[int, int]:
    unique_chapter_ids = list(dict.fromkeys(chapter_ids))
    if not unique_chapter_ids:
        return {}

    query = (
        select(TopicCode.chapter_id, func.count(TopicCode.id))
        .where(TopicCode.chapter_id.in_(unique_chapter_ids))
        .group_by(TopicCode.chapter_id)
    )
    result = await session.execute(query)
    topic_counts_by_chapter = {chapter_id: 0 for chapter_id in unique_chapter_ids}
    for chapter_id, topic_count in result.all():
        if chapter_id is not None:
            topic_counts_by_chapter[chapter_id] = int(topic_count)

    return topic_counts_by_chapter


async def get_topic_material_summaries_by_chapter_ids(
    session: AsyncSession,
    *,
    chapter_ids: list[int],
) -> dict[int, dict[str, int | list[int]]]:
    """Return only safe topic count and grade aggregates for each chapter."""

    unique_chapter_ids = list(dict.fromkeys(chapter_ids))
    if not unique_chapter_ids:
        return {}

    query = select(TopicCode.chapter_id, TopicCode.name).where(
        TopicCode.chapter_id.in_(unique_chapter_ids)
    )
    result = await session.execute(query)
    names_by_chapter: dict[int, list[object]] = {
        chapter_id: [] for chapter_id in unique_chapter_ids
    }
    for chapter_id, name in result.all():
        if chapter_id is not None:
            names_by_chapter.setdefault(chapter_id, []).append(name)

    return {
        chapter_id: {
            "topic_count": len(names),
            "material_grades": material_grades_from_topic_code_names(names),
        }
        for chapter_id, names in names_by_chapter.items()
    }


async def get_analyze_result_by_id(
    session: AsyncSession,
    *,
    result_id: int,
    locale: str = "kk",
) -> AnalyzeResult | None:
    query = (
        select(AnalyzeResult)
        .where(AnalyzeResult.id == result_id)
        .options(*_analyze_result_options())
    )
    result = await session.execute(query)
    return _apply_chapter_locale(result.scalar_one_or_none(), locale)


async def get_analyze_result_by_user_id(
    session: AsyncSession,
    *,
    user_id: int,
    locale: str = "kk",
) -> AnalyzeResult | None:
    query = (
        select(AnalyzeResult)
        .where(AnalyzeResult.user_id == user_id)
        .order_by(AnalyzeResult.created_at.desc())
        .limit(1)
        .options(*_analyze_result_options())
    )
    result = await session.execute(query)
    return _apply_chapter_locale(result.scalar_one_or_none(), locale)
