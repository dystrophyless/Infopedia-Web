import logging

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


async def resolve_chapter_by_title(
    session: AsyncSession,
    value: str,
    allow_extensions: bool = False,
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
        raise ValueError(f"Ambiguous chapter title {value!r}")

    if allow_extensions:
        extension_matches = {
            chapter.id: chapter
            for translation, chapter in rows
            if _is_chapter_name_extension(
                normalize_chapter(translation.title), normalized
            )
            or _is_chapter_name_extension(
                normalized, normalize_chapter(translation.title)
            )
        }
        if len(extension_matches) == 1:
            return next(iter(extension_matches.values()))
        if len(extension_matches) > 1:
            raise ValueError(f"Ambiguous chapter title {value!r}")

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
