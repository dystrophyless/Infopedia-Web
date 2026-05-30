import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.terms.models import Definition, Term
from src.topics.models import Topic, TopicCode

logger = logging.getLogger(__name__)


async def check_if_term_exists(
    session: AsyncSession,
    *,
    name: str,
) -> bool:
    query = (
        select(Term)
        .where(Term.name == name)
    )  # fmt: skip

    result = await session.execute(query)

    term: Term | None = result.scalar_one_or_none()

    if term is not None:
        logger.debug(
            "Термин с `name`='%s' уже существует в базе данных",
            name,
        )
        return True

    return False


async def count_terms(
    session: AsyncSession,
) -> int:
    query = (
        select(func.count())
        .select_from(Term)
    )  # fmt: skip

    result = await session.execute(query)

    total: int = result.scalar_one() or 0

    logger.debug("Всего терминов в базе данных: %d", total)

    return total


async def get_term_by_name(
    session: AsyncSession,
    *,
    name: str,
) -> Term | None:  # fmt: skip
    query = (
        select(Term)
        .where(Term.name == name)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    term: Term | None = result.scalar_one_or_none()

    if term is None:
        logger.debug(
            "Не удалось получить термин с `name`='%s' из базы данных",
            name,
        )
        return None

    logger.debug("Получили данные для термина с `name`='%s'", name)

    return term


async def get_term_by_id(
    session: AsyncSession,
    *,
    id: int,
    ) -> Term | None:  # fmt: skip
    query = (
        select(Term)
        .where(Term.id == id)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    term: Term | None = result.scalar_one_or_none()

    if term is None:
        logger.debug(
            "Не удалось получить термин с `id`='%s' из базы данных",
            id,
        )
        return None

    logger.debug("Получили данные для термина с `id`='%s'", id)

    return term


async def get_terms_paginated(
    session: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 10,
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .order_by(Term.id)
        .offset(skip)
        .limit(limit)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] = result.scalars().all()

    if not terms:
        logger.debug("Не удалось получить термины из базы данных")
        return None

    logger.debug("Получили список терминов из базы данных. Кол-во: %d", len(terms))

    return terms


async def get_terms_by_book(
    session: AsyncSession,
    *,
    book_id: int,
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .join(Term.definitions)
        .join(Definition.topic)
        .where(Topic.book_id == book_id)
        .distinct()
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] = result.scalars().all()

    if not terms:
        logger.debug(
            "Не удалось получить термины для книги с `book_id`='%s' из базы данных",
            book_id,
        )
        return None

    logger.debug(
        "Получили список терминов для книги с `book_id`='%s' из базы данных. Кол-во: %d",
        book_id,
        len(terms),
    )

    return terms


async def get_terms_by_chapter(
    session: AsyncSession,
    *,
    chapter_id: int,
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .join(Term.definitions)
        .join(Definition.topic)
        .join(Topic.topic_codes)
        .where(TopicCode.chapter_id == chapter_id)
        .distinct()
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] = result.scalars().all()

    if not terms:
        logger.debug(
            "Не удалось получить термины для главы с `chapter_id`='%s' из базы данных",
            chapter_id,
        )
        return None

    logger.debug(
        "Получили список терминов для главы с `chapter_id`='%s' из базы данных. Кол-во: %d",
        chapter_id,
        len(terms),
    )

    return terms


async def get_terms_by_topic(
    session: AsyncSession,
    *,
    topic_id: int,
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .join(Term.definitions)
        .where(Definition.topic_id == topic_id)
        .distinct()
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] = result.scalars().all()

    if not terms:
        logger.debug(
            "Не удалось получить термины для темы с `topic_id`='%s' из базы данных",
            topic_id,
        )
        return None

    logger.debug(
        "Получили список терминов для темы с `topic_id`='%s' из базы данных. Кол-во: %d",
        topic_id,
        len(terms),
    )

    return terms


async def get_all_terms(
    session: AsyncSession
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .order_by(Term.id)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] = result.scalars().all()

    if not terms:
        logger.debug("Не удалось получить термины из базы данных")
        return None

    logger.debug("Получили список терминов из базы данных. Кол-во: %d", len(terms))

    return terms


async def get_random_terms(
    session: AsyncSession,
    *,
    quantity: int,
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .order_by(func.random())
        .limit(quantity)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms = list(result.scalars().all())

    if not terms:
        logger.debug("Не удалось получить случайные термины из базы данных")
        return None

    logger.debug(
        "Получили список случайных терминов из базы данных. Кол-во: %d",
        len(terms),
    )

    return terms


async def search_terms_by_prefix(
    session: AsyncSession,
    *,
    user_query: str,
    limit: int = 10,
    prefix: bool = True,
) -> list[Term] | None:  # fmt: skip
    like = f"{user_query}%" if prefix else f"%{user_query}%"

    query = (
        select(Term)
        .where(Term.name.ilike(like))
        .limit(limit)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] | None = result.scalars().all()

    if not terms:
        logger.debug(
            "Не удалось найти термины с `query`='%s' в базе данных",
            query,
        )
        return None

    logger.debug(
        "Получили список терминов, найденных по `query`='%s' в базе данных. Кол-во: %d",
        query,
        len(terms),
    )

    return terms


async def search_terms_by_similarity(
    session: AsyncSession,
    *,
    user_query: str,
    limit: int = 10,
) -> list[Term] | None:  # fmt: skip
    query = (
        select(Term)
        .where(Term.name.op("%")(user_query))
        .order_by(func.similarity(Term.name, user_query).desc())
        .limit(limit)
        .options(
            selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    terms: list[Term] = result.scalars().all()

    if not terms:
        logger.debug(
            "Не удалось найти термины, похожие на `query`='%s' в базе данных",
            query,
        )
        return None

    logger.debug(
        "Получили список терминов, похожих на `query`='%s' в базе данных. Кол-во: %d",
        query,
        len(terms),
    )

    return terms


async def get_definition_candidates(
    session: AsyncSession,
    qvec_list: list[float],
    top_k: int,
) -> list[tuple[Definition, float]] | None:  # fmt: skip
    query = (
        select(
            Definition,
            (1 - Definition.embedding.cosine_distance(qvec_list)).label("sim_approx"),
        )
        .order_by(Definition.embedding.cosine_distance(qvec_list))
        .limit(top_k)
        .options(
            joinedload(Definition.term),
            joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    definitions: list[tuple[Definition, float]] = result.all()

    if not definitions:
        logger.debug(
            "Не удалось найти кандидатов для определения по вектору из базы данных",
        )
        return None

    logger.debug(
        "Получили список кандидатов для определения по вектору из базы данных. Кол-во: %d",
        len(definitions),
    )

    return definitions
