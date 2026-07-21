from collections.abc import Sequence
from typing import Iterable

from src.analyze.models import AnalyzeResultItem


def select_free_chapter_id(items: Sequence[AnalyzeResultItem]) -> int | None:
    """Return the deterministic free-tier chapter for an Analyze result."""

    if not items:
        return None

    weak_items = [item for item in items if item.max_score - item.score > 0]
    if not weak_items:
        return None

    selected_item = min(
        weak_items,
        key=lambda item: (
            -(item.max_score - item.score),
            item.percentage,
            -item.question_count,
            item.chapter_id,
        ),
    )
    return selected_item.chapter_id


def material_grades_from_topic_code_names(names: Iterable[object]) -> list[int]:
    """Return sorted, unique school grades encoded by topic-code names."""

    grades: set[int] = set()
    for name in names:
        if not isinstance(name, str):
            continue
        first_segment = name.strip().split(".", 1)[0]
        try:
            grade = int(first_segment)
        except (TypeError, ValueError):
            continue
        if 7 <= grade <= 11:
            grades.add(grade)
    return sorted(grades)
