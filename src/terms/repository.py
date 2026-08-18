import logging
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Literal

from sqlalchemy import Select, and_, exists, func, literal, select, true
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from src.search.term_filters import TermSearchFilters
from src.terms.models import Definition, Term
from src.topics.models import Book, Topic, TopicCode, TopicMapping

logger = logging.getLogger(__name__)

SearchTermsMode = Literal["all_filtered", "prefix", "contains", "similarity"]


class SearchTermsRepositoryInvariantError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class SearchBookDTO:
    id: int
    publisher: str
    grade: int


@dataclass(frozen=True, slots=True)
class SearchTopicDTO:
    id: int
    name: str
    page_start: int
    page_end: int
    book: SearchBookDTO


@dataclass(frozen=True, slots=True)
class SearchDefinitionDTO:
    id: int
    text: str
    page: int
    topic: SearchTopicDTO


@dataclass(slots=True)
class SearchTermDTO:
    id: int
    name: str
    definitions: list[SearchDefinitionDTO] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class SearchTermsRepositoryPage:
    terms: list[SearchTermDTO]
    total: int
    mode: SearchTermsMode


@dataclass(frozen=True, slots=True)
class SearchTermsStatements:
    count: Select
    page: Select
    hydration: Select


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


async def get_definition_by_id(
    session: AsyncSession,
    *,
    id: int,
) -> Definition | None:  # fmt: skip
    query = (
        select(Definition)
        .where(Definition.id == id)
        .options(
            joinedload(Definition.term)
            .selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
            joinedload(Definition.topic)
            .joinedload(Topic.book),
        )
    )  # fmt: skip

    result = await session.execute(query)

    definition: Definition | None = result.scalar_one_or_none()

    if definition is None:
        logger.debug(
            "Не удалось получить определение с `id`='%s' из базы данных",
            id,
        )
        return None

    logger.debug("Получили данные для определения с `id`='%s'", id)

    return definition


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
        .where(Term.definitions.any())
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


async def get_featured_definitions(
    session: AsyncSession,
    *,
    definition_ids: list[int],
) -> list[Definition] | None:
    if not definition_ids:
        return None

    query = (
        select(Definition)
        .where(Definition.id.in_(definition_ids))
        .options(
            joinedload(Definition.term)
            .selectinload(Term.definitions)
            .joinedload(Definition.topic)
            .joinedload(Topic.book),
            joinedload(Definition.topic).joinedload(Topic.book),
        )
    )
    result = await session.execute(query)
    by_id = {definition.id: definition for definition in result.scalars().all()}
    ordered = [by_id[definition_id] for definition_id in definition_ids if definition_id in by_id]
    return ordered or None


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


def _qualifying_definition_predicate(filters: TermSearchFilters):
    clauses = []
    if filters.book_ids:
        clauses.append(Topic.book_id.in_(filters.book_ids))
    if filters.grades:
        clauses.append(Book.grade.in_(filters.grades))
    if filters.chapter_ids or filters.ent_only:
        mapping_clauses = [
            TopicMapping.topic_id == Definition.topic_id,
            TopicCode.id == TopicMapping.topic_code_id,
        ]
        if filters.chapter_ids:
            mapping_clauses.append(TopicCode.chapter_id.in_(filters.chapter_ids))
        if filters.ent_only:
            mapping_clauses.append(TopicCode.chapter_id.is_not(None))
        clauses.append(
            exists(
                select(literal(1))
                .select_from(TopicMapping)
                .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
                .where(*mapping_clauses),
            ),
        )
    return and_(*clauses) if clauses else true()


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _term_name_predicate(filters: TermSearchFilters, mode: SearchTermsMode):
    if mode == "all_filtered":
        return true()
    escaped_query = _escape_like(filters.query)
    if mode == "prefix":
        return Term.name.ilike(f"{escaped_query}%", escape="\\")
    if mode == "contains":
        return Term.name.ilike(f"%{escaped_query}%", escape="\\")
    if mode == "similarity":
        return Term.name.op("%")(filters.query)
    message = f"Unknown search terms mode: {mode}"
    raise ValueError(message)


def _search_terms_from_clause(statement: Select) -> Select:
    return (
        statement.select_from(Definition)
        .join(Term, Term.id == Definition.term_id)
        .join(Topic, Topic.id == Definition.topic_id)
        .join(Book, Book.id == Topic.book_id)
    )


def build_search_terms_statements(
    *,
    filters: TermSearchFilters,
    mode: SearchTermsMode,
    skip: int,
    limit: int,
    page_term_ids: Sequence[int],
) -> SearchTermsStatements:
    qualification = _qualifying_definition_predicate(filters)
    name_predicate = _term_name_predicate(filters, mode)
    common_predicate = and_(qualification, name_predicate)

    count_statement = _search_terms_from_clause(
        select(func.count(func.distinct(Definition.term_id))),
    ).where(common_predicate)
    page_statement = (
        _search_terms_from_clause(
            select(
                Definition.term_id,
                func.min(Definition.id).label("first_qualifying_definition_id"),
            ),
        )
        .where(common_predicate)
        .group_by(Definition.term_id)
        .order_by(func.min(Definition.id), Definition.term_id)
        .offset(skip)
        .limit(limit)
    )
    hydration_statement = (
        _search_terms_from_clause(
            select(
                Term.id.label("term_id"),
                Term.name.label("term_name"),
                Definition.id.label("definition_id"),
                Definition.text.label("definition_text"),
                Definition.page.label("definition_page"),
                Topic.id.label("topic_id"),
                Topic.name.label("topic_name"),
                Topic.page_start.label("topic_page_start"),
                Topic.page_end.label("topic_page_end"),
                Book.id.label("book_id"),
                Book.publisher.label("book_publisher"),
                Book.grade.label("book_grade"),
            ),
        )
        .where(
            Term.id.in_(list(page_term_ids)),
            common_predicate,
        )
        .order_by(Definition.id)
    )
    return SearchTermsStatements(
        count=count_statement,
        page=page_statement,
        hydration=hydration_statement,
    )


async def _mode_has_matches(
    session: AsyncSession,
    *,
    filters: TermSearchFilters,
    mode: SearchTermsMode,
) -> bool:
    statement = (
        _search_terms_from_clause(select(literal(1)))
        .where(
            _qualifying_definition_predicate(filters),
            _term_name_predicate(filters, mode),
        )
        .limit(1)
    )
    return (await session.scalar(statement)) is not None


async def _resolve_search_terms_mode(
    session: AsyncSession,
    *,
    filters: TermSearchFilters,
) -> SearchTermsMode:
    if not filters.query:
        return "all_filtered"
    if await _mode_has_matches(session, filters=filters, mode="prefix"):
        return "prefix"
    if await _mode_has_matches(session, filters=filters, mode="contains"):
        return "contains"
    return "similarity"


async def _hydrate_search_terms(
    session: AsyncSession,
    *,
    statement: Select,
    page_term_ids: Sequence[int],
) -> list[SearchTermDTO]:
    requested_ids = list(page_term_ids)
    requested_id_set = set(requested_ids)
    by_id: dict[int, SearchTermDTO] = {}
    rows = (await session.execute(statement)).all()
    for row in rows:
        if row.term_id not in requested_id_set:
            message = f"Hydration returned unexpected term id {row.term_id}."
            raise SearchTermsRepositoryInvariantError(message)
        term = by_id.get(row.term_id)
        if term is None:
            term = SearchTermDTO(id=row.term_id, name=row.term_name)
            by_id[row.term_id] = term
        elif term.name != row.term_name:
            message = f"Hydration returned inconsistent metadata for term id {row.term_id}."
            raise SearchTermsRepositoryInvariantError(message)
        term.definitions.append(
            SearchDefinitionDTO(
                id=row.definition_id,
                text=row.definition_text,
                page=row.definition_page,
                topic=SearchTopicDTO(
                    id=row.topic_id,
                    name=row.topic_name,
                    page_start=row.topic_page_start,
                    page_end=row.topic_page_end,
                    book=SearchBookDTO(
                        id=row.book_id,
                        publisher=row.book_publisher,
                        grade=row.book_grade,
                    ),
                ),
            ),
        )

    missing_ids = [term_id for term_id in requested_ids if term_id not in by_id]
    unexpected_ids = sorted(set(by_id) - requested_id_set)
    if missing_ids or unexpected_ids:
        message = f"Hydration term id mismatch: missing={missing_ids}, unexpected={unexpected_ids}."
        raise SearchTermsRepositoryInvariantError(message)
    return [by_id[term_id] for term_id in requested_ids]


async def search_filtered_terms(
    session: AsyncSession,
    *,
    filters: TermSearchFilters,
    skip: int,
    limit: int,
) -> SearchTermsRepositoryPage:
    mode = await _resolve_search_terms_mode(session, filters=filters)
    statements = build_search_terms_statements(
        filters=filters,
        mode=mode,
        skip=skip,
        limit=limit,
        page_term_ids=[],
    )
    total = int((await session.scalar(statements.count)) or 0)
    page_rows = (await session.execute(statements.page)).all()
    page_term_ids = [row.term_id for row in page_rows]
    if not page_term_ids:
        return SearchTermsRepositoryPage(terms=[], total=total, mode=mode)

    hydration = build_search_terms_statements(
        filters=filters,
        mode=mode,
        skip=skip,
        limit=limit,
        page_term_ids=page_term_ids,
    ).hydration
    terms = await _hydrate_search_terms(
        session,
        statement=hydration,
        page_term_ids=page_term_ids,
    )
    if [term.id for term in terms] != page_term_ids:
        raise SearchTermsRepositoryInvariantError("Hydration changed the requested term order.")
    return SearchTermsRepositoryPage(terms=terms, total=total, mode=mode)


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
