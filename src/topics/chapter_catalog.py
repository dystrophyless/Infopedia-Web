import json
from pathlib import Path
from typing import Any


CHAPTER_CATALOG_PATH = Path(__file__).resolve().parents[1] / "data" / "chapterCatalog.json"


def normalize_chapter(value: str) -> str:
    return " ".join(str(value).casefold().strip().split())


def load_chapter_catalog(path: str | Path = CHAPTER_CATALOG_PATH) -> list[dict[str, Any]]:
    with open(path, encoding="utf-8") as file:
        payload = json.load(file)
    chapters = payload.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        raise ValueError("chapterCatalog.json must contain a non-empty chapters list")
    return chapters
