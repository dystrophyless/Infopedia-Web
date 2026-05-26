from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_async_session
from src.topics.models import Topic
from src.topics.repository import (
    get_all_topics,
    get_topic_by_id,
    get_topics_by_book_id,
    get_topics_by_chapter_id,
)
from src.topics.schemas import TopicDetailedResponse, TopicResponse

router = APIRouter()


@router.get("", response_model=list[TopicResponse])
async def get_topics(
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    topics: list[Topic] | None = await get_all_topics(session)

    if not topics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Темы не найдены.",
        )

    return topics


@router.get("/book/{book_id}", response_model=list[TopicResponse])
async def get_topics_by_book(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    book_id: int,
):
    topics: list[Topic] | None = await get_topics_by_book_id(session, book_id=book_id)

    if not topics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Темы для книги с ID '{book_id}' не найдены.",
        )

    return topics


@router.get("/chapter/{chapter_id}", response_model=list[TopicResponse])
async def get_topics_by_chapter(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    chapter_id: int,
):
    topics: list[Topic] | None = await get_topics_by_chapter_id(
        session, chapter_id=chapter_id
    )

    if not topics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Темы для главы с ID '{chapter_id}' не найдены.",
        )

    return topics


@router.get("/{topic_id}", response_model=TopicDetailedResponse)
async def get_topic(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    topic_id: int,
):
    topic: Topic | None = await get_topic_by_id(session, topic_id=topic_id)

    if topic is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Тема с ID '{topic_id}' не найдена.",
        )

    return topic
