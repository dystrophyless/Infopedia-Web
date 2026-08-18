from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.config import settings
from src.database import get_async_session
from src.security.anti_scrape import enforce_anti_scrape
from src.security.public_refs import InvalidPublicRef, decode_public_ref
from src.topics.models import Topic
from src.topics.repository import (
    get_all_books,
    get_all_chapters,
    get_all_topics,
    get_topic_by_id,
    get_topics_by_book_id,
    get_topics_by_chapter_id,
)
from src.topics.schemas import BookResponse, ChapterResponse, TopicDetailedResponse, TopicResponse
from src.users.models import User

router = APIRouter()


def _decode_public_ref_or_404(namespace: str, value: str) -> int:
    try:
        return decode_public_ref(namespace, value)
    except InvalidPublicRef:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        ) from None


@router.get("", response_model=list[TopicResponse])
async def get_topics(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=settings.ANTI_SCRAPE_MAX_TERMS_PAGE_SIZE)] = 10,
):
    await enforce_anti_scrape(
        request,
        scope="topics:list",
        user_id=current_user.id,
    )
    topics: list[Topic] | None = await get_all_topics(
        session,
        skip=skip,
        limit=limit,
    )

    if not topics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Темы не найдены.",
        )

    return topics


@router.get("/books", response_model=list[BookResponse])
async def get_book_catalog(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="topics:books",
        user_id=current_user.id,
    )

    return await get_all_books(session)


@router.get("/chapters", response_model=list[ChapterResponse])
async def get_chapter_catalog(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    locale: Annotated[Literal["kk", "ru"], Query()] = "kk",
):
    await enforce_anti_scrape(
        request,
        scope="topics:chapters",
        user_id=current_user.id,
    )

    return await get_all_chapters(session, locale=locale)


@router.get("/book/{book_ref}", response_model=list[TopicResponse])
async def get_topics_by_book(
    request: Request,
    book_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="topics:book",
        user_id=current_user.id,
    )
    book_id = _decode_public_ref_or_404("book", book_ref)
    topics: list[Topic] | None = await get_topics_by_book_id(session, book_id=book_id)

    if not topics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Темы для книги не найдены.",
        )

    return topics


@router.get("/chapter/{chapter_ref}", response_model=list[TopicResponse])
async def get_topics_by_chapter(
    request: Request,
    chapter_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    await enforce_anti_scrape(
        request,
        scope="topics:chapter",
        user_id=current_user.id,
    )
    chapter_id = _decode_public_ref_or_404("chapter", chapter_ref)
    topics: list[Topic] | None = await get_topics_by_chapter_id(
        session,
        chapter_id=chapter_id,
    )

    if not topics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Темы для главы не найдены.",
        )

    return topics


@router.get("/{topic_ref}", response_model=TopicDetailedResponse)
async def get_topic(
    request: Request,
    topic_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    locale: Annotated[Literal["kk", "ru"], Query()] = "kk",
):
    await enforce_anti_scrape(
        request,
        scope="topics:detail",
        user_id=current_user.id,
    )
    topic_id = _decode_public_ref_or_404("topic", topic_ref)
    topic: Topic | None = await get_topic_by_id(
        session,
        topic_id=topic_id,
        locale=locale,
    )

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Тема не найдена.",
        )

    return topic
