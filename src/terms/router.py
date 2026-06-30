import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.config import settings
from src.database import get_async_session
from src.security.anti_scrape import enforce_anti_scrape
from src.security.public_refs import InvalidPublicRef, decode_public_ref
from src.users.models import User
from src.terms.models import Definition, Term
from src.terms.repository import (
    check_if_term_exists,
    count_terms,
    get_random_terms,
    get_term_by_id,
    get_terms_paginated,
)
from src.terms.schemas import (
    DefinitionResponse,
    FeaturedTermResponse,
    PaginatedTermsResponse,
    TermCreate,
    TermDetailedResponse,
    TermUpdate,
)
from src.terms.service import get_embedder
from src.topics.repository import get_topic_by_name
from src.topics.schemas import BookResponse

router = APIRouter()
FEATURED_TERMS_LIMIT = 10


async def _get_term_by_public_ref(
    session: AsyncSession,
    term_ref: str,
) -> Term | None:
    try:
        term_id = decode_public_ref("term", term_ref)
    except InvalidPublicRef:
        return None

    return await get_term_by_id(session, id=term_id)


async def _get_featured_terms(
    session: AsyncSession,
    *,
    limit: int = FEATURED_TERMS_LIMIT,
) -> list[FeaturedTermResponse]:
    featured_terms: list[FeaturedTermResponse] = []
    terms = await get_random_terms(session, quantity=limit)

    if not terms:
        return featured_terms

    for term in terms[:limit]:
        definition = next(iter(term.definitions), None)
        if definition is None:
            continue

        featured_terms.append(
            FeaturedTermResponse(
                term=TermDetailedResponse.model_validate(term),
                featured_definition=DefinitionResponse.model_validate(definition),
            ),
        )

    return featured_terms


async def _build_term_definitions(
    session: AsyncSession,
    definitions_data,
) -> list[Definition]:
    definitions: list[Definition] = []

    for definition_data in definitions_data:
        topic = await get_topic_by_name(
            session,
            name=definition_data.topic,
        )

        if topic is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Тема с именем '{definition_data.topic}' не найдена.",
            )

        if (
            definition_data.page < topic.page_start
            or definition_data.page > topic.page_end
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Номер страницы для определения должен быть в диапазоне от "
                    f"{topic.page_start} до {topic.page_end} для темы '{topic.name}'."
                ),
            )

        embedder = get_embedder()

        embedding = await asyncio.to_thread(embedder.encode, definition_data.text)
        embedding_list = (
            embedding.tolist() if hasattr(embedding, "tolist") else list(embedding)
        )
        definitions.append(
            Definition(
                text=definition_data.text,
                topic=topic,
                page=definition_data.page,
                embedding=embedding_list,
            ),
        )

    return definitions


@router.get("", response_model=PaginatedTermsResponse)
async def get_terms(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=settings.ANTI_SCRAPE_MAX_TERMS_PAGE_SIZE)] = 10,
):
    await enforce_anti_scrape(
        request,
        scope="terms:list",
        user_id=current_user.id,
    )
    total: int = await count_terms(session)

    terms: list[Term] | None = await get_terms_paginated(
        session,
        skip=skip,
        limit=limit,
    )

    if terms is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термины не найдены.",
        )

    has_more = skip + len(terms) < total

    return PaginatedTermsResponse(
        terms=[TermDetailedResponse.model_validate(term) for term in terms],
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more,
    )


@router.get("/featured", response_model=list[FeaturedTermResponse])
async def get_featured_terms(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    limit: Annotated[int, Query(ge=1, le=FEATURED_TERMS_LIMIT)] = FEATURED_TERMS_LIMIT,
):
    await enforce_anti_scrape(
        request,
        scope="terms:featured",
        limit=settings.ANTI_SCRAPE_PUBLIC_LIMIT,
        block_automation_user_agents=False,
    )
    return await _get_featured_terms(session, limit=limit)


@router.post(
    "", response_model=TermDetailedResponse, status_code=status.HTTP_201_CREATED
)
async def create_term(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    term_data: TermCreate,
):
    await enforce_anti_scrape(
        request,
        scope="terms:write",
        user_id=current_user.id,
    )
    term_exists: bool = await check_if_term_exists(session, name=term_data.name)

    if term_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Термин с именем '{term_data.name}' уже существует.",
        )

    definitions = await _build_term_definitions(session, term_data.definitions)
    new_term = Term(name=term_data.name, definitions=definitions)

    session.add(new_term)

    await session.commit()
    await session.refresh(new_term)

    term: Term | None = await get_term_by_id(session, id=new_term.id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Созданный термин не найден.",
        )

    return term


@router.get("/{term_ref}", response_model=TermDetailedResponse)
async def get_term(
    request: Request,
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="terms:detail",
        user_id=current_user.id,
        limit=settings.ANTI_SCRAPE_DETAIL_LIMIT,
    )
    term = await _get_term_by_public_ref(session, term_ref)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден.",
        )

    return term


@router.patch("/{term_ref}", response_model=TermDetailedResponse)
async def update_term(
    request: Request,
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    term_data: TermUpdate,
):
    await enforce_anti_scrape(
        request,
        scope="terms:write",
        user_id=current_user.id,
    )
    term = await _get_term_by_public_ref(session, term_ref)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден.",
        )

    term_exists: bool = await check_if_term_exists(session, name=term_data.name)

    if term_exists and term_data.name != term.name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Термин с именем '{term_data.name}' уже существует.",
        )

    definitions = await _build_term_definitions(session, term_data.definitions)
    term.name = term_data.name
    term.definitions = definitions

    await session.commit()
    await session.refresh(term)

    return term


@router.delete("/{term_ref}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    request: Request,
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="terms:write",
        user_id=current_user.id,
    )
    term = await _get_term_by_public_ref(session, term_ref)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден.",
        )

    await session.delete(term)
    await session.commit()


@router.get("/{term_ref}/definitions", response_model=list[DefinitionResponse])
async def get_term_definitions(
    request: Request,
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="terms:definitions",
        user_id=current_user.id,
    )
    term = await _get_term_by_public_ref(session, term_ref)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден",
        )

    return term.definitions


@router.get("/{term_ref}/definitions/{index}", response_model=DefinitionResponse)
async def get_term_definition(
    request: Request,
    term_ref: str,
    index: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="terms:definition",
        user_id=current_user.id,
    )
    term = await _get_term_by_public_ref(session, term_ref)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден",
        )

    definitions: list[Definition] = term.definitions
    if index < 0 or index >= len(definitions):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Определение не найдено",
        )

    return definitions[index]


@router.get("/{term_ref}/books_list", response_model=list[BookResponse])
async def get_term_books(
    request: Request,
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="terms:books",
        user_id=current_user.id,
    )
    term = await _get_term_by_public_ref(session, term_ref)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден",
        )

    return list({definition.topic.book.id: definition.topic.book for definition in term.definitions}.values())
