import logging

from celery.signals import worker_init

import src.models  # noqa: F401
from src.analyze.client import init_llmwhisperer_client
from src.celery_app import analyze_task  # noqa: F401
from src.celery_app.app import app  # noqa: F401

logger = logging.getLogger(__name__)


@worker_init.connect
def preload_models(**kwargs):
    logger.info("Инициализировал клиент LLMWhisperer")
    init_llmwhisperer_client()
