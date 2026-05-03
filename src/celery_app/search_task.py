import asyncio
import json
import logging

from src.celery_app.app import app
from src.database import AsyncSessionMaker
from src.redis_client import build_search_task_channel, get_async_redis_client
from src.terms.service import get_search_result

logger = logging.getLogger(__name__)


def build_task_payload(
    *,
    task_id: str,
    status: str,
    result: dict | None = None,
    error: dict | None = None,
) -> dict:
    return {
        "task_id": task_id,
        "status": status,
        "result": result,
        "error": error,
    }


async def _publish_task_event(task_id: str, payload: dict) -> None:
    logger.info(
        "Публикуем событие задачи task_id=%s status=%s",
        task_id,
        payload.get("status"),
    )
    redis = get_async_redis_client()
    try:
        await redis.publish(
            build_search_task_channel(task_id),
            json.dumps(payload),
        )
    finally:
        await redis.aclose()


async def _process_query_async(
    *,
    task_id: str,
    query: str,
) -> dict:
    logger.info("Начата обработка поисковой задачи task_id=%s", task_id)
    async with AsyncSessionMaker() as session:
        result = await get_search_result(
            session,
            query=query,
        )

    logger.info(
        "Завершена поисковая задача task_id=%s found_result=%s",
        task_id,
        result is not None,
    )
    return build_task_payload(
        task_id=task_id,
        status="success",
        result=result,
        error=None,
    )


async def _run_task_async(
    *,
    task_id: str,
    query: str,
) -> dict:
    try:
        payload = await _process_query_async(
            task_id=task_id,
            query=query,
        )
    except Exception:
        logger.exception("Ошибка при выполнении задачи поиска определения")
        payload = build_task_payload(
            task_id=task_id,
            status="failure",
            result=None,
            error={
                "code": "search_execution_failed",
                "message": "Definition search task failed.",
            },
        )

    await _publish_task_event(task_id, payload)
    return payload


@app.task(
    bind=True,
    name="search_task.process_query",
)
def process_query(
    self,
    query: str,
) -> dict:
    logger.info("Celery принял задачу task_id=%s", self.request.id)
    return asyncio.run(
        _run_task_async(
            task_id=self.request.id,
            query=query,
        ),
    )
