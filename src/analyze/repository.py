import logging
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.analyze.enums import CHAPTER_ALIASES, resolve_chapter
from src.analyze.enums import Chapter as AnalyzeChapter
from src.analyze.enums import normalize_chapter
from src.analyze.exceptions import UnsupportedAnalyzeDocumentError
from src.analyze.models import AnalyzeResult, AnalyzeResultItem
from src.topics.models import Chapter as ChapterModel

logger = logging.getLogger(__name__)

CHAPTER_LINK_MATCH_THRESHOLD = 0.92
CHAPTER_NAME_EXTENSION_SEPARATORS = (".", ":", ";", ",", "(", "-", "—")
CHAPTER_MODELS_CACHE_KEY = "_analyze_chapter_models_cache"


def get_chapter_name_candidates(chapter: AnalyzeChapter) -> set[str]:
    names: set[str] = set()

    for alias in CHAPTER_ALIASES[chapter]:
        name = alias.strip()
        if not name:
            continue

        names.add(name)

    return names


def normalize_chapter_lookup_name(value: str) -> str:
    return normalize_chapter(value).rstrip(" .")


def is_chapter_name_extension(shorter_name: str, longer_name: str) -> bool:
    if not longer_name.startswith(shorter_name):
        return False

    suffix = longer_name[len(shorter_name) :].lstrip()
    return suffix.startswith(CHAPTER_NAME_EXTENSION_SEPARATORS)


def get_chapter_link_score(alias_name: str, db_name: str) -> tuple[int, float]:
    if alias_name == db_name:
        return (3, 1.0)

    if is_chapter_name_extension(alias_name, db_name) or is_chapter_name_extension(
        db_name,
        alias_name,
    ):
        return (2, SequenceMatcher(None, alias_name, db_name).ratio())

    similarity = SequenceMatcher(None, alias_name, db_name).ratio()
    if similarity >= CHAPTER_LINK_MATCH_THRESHOLD:
        return (1, similarity)

    return (0, similarity)


async def get_chapter_model_by_analyze_chapter(
    session: AsyncSession,
    *,
    chapter: AnalyzeChapter,
) -> ChapterModel:
    aliases = [
        normalize_chapter_lookup_name(alias)
        for alias in get_chapter_name_candidates(chapter)
    ]

    chapters = session.info.get(CHAPTER_MODELS_CACHE_KEY)
    if chapters is None:
        result = await session.execute(select(ChapterModel))
        chapters = result.scalars().all()
        session.info[CHAPTER_MODELS_CACHE_KEY] = chapters

    best_match: tuple[int, float, ChapterModel | None, str | None] = (0, 0.0, None, None)
    for chapter_model in chapters:
        db_name = normalize_chapter_lookup_name(chapter_model.name)
        for alias in aliases:
            rank, similarity = get_chapter_link_score(alias, db_name)
            if (rank, similarity) > (best_match[0], best_match[1]):
                best_match = (rank, similarity, chapter_model, alias)

    if best_match[2] is not None:
        if best_match[0] < 3:
            logger.info(
                "Linked analyze chapter '%s' to DB chapter '%s' with alias '%s' similarity=%.3f",
                chapter.value,
                best_match[2].name,
                best_match[3],
                best_match[1],
            )
        return best_match[2]

    db_chapter_names = [chapter_model.name for chapter_model in chapters]
    raise ValueError(
        f"Chapter '{chapter.value}' is not linked to a DB chapter. "
        f"Aliases={get_chapter_name_candidates(chapter)!r}. "
        f"DB chapters={db_chapter_names!r}."
    )


async def create_analyze_result(
    session: AsyncSession,
    *,
    user_id: int,
    parsed_data: list[dict],
) -> AnalyzeResult:
    result = AnalyzeResult(user_id=user_id)

    for row in parsed_data:
        raw_chapter = row["topic"]
        try:
            analyze_chapter = resolve_chapter(raw_chapter)
        except ValueError as exc:
            raise UnsupportedAnalyzeDocumentError() from exc

        chapter_model = await get_chapter_model_by_analyze_chapter(
            session,
            chapter=analyze_chapter,
        )

        result.items.append(
            AnalyzeResultItem(
                analyze_chapter=analyze_chapter,
                chapter_id=chapter_model.id,
                question_count=row["question_count"],
                max_score=row["max_score"],
                score=row["score"],
                percentage=row["percentage"],
            )
        )

    session.add(result)
    await session.flush()
    return result


async def get_analyze_result_by_user_id(
    session: AsyncSession,
    *,
    user_id: int,
) -> AnalyzeResult | None:
    query = (
        select(AnalyzeResult)
        .where(AnalyzeResult.user_id == user_id)
        .options(selectinload(AnalyzeResult.items))
    )  # fmt: skip

    result = await session.execute(query)

    analyze_result: AnalyzeResult | None = result.scalar_one_or_none()

    return analyze_result
