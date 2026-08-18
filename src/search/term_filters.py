from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

from src.security.public_refs import InvalidPublicRef, decode_public_ref

MAX_FILTER_VALUES_PER_KIND = 25
MAX_TOTAL_FILTER_VALUES = 50
INVALID_SEARCH_FILTERS_DETAIL = "Invalid search filters."
MIN_GRADE = 7
MAX_GRADE = 11
MAX_QUERY_LENGTH = 255


class InvalidTermSearchFiltersError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class TermSearchFilters:
    query: str
    grades: tuple[int, ...]
    book_ids: tuple[int, ...]
    chapter_ids: tuple[int, ...]
    ent_only: bool


def _invalid_filters() -> InvalidTermSearchFiltersError:
    return InvalidTermSearchFiltersError(INVALID_SEARCH_FILTERS_DETAIL)


def _bounded(values_by_kind: Iterable[list[object]]) -> None:
    values = list(values_by_kind)
    if any(len(items) > MAX_FILTER_VALUES_PER_KIND for items in values):
        raise _invalid_filters()
    if sum(len(items) for items in values) > MAX_TOTAL_FILTER_VALUES:
        raise _invalid_filters()


def _parse_grades(raw_grades: list[object]) -> tuple[int, ...]:
    grades: set[int] = set()
    for raw_grade in raw_grades:
        if isinstance(raw_grade, bool):
            raise _invalid_filters()
        try:
            grade = int(raw_grade)
        except (TypeError, ValueError):
            raise _invalid_filters() from None
        if str(raw_grade) != str(grade) or not MIN_GRADE <= grade <= MAX_GRADE:
            raise _invalid_filters()
        grades.add(grade)
    return tuple(sorted(grades))


def _decode_refs(namespace: str, public_refs: list[str]) -> tuple[int, ...]:
    values: set[int] = set()
    for public_ref in public_refs:
        try:
            values.add(decode_public_ref(namespace, public_ref))
        except (InvalidPublicRef, TypeError):
            raise _invalid_filters() from None
    return tuple(sorted(values))


def parse_term_search_filters(
    *,
    query: str,
    grades: list[object],
    book_refs: list[str],
    chapter_refs: list[str],
    ent_only: bool,
) -> TermSearchFilters:
    _bounded((grades, book_refs, chapter_refs))
    normalized_query = query.strip()
    if len(normalized_query) > MAX_QUERY_LENGTH:
        raise _invalid_filters()
    return TermSearchFilters(
        query=normalized_query,
        grades=_parse_grades(grades),
        book_ids=_decode_refs("book", book_refs),
        chapter_ids=_decode_refs("chapter", chapter_refs),
        ent_only=ent_only,
    )
