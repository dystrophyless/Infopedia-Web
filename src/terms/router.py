import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_async_session
from src.terms.models import Definition, Term
from src.terms.repository import (
    check_if_term_exists,
    count_terms,
    get_term_by_id,
    get_terms_paginated,
)
from src.terms.schemas import (
    DefinitionResponse,
    PaginatedTermsResponse,
    TermCreate,
    TermDetailedResponse,
    TermResponse,
    TermUpdate,
)
from src.terms.service import get_embedder
from src.topics.repository import get_topic_by_name
from src.topics.schemas import BookResponse

router = APIRouter()


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
    session: Annotated[AsyncSession, Depends(get_async_session)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
):
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


@router.post(
    "", response_model=TermDetailedResponse, status_code=status.HTTP_201_CREATED
)
async def create_term(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    term_data: TermCreate,
):
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
            detail=f"Созданный термин с ID '{new_term.id}' не найден.",
        )

    return term


@router.get("/{term_id}", response_model=TermDetailedResponse)
async def get_term(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    term_id: int,
):
    term: Term | None = await get_term_by_id(session, id=term_id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Термин с ID '{term_id}' не найден.",
        )

    return term


@router.patch("/{term_id}", response_model=TermDetailedResponse)
async def update_term(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    term_id: int,
    term_data: TermUpdate,
):
    term: Term | None = await get_term_by_id(session, id=term_id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Термин с ID '{term_id}' не найден.",
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


@router.delete("/{term_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_term(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    term_id: int,
):
    term: Term | None = await get_term_by_id(session, id=term_id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Термин с ID '{term_id}' не найден.",
        )

    await session.delete(term)
    await session.commit()


@router.get("/{term_id}/definitions", response_model=list[DefinitionResponse])
async def get_term_definitions(
    term_id: int,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    term: Term | None = await get_term_by_id(session, id=term_id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден",
        )

    return term.definitions


@router.get("/{term_id}/definitions/{index}", response_model=DefinitionResponse)
async def get_term_definition(
    term_id: int,
    index: int,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    term: Term | None = await get_term_by_id(session, id=term_id)

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


@router.get("/{term_id}/books_list", response_model=list[BookResponse])
async def get_term_books(
    term_id: int,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    term: Term | None = await get_term_by_id(session, id=term_id)

    if not term:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Термин не найден",
        )

    return list({definition.topic.book.id: definition.topic.book for definition in term.definitions}.values())
