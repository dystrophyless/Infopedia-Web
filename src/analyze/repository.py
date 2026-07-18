from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.analyze.exceptions import UnsupportedAnalyzeDocumentError
from src.analyze.models import AnalyzeResult, AnalyzeResultItem
from src.topics.models import Chapter
from src.topics.repository import resolve_chapter_by_title, resolve_chapter_title


async def get_chapter_model_by_title(
    session: AsyncSession,
    *,
    value: str,
) -> Chapter:
    return await resolve_chapter_by_title(session, value, allow_extensions=True)


async def create_analyze_result(
    session: AsyncSession,
    *,
    user_id: int,
    parsed_data: list[dict],
) -> AnalyzeResult:
    result = AnalyzeResult(user_id=user_id)

    for row in parsed_data:
        try:
            chapter = await get_chapter_model_by_title(
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
