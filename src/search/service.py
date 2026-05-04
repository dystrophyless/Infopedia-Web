import json
import logging

from celery.result import AsyncResult
from fastapi import HTTPException, status
from sqlalchemy import select

from src.config import settings
from src.redis_client import (
    build_search_task_owner_key,
    get_async_redis_client,
)
from src.users.enums import Feature
from src.users.models import User
from src.users.repository import get_users_feature_usage_count, log_feature_usage

logger = logging.getLogger(__name__)

TERMINAL_TASK_STATUSES = {"success", "failure"}


def normalize_celery_status(raw_status: str) -> str:
    mapping = {
        "PENDING": "pending",
        "STARTED": "started",
        "SUCCESS": "success",
        "FAILURE": "failure",
    }
    return mapping.get(raw_status, "pending")


async def assert_task_owner(*, task_id: str, user_id: int) -> None:
    redis = get_async_redis_client()
    try:
        owner_id = await redis.get(build_search_task_owner_key(task_id))
    finally:
        await redis.aclose()

    if owner_id != str(user_id):
        logger.warning(
            "Проверка владельца поисковой задачи не пройдена для task_id=%s user_id=%s owner_id=%s",
            task_id,
            user_id,
            owner_id,
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Поисковая задача не найдена",
        )


def build_task_response(task_id: str, result: AsyncResult) -> dict:
    payload = result.result if isinstance(result.result, dict) else None
    if payload is not None:
        payload_status = payload.get("status")
        status_value = (
            payload_status
            if payload_status in {"pending", "started", "success", "failure"}
            else normalize_celery_status(result.status)
        )
        return {
            "task_id": task_id,
            "status": status_value,
            "result": payload.get("result"),
            "error": payload.get("error"),
        }

    if result.status == "FAILURE":
        return {
            "task_id": task_id,
            "status": "failure",
            "result": None,
            "error": {
                "code": "search_execution_failed",
                "message": "Не удалось выполнить задачу поиска определения.",
            },
        }

    return {
        "task_id": task_id,
        "status": normalize_celery_status(result.status),
        "result": None,
        "error": None,
    }


def build_sse_message(payload: dict) -> str:
    event_name = (
        "task.failed" if payload.get("status") == "failure" else "task.completed"
    )
    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def reserve_search_task_owner(*, task_id: str, user_id: int) -> None:
    redis = get_async_redis_client()
    try:
        await redis.setex(
            build_search_task_owner_key(task_id),
            settings.search_task_owner_ttl_seconds,
            str(user_id),
        )
    finally:
        await redis.aclose()


async def release_search_task_owner(*, task_id: str) -> None:
    redis = get_async_redis_client()
    try:
        await redis.delete(build_search_task_owner_key(task_id))
    finally:
        await redis.aclose()


async def consume_definition_search_quota(*, session, user_id: int) -> None:
    # Serialize monthly quota consumption per user inside the current transaction.
    await session.execute(
        select(User.id).where(User.id == user_id).with_for_update(),
    )

    used = await get_users_feature_usage_count(
        session,
        user_id=user_id,
        feature=Feature.DEFINITION_SEARCH,
    )
    limit = Feature.DEFINITION_SEARCH.limit

    if used >= limit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "feature_limit_reached",
                "feature": "definition_search",
                "period": "month",
                "limit": limit,
                "message": "Превышен месячный лимит на поиск определений.",
            },
        )


    await log_feature_usage(
        session,
        user_id=user_id,
        feature=Feature.DEFINITION_SEARCH,
    )
