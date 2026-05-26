import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.topics.models import Topic, TopicCode

logger = logging.getLogger(__name__)


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
) -> Topic | None:
    query = (
        select(Topic)
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
) -> list[Topic] | None:
    query = select(Topic)

    result = await session.execute(query)

    topics: list[Topic] | None = result.scalars().all()

    if not topics:
        logger.debug(
            "Не удалось получить темы из базы данных",
        )
        return None

    logger.debug("Успешно получены все темы из базы данных. Кол-во: %d", len(topics))

    return topics
