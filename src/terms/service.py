import logging
from pathlib import Path

import torch
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

device = "cuda" if torch.cuda.is_available() else "cpu"
cache_dir = str(Path.home() / ".cache" / "huggingface")

_embedder: SentenceTransformer | None = None


def get_embedder() -> SentenceTransformer:
    global _embedder

    if _embedder is None:
        logger.info("Инициализация embedder: BAAI/bge-m3")
        _embedder = SentenceTransformer(
            "BAAI/bge-m3",
            device=device,
            cache_folder=cache_dir,
        )
        logger.info("Embedder инициализирован")

    return _embedder
