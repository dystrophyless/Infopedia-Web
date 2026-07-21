import logging
import unicodedata
from difflib import SequenceMatcher

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.security.public_refs import encode_public_ref
from src.topics.chapter_catalog import normalize_chapter
from src.topics.models import (
    Book,
    BookChapterCoverage,
    Chapter,
    ChapterTranslation,
    Topic,
    TopicCode,
)

logger = logging.getLogger(__name__)

CHAPTER_NAME_EXTENSION_SEPARATORS = (".", ":", ";", ",", "(", "-", "—")
CHAPTER_FUZZY_THRESHOLD = 0.92
_CHAPTER_FUZZY_TIE_EPSILON = 1e-9


def resolve_topic_code_title(topic_code: TopicCode, locale: str) -> str:
    translations = {
        translation.locale: translation.title for translation in topic_code.translations
    }
    title = translations.get(locale) or translations.get("kk") or topic_code.name
    topic_code.set_localized_title(title)
    return title


def resolve_chapter_title(chapter: Chapter, locale: str) -> str:
    translations = {
        translation.locale: translation.title for translation in chapter.translations
    }
    title = translations.get(locale) or translations.get("kk") or chapter.code
    chapter.title = title
    return title


def _is_chapter_name_extension(shorter_name: str, longer_name: str) -> bool:
    if not longer_name.startswith(shorter_name):
        return False
    suffix = longer_name[len(shorter_name) :].lstrip()
    return bool(suffix) and suffix.startswith(CHAPTER_NAME_EXTENSION_SEPARATORS)


def _chapter_segments(value: str) -> list[str]:
    return [segment.strip() for segment in value.split(".") if segment.strip()]


def _is_dot_segment_extension(shorter_name: str, longer_name: str) -> bool:
    shorter_segments = _chapter_segments(shorter_name)
    longer_segments = _chapter_segments(longer_name)
    if not shorter_segments or len(shorter_segments) >= len(longer_segments):
        return False

    segment_count = len(shorter_segments)
    return any(
        longer_segments[index : index + segment_count] == shorter_segments
        for index in range(len(longer_segments) - segment_count + 1)
    )


def _is_boundary_aware_substring(shorter_name: str, longer_name: str) -> bool:
    if not shorter_name or shorter_name == longer_name:
        return False

    start = 0
    while True:
        index = longer_name.find(shorter_name, start)
        if index == -1:
            return False

        end = index + len(shorter_name)
        left_boundary = index == 0 or not _is_word_continuation(longer_name[index - 1])
        right_boundary = end == len(longer_name) or not _is_word_continuation(longer_name[end])
        if left_boundary and right_boundary:
            return True

        start = index + 1


def _is_word_continuation(char: str) -> bool:
    return char.isalnum() or unicodedata.category(char).startswith("M")


async def resolve_chapter_by_title(
    session: AsyncSession,
    value: str,
    allow_extensions: bool = False,
    allow_fuzzy: bool = False,
) -> Chapter:
    normalized = normalize_chapter(value)
    rows = (
        await session.execute(
            select(ChapterTranslation, Chapter).join(
                Chapter, Chapter.id == ChapterTranslation.chapter_id
            )
        )
    ).all()

    exact_matches = {
        chapter.id: chapter
        for translation, chapter in rows
        if normalize_chapter(translation.title) == normalized
    }
    if len(exact_matches) == 1:
        return next(iter(exact_matches.values()))
    if len(exact_matches) > 1:
        raise ValueError(
            f"Ambiguous chapter title {value!r} "
            "(lookup_reason=ambiguous_exact_match)"
        )

    if allow_extensions:
        fallback_matches = {}
        for translation, chapter in rows:
            translation_title = normalize_chapter(translation.title)
            if (
                _is_chapter_name_extension(translation_title, normalized)
                or _is_chapter_name_extension(normalized, translation_title)
                or _is_dot_segment_extension(translation_title, normalized)
                or _is_dot_segment_extension(normalized, translation_title)
                or _is_boundary_aware_substring(translation_title, normalized)
                or _is_boundary_aware_substring(normalized, translation_title)
            ):
                fallback_matches[chapter.id] = chapter

        if len(fallback_matches) == 1:
            return next(iter(fallback_matches.values()))
        if len(fallback_matches) > 1:
            raise ValueError(
                f"Ambiguous chapter title {value!r} "
                "(lookup_reason=ambiguous_fallback_match)"
            )

    if allow_fuzzy:
        scores_by_chapter: dict[int, tuple[float, Chapter]] = {}
        for translation, chapter in rows:
            translation_title = normalize_chapter(translation.title)
            score = SequenceMatcher(None, normalized, translation_title).ratio()
            if score < CHAPTER_FUZZY_THRESHOLD:
                continue
            previous = scores_by_chapter.get(chapter.id)
            if previous is None or score > previous[0]:
                scores_by_chapter[chapter.id] = (score, chapter)

        if scores_by_chapter:
            ranked_matches = sorted(
                scores_by_chapter.values(),
                key=lambda item: (-item[0], item[1].id),
            )
            top_score = ranked_matches[0][0]
            top_matches = [
                item for item in ranked_matches
                if abs(item[0] - top_score) <= _CHAPTER_FUZZY_TIE_EPSILON
            ]
            if len(top_matches) == 1:
                return top_matches[0][1]

            raise ValueError(
                f"Ambiguous chapter title {value!r} "
                "(lookup_reason=ambiguous_fuzzy_top_score; "
                f"fuzzy_threshold={CHAPTER_FUZZY_THRESHOLD:.2f}; "
                f"top_score={top_score:.6f}; candidates={len(top_matches)})"
            )

        raise ValueError(
            f"Unknown chapter title {value!r} "
            "(lookup_reason=no_fuzzy_candidate; "
            f"fuzzy_threshold={CHAPTER_FUZZY_THRESHOLD:.2f}; "
            f"candidates={len(scores_by_chapter)})"
        )

    raise ValueError(f"Unknown chapter title {value!r}")


async def get_topic_by_name(
    session: AsyncSession,
    *,
    name: str,
) -> Topic | None:
    query = (
        select(Topic)
        .where(Topic.name == name)
    )  # fmt: skip

    result = await session.execute(query)

    topic: Topic | None = result.scalar_one_or_none()

    if topic is None:
        logger.debug(
            "Не удалось получить тему с `name`='%s' из базы данных",
            name,
        )
        return None

    logger.debug(
        "Успешно получена тема с `name`='%s' из базы данных: %s",
        name,
        topic.name,
    )

    return topic


async def get_topic_by_id(
    session: AsyncSession,
    *,
    topic_id: int,
    locale: str = "kk",
) -> Topic | None:
    query = (
        select(Topic)
        .options(
            selectinload(Topic.book),
            selectinload(Topic.topic_codes).options(
                selectinload(TopicCode.chapter).selectinload(Chapter.translations),
                selectinload(TopicCode.translations),
            ),
        )
        .where(Topic.id == topic_id)
    )  # fmt: skip

    result = await session.execute(query)

    topic: Topic | None = result.scalar_one_or_none()

    if topic is None:
        logger.debug(
            "Не удалось получить тему с `topic_id`='%s' из базы данных",
            topic_id,
        )
        return None

    logger.debug(
        "Успешно получена тема с `topic_id`='%s' из базы данных: %s",
        topic_id,
        topic.name,
    )

    for topic_code in topic.topic_codes:
        resolve_topic_code_title(topic_code, locale)
        if topic_code.chapter is not None:
            resolve_chapter_title(topic_code.chapter, locale)

    return topic


async def get_topics_by_book_id(
    session: AsyncSession,
    *,
    book_id: int,
) -> list[Topic] | None:
    query = (
        select(Topic)
        .where(Topic.book_id == book_id)
    )  # fmt: skip

    result = await session.execute(query)

    topics: list[Topic] = result.scalars().all()

    if not topics:
        logger.debug(
            "Не удалось получить темы для книги с `book_id`='%s' из базы данных",
            book_id,
        )
        return None

    logger.debug(
        "Успешно получены темы для книги с `book_id`='%s' из базы данных. Кол-во: %d",
        book_id,
        len(topics),
    )

    return topics


async def get_topics_by_chapter_id(
    session: AsyncSession,
    *,
    chapter_id: int,
) -> list[Topic] | None:
    query = (
        select(Topic)
        .join(Topic.topic_codes)
        .where(TopicCode.chapter_id == chapter_id)
        .distinct()
    )  # fmt: skip

    result = await session.execute(query)

    topics: list[Topic] = result.scalars().all()

    if not topics:
        logger.debug(
            "Не удалось получить темы для главы с `chapter_id`='%s' из базы данных",
            chapter_id,
        )
        return None

    logger.debug(
        "Успешно получены темы для главы с `chapter_id`='%s' из базы данных. Кол-во: %d",
        chapter_id,
        len(topics),
    )

    return topics


async def get_all_topics(
    session: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 20,
) -> list[Topic] | None:
    query = select(Topic).offset(skip).limit(limit)

    result = await session.execute(query)

    topics: list[Topic] | None = result.scalars().all()

    if not topics:
        logger.debug(
            "Не удалось получить темы из базы данных",
        )
        return None

    logger.debug("Успешно получены все темы из базы данных. Кол-во: %d", len(topics))

    return topics


async def get_all_books(session: AsyncSession) -> list[Book]:
    query = select(Book).order_by(Book.publisher.asc(), Book.grade.asc())

    result = await session.execute(query)
    books: list[Book] = result.scalars().all()

    logger.debug("Получены книги для каталога фильтров. Кол-во: %d", len(books))

    return books


async def get_all_chapters(session: AsyncSession, locale: str = "kk") -> list[Chapter]:
    query = (
        select(Chapter)
        .options(selectinload(Chapter.translations))
        .order_by(Chapter.id.asc())
    )

    result = await session.execute(query)
    chapters: list[Chapter] = result.scalars().all()
    for chapter in chapters:
        resolve_chapter_title(chapter, locale)

    logger.debug("Получены разделы для каталога фильтров. Кол-во: %d", len(chapters))

    return chapters


async def get_books_coverage_by_chapter(
    session: AsyncSession,
    *,
    chapter_id: int,
) -> list[dict] | None:
    coverage_by_chapter = await get_books_coverage_by_chapter_ids(
        session,
        chapter_ids=[chapter_id],
    )

    stats = coverage_by_chapter.get(chapter_id, [])

    if not stats:
        logger.debug(
            "Не удалось получить покрытие книг для главы с `chapter_id`='%s' из базы данных",
            chapter_id,
        )
        return None

    logger.debug(
        "Успешно получено покрытие книг для главы с `chapter_id`='%s'. Кол-во книг: %d",
        chapter_id,
        len(stats),
    )

    return stats


async def get_books_coverage_by_chapter_ids(
    session: AsyncSession,
    *,
    chapter_ids: list[int],
) -> dict[int, list[dict]]:
    unique_chapter_ids = list(dict.fromkeys(chapter_ids))
    if not unique_chapter_ids:
        return {}

    query = (
        select(BookChapterCoverage, Book)
        .join(Book, Book.id == BookChapterCoverage.book_id)
        .where(BookChapterCoverage.chapter_id.in_(unique_chapter_ids))
        .order_by(
            BookChapterCoverage.chapter_id.asc(),
            BookChapterCoverage.topic_count.desc(),
            Book.publisher.asc(),
            Book.grade.asc(),
        )
    )  # fmt: skip

    result = await session.execute(query)
    coverage_by_chapter = {chapter_id: [] for chapter_id in unique_chapter_ids}

    for coverage, book in result.all():
        coverage_by_chapter.setdefault(coverage.chapter_id, []).append(
            {
                "public_id": encode_public_ref("book", book.id),
                "publisher": book.publisher,
                "grade": book.grade,
                "topic_count": coverage.topic_count,
                "percentage": coverage.percentage,
            },
        )

    return coverage_by_chapter
