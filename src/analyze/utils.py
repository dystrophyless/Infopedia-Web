import json
import logging
from typing import Any

from celery.result import AsyncResult
from fastapi import HTTPException, status
from pydantic import ValidationError

from src.analyze.projection import select_free_chapter_id
from src.analyze.schemas import AnalyzeChapterResult
from src.config import settings
from src.redis_client import build_analyze_task_owner_key, get_async_redis_client

logger = logging.getLogger(__name__)

TERMINAL_TASK_STATUSES = {"success", "failure"}
TASK_STATUSES = {"pending", "started", "success", "failure"}


def sanitize_analyze_result(result: Any) -> list[dict]:
    """Return a fail-closed Analyze projection with topic payload only for free chapter."""

    if not isinstance(result, list):
        return []

    try:
        validated_results = [
            AnalyzeChapterResult.model_validate(item) for item in result
        ]
    except (TypeError, ValueError, ValidationError):
        return []

    free_chapter_id = select_free_chapter_id(validated_results)
    sanitized_results = []
    for item in validated_results:
        payload = item.model_dump()
        payload["material_grades"] = sorted(
            {
                grade
                for grade in payload.get("material_grades", [])
                if 7 <= grade <= 11
            }
        )
        if item.chapter_id != free_chapter_id:
            payload["topic_codes"] = []
        sanitized_results.append(payload)

    return sanitized_results


def sanitize_analyze_task_payload(payload: Any) -> dict:
    """Keep only the public task envelope and sanitize its result before serialization."""

    if not isinstance(payload, dict):
        return {}

    return {
        "task_id": payload.get("task_id"),
        "status": payload.get("status"),
        "stage": payload.get("stage"),
        "result": (
            None
            if payload.get("result") is None
            else sanitize_analyze_result(payload.get("result"))
        ),
        "error": payload.get("error"),
    }


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
        owner_id = await redis.get(build_analyze_task_owner_key(task_id))
    finally:
        await redis.aclose()

    if owner_id != str(user_id):
        logger.warning(
            "Проверка владельца задачи анализа документа не пройдена "
            "code=analyze_task_forbidden stage=authorization_failed "
            "reason=task_owner_mismatch",
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Задача анализа документа не найдена",
        )


def build_task_response(task_id: str, result: AsyncResult) -> dict:
    payload = result.result if isinstance(result.result, dict) else None
    if payload is not None:
        payload_status = payload.get("status")
        status_value = (
            payload_status
            if payload_status in TASK_STATUSES
            else normalize_celery_status(result.status)
        )
        return sanitize_analyze_task_payload({
            "task_id": task_id,
            "status": status_value,
            "stage": payload.get("stage"),
            "result": payload.get("result"),
            "error": payload.get("error"),
        })

    if result.status == "FAILURE":
        return {
            "task_id": task_id,
            "status": "failure",
            "stage": "failed",
            "result": None,
            "error": {
                "code": "analyze_execution_failed",
                "message": "Не удалось выполнить задачу анализа документа.",
            },
        }

    return {
        "task_id": task_id,
        "status": normalize_celery_status(result.status),
        "stage": None,
        "result": None,
        "error": None,
    }


def build_sse_message(payload: dict) -> str:
    payload = sanitize_analyze_task_payload(payload)
    event_name_by_status = {
        "pending": "task.pending",
        "started": "task.started",
        "success": "task.completed",
        "failure": "task.failed",
    }
    event_name = event_name_by_status.get(payload.get("status"), "task.updated")
    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def reserve_analyze_task_owner(*, task_id: str, user_id: int) -> None:
    redis = get_async_redis_client()
    try:
        await redis.setex(
            build_analyze_task_owner_key(task_id),
            settings.ANALYZE_TASK_OWNER_TTL_SECONDS,
            str(user_id),
        )
    finally:
        await redis.aclose()


async def release_analyze_task_owner(*, task_id: str) -> None:
    redis = get_async_redis_client()
    try:
        await redis.delete(build_analyze_task_owner_key(task_id))
    finally:
        await redis.aclose()
