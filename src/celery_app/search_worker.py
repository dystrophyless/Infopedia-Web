import logging

from celery.signals import worker_init

from src.celery_app import search_task  # noqa: F401
from src.celery_app.app import app  # noqa: F401
from src.terms.service import get_embedder, get_reranker

logger = logging.getLogger(__name__)


@worker_init.connect
def preload_models(**kwargs):
    logger.info("Прогрев embedder/reranker перед запуском search worker")
    get_embedder()
    get_reranker()
    logger.info("Модели прогреты")
