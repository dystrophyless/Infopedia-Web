import logging
import logging.config

from celery import Celery
from celery.signals import setup_logging, worker_init

from src.config import settings
from src.logging_settings import logging_config
from src.terms.service import get_embedder, get_reranker

logging.config.dictConfig(logging_config)
logger = logging.getLogger(__name__)

app = Celery(
    "app",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "src.celery_app.search_task",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    result_expires=settings.CELERY_RESULT_EXPIRES_SECONDS,
    timezone="Asia/Almaty",
    enable_utc=False,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    worker_max_memory_per_child=2_000_000,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_hijack_root_logger=False,
    worker_redirect_stdouts=False,
)


@worker_init.connect
def preload_models(**kwargs):
    logger.info("Прогрев embedder/reranker перед запуском prefork worker pool")
    get_embedder()
    get_reranker()
    logger.info("Модели прогреты")


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
