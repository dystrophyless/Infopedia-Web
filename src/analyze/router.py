import json
import logging
from typing import Annotated
from uuid import uuid4

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.analyze.exceptions import InvalidAnalyzeDocumentError
from src.analyze.schemas import AnalyzeTaskResponse
from src.analyze.serialization import encode_file_content
from src.analyze.utils import (
    TERMINAL_TASK_STATUSES,
    assert_task_owner,
    build_sse_message,
    build_task_response,
    release_analyze_task_owner,
    reserve_analyze_task_owner,
)
from src.analyze.validation import validate_pdf_upload
from src.auth.dependencies import get_current_user
from src.celery_app.analyze_task import process_document
from src.celery_app.app import app as celery_app
from src.config import settings
from src.database import get_async_session
from src.redis_client import build_analyze_task_channel, get_async_redis_client
from src.users.models import User

logger = logging.getLogger(__name__)


router = APIRouter()


@router.post(
    "", response_model=AnalyzeTaskResponse, status_code=status.HTTP_202_ACCEPTED
)
async def create_analyze_task(
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    user_id = current_user.id
    logger.info(
        "Получен запрос на задачу анализа документа от user_id=%s",
        user_id,
    )

    content = await file.read()

    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Размер файла превышает допустимый лимит {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} МБ.",
        )

    try:
        validate_pdf_upload(content, content_type=file.content_type)
    except InvalidAnalyzeDocumentError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=exc.to_payload(),
        ) from exc

    task_id = str(uuid4())
    task_enqueued = False

    try:
        await reserve_analyze_task_owner(task_id=task_id, user_id=user_id)
        process_document.apply_async(
            kwargs={
                "user_id": user_id,
                "file_content_b64": encode_file_content(content),
            },
            task_id=task_id,
        )
        task_enqueued = True
        await session.commit()
    except Exception:
        await session.rollback()

        if task_enqueued:
            try:
                AsyncResult(task_id, app=celery_app).revoke(terminate=False)
            except Exception:
                logger.exception(
                    "Не удалось отозвать задачу анализа документа task_id=%s после ошибки",
                    task_id,
                )

        try:
            await release_analyze_task_owner(task_id=task_id)
        except Exception:
            logger.exception(
                "Не удалось очистить owner-ключ задачи анализа документа task_id=%s",
                task_id,
            )

        raise

    logger.info(
        "Задача анализа документа поставлена в очередь task_id=%s для user_id=%s",
        task_id,
        user_id,
    )
    return AnalyzeTaskResponse(task_id=task_id, status="pending")


@router.get("/{task_id}", response_model=AnalyzeTaskResponse)
async def get_analyze_task(
    task_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
):
    user_id = current_user.id
    await assert_task_owner(task_id=task_id, user_id=user_id)
    result = AsyncResult(task_id, app=celery_app)
    logger.info(
        "Получен статус задачи анализа документа task_id=%s user_id=%s raw_status=%s",
        task_id,
        user_id,
        result.status,
    )
    return AnalyzeTaskResponse.model_validate(build_task_response(task_id, result))


@router.get("/{task_id}/events")
async def stream_analyze_task_events(
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
        channel = build_analyze_task_channel(task_id)

        await pubsub.subscribe(channel)
        try:
            current = build_task_response(
                task_id,
                AsyncResult(task_id, app=celery_app),
            )
            yield build_sse_message(current)
            if current["status"] in TERMINAL_TASK_STATUSES:
                logger.info(
                    "SSE сразу возвращает терминальный ответ для task_id=%s status=%s",
                    task_id,
                    current["status"],
                )
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
                if payload.get("status") in TERMINAL_TASK_STATUSES:
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
