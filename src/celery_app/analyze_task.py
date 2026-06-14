import json
import logging

from asgiref.sync import async_to_sync

from src.analyze.service import get_analyze_result
from src.celery_app.app import app
from src.database import AsyncSessionMaker
from src.redis_client import build_analyze_task_channel, get_async_redis_client

logger = logging.getLogger(__name__)


def build_analyze_task_payload(
    task_id: str,
    *,
    status: str,
    stage: str | None = None,
    result=None,
    error: dict | None = None,
) -> dict:
    return {
        "task_id": task_id,
        "status": status,
        "stage": stage,
        "result": result,
        "error": error,
    }


async def publish_analyze_task_event(task_id: str, payload: dict) -> None:
    logger.info(
        "Публикуем событие задачи task_id=%s status=%s",
        task_id,
        payload.get("status"),
    )

    redis = get_async_redis_client()
    try:
        await redis.publish(build_analyze_task_channel(task_id), json.dumps(payload))
    finally:
        await redis.aclose()


async def publish_analyze_task_progress(task_id: str, stage: str) -> None:
    await publish_analyze_task_event(
        task_id,
        build_analyze_task_payload(task_id, status="started", stage=stage),
    )


async def run_analyze_task(*, task_id: str, user_id: int, file_content: bytes) -> dict:
    try:
        logger.info("Начата обработка задачи анализа документа task_id=%s", task_id)
        await publish_analyze_task_progress(task_id, "started")

        async def emit_progress(stage: str) -> None:
            await publish_analyze_task_progress(task_id, stage)

        async with AsyncSessionMaker() as session:
            result = await get_analyze_result(
                session,
                user_id=user_id,
                file_content=file_content,
                emit_progress=emit_progress,
            )

        logger.info(
            "Завершена задача анализа документа task_id=%s found_result=%s",
            task_id,
            result is not None,
        )
        payload = build_analyze_task_payload(
            task_id,
            status="success",
            stage="completed",
            result=result,
        )
    except Exception:
        logger.exception("Ошибка при выполнении задачи анализа документа")
        payload = build_analyze_task_payload(
            task_id,
            status="failure",
            stage="failed",
            error={
                "code": "analyze_execution_failed",
                "message": "Не удалось выполнить задачу анализа документа.",
            },
        )

    await publish_analyze_task_event(task_id, payload)
    return payload


@app.task(
    bind=True,
    name="analyze_task.process_document",
)
def process_document(self, user_id: int, file_content: bytes) -> dict:
    logger.info("Celery принял задачу task_id=%s", self.request.id)
    return async_to_sync(run_analyze_task)(
        task_id=self.request.id, user_id=user_id, file_content=file_content
    )
