from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.analyze.exceptions import UnsupportedAnalyzeDocumentError
from src.analyze.models import AnalyzeResult, AnalyzeResultItem
from src.topics.chapter_catalog import normalize_chapter
from src.topics.models import Chapter, ChapterAlias
from src.topics.repository import resolve_chapter_title


CHAPTER_NAME_EXTENSION_SEPARATORS = (".", ":", ";", ",", "(", "-", "—")


def normalize_chapter_lookup_name(value: str) -> str:
    return normalize_chapter(value)


def is_chapter_name_extension(shorter_name: str, longer_name: str) -> bool:
    if not longer_name.startswith(shorter_name):
        return False
    suffix = longer_name[len(shorter_name):].lstrip()
    return bool(suffix) and suffix.startswith(CHAPTER_NAME_EXTENSION_SEPARATORS)


async def resolve_chapter_alias(
    session: AsyncSession,
    value: str,
) -> Chapter:
    """Resolve Analyze input using exact DB aliases, with a safe extension rule."""
    normalized = normalize_chapter_lookup_name(value)
    if not normalized:
        raise ValueError("Chapter alias cannot be empty")

    rows = (await session.execute(
        select(ChapterAlias, Chapter)
        .join(Chapter, Chapter.id == ChapterAlias.chapter_id)
    )).all()

    exact = {
        chapter.id: chapter
        for alias, chapter in rows
        if alias.normalized_alias == normalized
    }
    if len(exact) == 1:
        return next(iter(exact.values()))
    if len(exact) > 1:
        raise ValueError(f"Ambiguous chapter alias {value!r}")

    extension_matches = {
        chapter.id: chapter
        for alias, chapter in rows
        if is_chapter_name_extension(alias.normalized_alias, normalized)
        or is_chapter_name_extension(normalized, alias.normalized_alias)
    }
    if len(extension_matches) == 1:
        return next(iter(extension_matches.values()))
    if len(extension_matches) > 1:
        raise ValueError(f"Ambiguous chapter alias {value!r}")
    raise ValueError(f"Unknown chapter alias {value!r}")


async def get_chapter_model_by_alias(
    session: AsyncSession,
    *,
    value: str,
) -> Chapter:
    return await resolve_chapter_alias(session, value)


async def create_analyze_result(
    session: AsyncSession,
    *,
    user_id: int,
    parsed_data: list[dict],
) -> AnalyzeResult:
    result = AnalyzeResult(user_id=user_id)

    for row in parsed_data:
        try:
            chapter = await get_chapter_model_by_alias(
                session,
                value=row["topic"],
            )
        except ValueError as exc:
            raise UnsupportedAnalyzeDocumentError() from exc

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
