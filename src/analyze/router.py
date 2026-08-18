import json
import logging
from typing import Annotated, Literal
from uuid import uuid4

from celery.result import AsyncResult
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.analyze.exceptions import InvalidAnalyzeDocumentError
from src.analyze.locale import normalize_analyze_locale
from src.analyze.projection import select_free_chapter_id
from src.analyze.repository import (
    get_analyze_result_by_user_id,
    get_topic_material_summaries_by_chapter_ids,
    get_topic_codes_by_chapter_ids,
)
from src.analyze.schemas import AnalyzeChapterResult, AnalyzeTaskResponse
from src.analyze.serialization import encode_file_content
from src.analyze.utils import (
    TERMINAL_TASK_STATUSES,
    assert_task_owner,
    build_sse_message,
    build_task_response,
    release_analyze_task_owner,
    reserve_analyze_task_owner,
    sanitize_analyze_result,
)
from src.analyze.validation import PDF_CONTENT_TYPES, validate_pdf_upload
from src.auth.dependencies import get_current_user
from src.celery_app.analyze_task import process_document
from src.celery_app.app import app as celery_app
from src.config import settings
from src.database import get_async_session
from src.redis_client import build_analyze_task_channel, get_async_redis_client
from src.topics.repository import get_books_coverage_by_chapter_ids
from src.users.models import User

logger = logging.getLogger(__name__)


router = APIRouter()


@router.post(
    "", response_model=AnalyzeTaskResponse, status_code=status.HTTP_202_ACCEPTED
)
async def create_analyze_task(
    file: Annotated[UploadFile, File(...)],
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    locale: Annotated[Literal["kk", "ru"], Form()] = "kk",
):
    user_id = current_user.id
    logger.info(
        "Получен запрос на задачу анализа документа от user_id=%s",
        user_id,
    )

    content = await file.read()

    if len(content) > settings.MAX_UPLOAD_SIZE_BYTES:
        logger.warning(
            "Размер файла анализа превышен "
            "code=file_too_large stage=validation_failed reason=upload_size_exceeded "
            "size_bytes=%s max_size_bytes=%s",
            len(content),
            settings.MAX_UPLOAD_SIZE_BYTES,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Размер файла превышает допустимый лимит {settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} МБ.",
        )

    try:
        validate_pdf_upload(content, content_type=file.content_type)
    except InvalidAnalyzeDocumentError as exc:
        reason = exc.reason or "invalid_pdf"
        logger.warning(
            "Проверка файла анализа завершилась ошибкой "
            "code=%s stage=%s reason=%s content_type=%s filename_present=%s size_bytes=%s",
            exc.code,
            exc.stage,
            reason,
            file.content_type,
            bool(file.filename),
            len(content),
        )
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
                "locale": normalize_analyze_locale(locale),
            },
            task_id=task_id,
        )
        task_enqueued = True
        await session.commit()
    except Exception:
        logger.error(
            "Не удалось поставить задачу анализа документа в очередь "
            "code=analyze_task_enqueue_failed stage=enqueue_failed "
            "reason=unexpected_exception",
        )
        await session.rollback()

        if task_enqueued:
            try:
                AsyncResult(task_id, app=celery_app).revoke(terminate=False)
            except Exception:
                logger.warning(
                    "code=analyze_cleanup_failed stage=cleanup_failed "
                    "reason=task_revoke_failed " +
                    "Не удалось отозвать задачу анализа документа task_id=%s после ошибки",
                    task_id,
                )

        try:
            await release_analyze_task_owner(task_id=task_id)
        except Exception:
            logger.warning(
                "code=analyze_cleanup_failed stage=cleanup_failed "
                "reason=owner_release_failed " +
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


@router.get("/latest", response_model=list[AnalyzeChapterResult])
async def get_latest_analyze_result(
    session: Annotated[AsyncSession, Depends(get_async_session)],
    current_user: Annotated[User, Depends(get_current_user)],
    locale: Annotated[Literal["kk", "ru"], Query()] = "kk",
):
    analyze_result = await get_analyze_result_by_user_id(
        session,
        user_id=current_user.id,
        locale=locale,
    )
    if analyze_result is None:
        return []

    coverage_by_chapter = await get_books_coverage_by_chapter_ids(
        session,
        chapter_ids=[item.chapter_id for item in analyze_result.items],
    )
    topic_material_summaries_by_chapter = await get_topic_material_summaries_by_chapter_ids(
        session,
        chapter_ids=[item.chapter_id for item in analyze_result.items],
    )
    free_id = select_free_chapter_id(analyze_result.items)
    topic_codes_by_chapter = await get_topic_codes_by_chapter_ids(
        session,
        chapter_ids=[free_id] if free_id is not None else [],
        locale=locale,
    )

    raw_results = [
        AnalyzeChapterResult(
            chapter_id=item.chapter_id,
            code=item.chapter.code,
            title=item.chapter.title,
            question_count=item.question_count,
            max_score=item.max_score,
            score=item.score,
            percentage=item.percentage,
            books=coverage_by_chapter.get(item.chapter_id, []),
            topic_count=topic_material_summaries_by_chapter.get(
                item.chapter_id,
                {"topic_count": 0, "material_grades": []},
            )["topic_count"],
            material_grades=topic_material_summaries_by_chapter.get(
                item.chapter_id,
                {"topic_count": 0, "material_grades": []},
            )["material_grades"],
            topic_codes=(
                topic_codes_by_chapter.get(free_id, [])
                if item.chapter_id == free_id
                else []
            ),
        )
        for item in analyze_result.items
    ]
    return [
        AnalyzeChapterResult.model_validate(item)
        for item in sanitize_analyze_result(raw_results)
    ]


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
