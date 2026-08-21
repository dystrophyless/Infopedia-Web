import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

cache_dir = str(Path.home() / ".cache" / "huggingface")

_embedder: Any | None = None


def get_embedder():
    global _embedder

    if _embedder is None:
        import torch
        from sentence_transformers import SentenceTransformer

        device = "cuda" if torch.cuda.is_available() else "cpu"

        logger.info("Инициализация embedder: BAAI/bge-m3")

        _embedder = SentenceTransformer(
            "BAAI/bge-m3",
            device=device,
            cache_folder=cache_dir,
        )

        logger.info("Embedder инициализирован")

    return _embedder