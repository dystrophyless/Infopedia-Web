import logging
import logging.config

from celery import Celery
from celery.signals import setup_logging

from src.config import settings
from src.logging_settings import logging_config

logging.config.dictConfig(logging_config)

app = Celery(
    "app",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=settings.CELERY_RESULT_EXPIRES_SECONDS,
    timezone="Asia/Almaty",
    enable_utc=False,
    task_track_started=True,
    task_routes={
        "search_task.process_query": {"queue": "search"},
        "email_task.send_email": {"queue": "emails"},
    },
    worker_prefetch_multiplier=1,
    worker_max_memory_per_child=2_000_000,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_hijack_root_logger=False,
    worker_redirect_stdouts=False,
)


@setup_logging.connect
def _disable_celery_noise(*args, **kwargs):
    for name in (
        "celery",
        "celery.app.trace",
        "celery.worker",
        "celery.redirected",
        "kombu",
        "amqp",
        "billiard",
    ):
        logging.getLogger(name).setLevel(logging.INFO)
