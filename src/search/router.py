import json
import logging
from typing import Annotated

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.celery_app.app import app as celery_app
from src.celery_app.search_task import process_query
from src.database import get_async_session
from src.redis_client import build_search_task_channel, get_async_redis_client
from src.search.schemas import SearchTaskCreateRequest, SearchTaskResponse
from src.search.service import (
    TERMINAL_TASK_STATUSES,
    assert_task_owner,
    build_sse_message,
    build_task_response,
    ensure_definition_search_limit,
    record_definition_search_usage,
    reserve_search_task_owner,
)
from src.terms.models import Term
from src.terms.repository import search_terms_by_prefix, search_terms_by_similarity
from src.terms.schemas import TermDetailedResponse
from src.users.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=list[TermDetailedResponse])
async def search_terms(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    query: Annotated[str, Query(min_length=1, max_length=255)],
    limit: Annotated[int, Query(ge=1, le=100)] = 10,
):
    terms: list[Term] | None = await search_terms_by_prefix(
        session,
        limit=limit,
        user_query=query,
    )

    if not terms:
        terms: list[Term] | None = await search_terms_by_prefix(
            session,
            limit=limit,
            user_query=query,
            prefix=False,
        )

    if not terms:
        terms: list[Term] | None = await search_terms_by_similarity(
            session,
            limit=limit,
            user_query=query,
        )

    if not terms:
        return []

    return terms


@router.post(
    "",
    response_model=SearchTaskResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_search_task(
    payload: SearchTaskCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    user_id = current_user.id
    logger.info(
        "Получен запрос на поисковую задачу от user_id=%s с длиной запроса=%s",
        user_id,
        len(payload.query),
    )
    await ensure_definition_search_limit(
        session=session,
        user_id=user_id,
    )
    await record_definition_search_usage(
        session=session,
        user_id=user_id,
    )

    task = process_query.delay(payload.query)
    await reserve_search_task_owner(task_id=task.id, user_id=user_id)

    logger.info(
        "Поисковая задача поставлена в очередь task_id=%s для user_id=%s",
        task.id,
        user_id,
    )
    return SearchTaskResponse(task_id=task.id, status="pending")


@router.get("/{task_id}", response_model=SearchTaskResponse)
async def get_search_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    user_id = current_user.id
    await assert_task_owner(task_id=task_id, user_id=user_id)
    result = AsyncResult(task_id, app=celery_app)
    logger.info(
        "Получен статус поисковой задачи task_id=%s user_id=%s raw_status=%s",
        task_id,
        user_id,
        result.status,
    )
    return SearchTaskResponse.model_validate(build_task_response(task_id, result))


@router.get("/{task_id}/events")
async def stream_search_task_events(
    task_id: str,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
):
    user_id = current_user.id
    await assert_task_owner(task_id=task_id, user_id=user_id)

    async def event_stream():
        logger.info(
            "Открывается SSE-поток для task_id=%s user_id=%s",
            task_id,
            user_id,
        )
        redis = get_async_redis_client()
        pubsub = redis.pubsub()
        channel = build_search_task_channel(task_id)

        await pubsub.subscribe(channel)
        try:
            current = build_task_response(
                task_id,
                AsyncResult(task_id, app=celery_app),
            )
            if current["status"] in TERMINAL_TASK_STATUSES:
                logger.info(
                    "SSE сразу возвращает терминальный ответ для task_id=%s status=%s",
                    task_id,
                    current["status"],
                )
                yield build_sse_message(current)
                return

            while True:
                if await request.is_disconnected():
                    logger.info("SSE-клиент отключился для task_id=%s", task_id)
                    return

                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                if message is None:
                    continue

                payload = json.loads(message["data"])
                logger.info(
                    "SSE-событие отправлено для task_id=%s status=%s",
                    task_id,
                    payload.get("status"),
                )
                yield build_sse_message(payload)
                return
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.aclose()
            await redis.aclose()
            logger.info("SSE-поток закрыт для task_id=%s", task_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
