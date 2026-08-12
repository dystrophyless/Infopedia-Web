from __future__ import annotations

import math
import random
from collections import defaultdict
from collections.abc import Callable, Iterable, Sequence
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.analyze.repository import get_latest_analyze_result_for_tests
from src.config import settings
from src.security.public_refs import (
    InvalidPublicRef,
    decode_public_ref,
    encode_public_ref,
)
from src.tests.errors import (
    AnswerAlreadySubmittedError,
    AttemptCompletedError,
    AttemptIncompleteError,
    AttemptNotFoundError,
    TestCatalogStaleError,
    TestModeUnavailableError,
)
from src.tests.models import (
    TestAttempt,
    TestAttemptAnswer,
    TestAttemptQuestion,
    TestQuestion,
)
from src.tests.repository import (
    eligible_chapters,
    get_attempt,
    get_attempt_for_update,
    get_attempt_question_for_update,
    get_previous_completed_attempt,
    list_chapters,
    list_completed_attempts,
    list_questions,
    lock_attempt_questions,
    question_counts_by_chapter,
    read_dashboard_catalog_snapshot,
    read_dashboard_history,
)
from src.topics.chapter_catalog import load_chapter_catalog
from src.topics.models import Chapter

WEAK_ACCURACY_THRESHOLD = 50
WEAK_CHAPTER_COUNT = 3
QuestionSampler = Callable[[Sequence[TestQuestion], int], list[TestQuestion]]

if TYPE_CHECKING:
    from src.tests.schemas import TestMode


def _utc(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(UTC)
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _round_metric(value: float) -> int | float:
    rounded = round(value, 2)
    return int(rounded) if float(rounded).is_integer() else rounded


def _answer_weight(answer: object | None) -> float:
    if answer is None:
        return 0.0
    raw = getattr(answer, "awarded_weight", 0)
    try:
        return max(0.0, float(raw))
    except (TypeError, ValueError):
        return 0.0


def compute_attempt_summary(
    questions: Sequence[object],
    answers: dict[object, object],
    *,
    started_at: datetime,
    completed_at: datetime,
) -> dict[str, Any]:
    total_questions = len(questions)
    answered_questions = 0
    correct_answer_count = 0
    mistakes: dict[str, dict[str, Any]] = {}
    for question in questions:
        question_id = getattr(question, "id", None)
        answer = answers.get(question_id) or answers.get(str(question_id))
        if answer is None:
            continue
        answered_questions += 1
        weight = _answer_weight(answer)
        correct_answer_count += int(weight > 0)
        raw_topic_id = getattr(question, "chapter_id", "unknown")
        try:
            topic_id = encode_public_ref("chapter", int(raw_topic_id))
        except (TypeError, ValueError):
            topic_id = str(raw_topic_id)
        if weight <= 0:
            topic = mistakes.setdefault(
                topic_id,
                {
                    "topic_id": topic_id,
                    "topic_title": getattr(question, "topic_title", ""),
                    "mistake_count": 0,
                    "question_count": getattr(question, "question_count", 0),
                    "estimated_minutes": getattr(question, "estimated_minutes", 0),
                },
            )
            topic["mistake_count"] += 1

    duration_seconds = max(0, int((_utc(completed_at) - _utc(started_at)).total_seconds()))
    average_pace_seconds = math.ceil(duration_seconds / total_questions) if total_questions else 0
    score_percent = round((correct_answer_count / total_questions) * 100, 2) if total_questions else 0
    weak_topic = next(
        iter(sorted(mistakes.values(), key=lambda value: (-value["mistake_count"], value["topic_id"]))),
        None,
    )
    return {
        "correct_answer_count": correct_answer_count,
        "total_questions": total_questions,
        "answered_questions": answered_questions,
        "score_percent": _round_metric(score_percent),
        "duration_seconds": duration_seconds,
        "average_pace_seconds": average_pace_seconds,
        "weak_topic": weak_topic,
    }


def _attempt_chapter_scores(attempt: object) -> dict[object, tuple[float, float]]:
    raw = getattr(attempt, "chapter_scores", None)
    if isinstance(raw, dict):
        return {key: (float(value[0]), float(value[1])) for key, value in raw.items()}
    scores: dict[object, list[float]] = defaultdict(lambda: [0.0, 0.0])
    for question in getattr(attempt, "questions", []) or []:
        chapter_id = getattr(question, "chapter_id", "unknown")
        scores[chapter_id][1] += 1
        scores[chapter_id][0] += _answer_weight(getattr(question, "answer", None))
    return {key: (value[0], value[1]) for key, value in scores.items()}


def _aggregate_attempts(attempts: Iterable[object]) -> tuple[float, float, dict[object, tuple[float, float]]]:
    numerator = 0.0
    denominator = 0.0
    chapter_values: dict[object, list[float]] = defaultdict(lambda: [0.0, 0.0])
    for attempt in attempts:
        total = float(getattr(attempt, "questions_total", getattr(attempt, "total_questions", 0)) or 0)
        score_percent = getattr(attempt, "score_percent", None)
        if total and score_percent is not None:
            numerator += float(score_percent) * total / 100
            denominator += total
        for chapter_id, (chapter_numerator, chapter_denominator) in _attempt_chapter_scores(attempt).items():
            chapter_values[chapter_id][0] += chapter_numerator
            chapter_values[chapter_id][1] += chapter_denominator
    return numerator, denominator, {key: (value[0], value[1]) for key, value in chapter_values.items()}


def compute_dashboard_metrics(
    attempts: Sequence[object],
    *,
    now: datetime,
    window_days: int = 7,
) -> dict[str, Any]:
    now = _utc(now)
    current_start = now - timedelta(days=window_days)
    previous_start = now - timedelta(days=window_days * 2)
    completed = [attempt for attempt in attempts if getattr(attempt, "completed_at", None) is not None]

    def in_window(attempt: object, start: datetime, end: datetime) -> bool:
        value = _utc(getattr(attempt, "completed_at", None))
        return start <= value < end

    current = [attempt for attempt in completed if in_window(attempt, current_start, now)]
    previous = [attempt for attempt in completed if in_window(attempt, previous_start, current_start)]
    all_numerator, all_denominator, all_chapters = _aggregate_attempts(completed)
    current_numerator, current_denominator, current_chapters = _aggregate_attempts(current)
    previous_numerator, previous_denominator, previous_chapters = _aggregate_attempts(previous)

    overall_accuracy = _round_metric((all_numerator / all_denominator) * 100) if all_denominator else None
    current_accuracy = (current_numerator / current_denominator) * 100 if current_denominator else None
    previous_accuracy = (previous_numerator / previous_denominator) * 100 if previous_denominator else None
    overall_delta = (
        _round_metric(current_accuracy - previous_accuracy)
        if current_accuracy is not None and previous_accuracy is not None
        else None
    )
    chapter_ids = set(all_chapters) | set(current_chapters) | set(previous_chapters)
    chapter_metrics: dict[object, dict[str, Any]] = {}
    for chapter_id in chapter_ids:
        all_n, all_d = all_chapters.get(chapter_id, (0.0, 0.0))
        current_n, current_d = current_chapters.get(chapter_id, (0.0, 0.0))
        previous_n, previous_d = previous_chapters.get(chapter_id, (0.0, 0.0))
        current_value = (current_n / current_d) * 100 if current_d else None
        previous_value = (previous_n / previous_d) * 100 if previous_d else None
        chapter_metrics[chapter_id] = {
            "accuracy": _round_metric((all_n / all_d) * 100) if all_d else None,
            "delta_points": (
                _round_metric(current_value - previous_value)
                if current_value is not None and previous_value is not None
                else None
            ),
        }
    return {
        "overall_accuracy": overall_accuracy,
        "overall_delta_points": overall_delta,
        "chapter_metrics": chapter_metrics,
    }


def _completed_attempt_counts(attempts: Sequence[object]) -> tuple[int, dict[object, int]]:
    attempt_ids: set[object] = set()
    chapter_attempt_ids: dict[object, set[object]] = defaultdict(set)
    for attempt in attempts:
        if getattr(attempt, "completed_at", None) is None:
            continue
        raw_attempt_id = getattr(attempt, "id", None)
        attempt_id: object = ("id", raw_attempt_id) if raw_attempt_id is not None else ("object", id(attempt))
        attempt_ids.add(attempt_id)
        for chapter_id in _attempt_chapter_scores(attempt):
            chapter_attempt_ids[chapter_id].add(attempt_id)
    return len(attempt_ids), {
        chapter_id: len(ids)
        for chapter_id, ids in chapter_attempt_ids.items()
    }


def _history_attempt_counts(history: Sequence[dict[str, object]]) -> tuple[int, dict[int, int]]:
    attempt_ids: set[object] = set()
    chapter_attempt_ids: dict[int, set[object]] = defaultdict(set)
    for row in history:
        attempt_id = row.get("attempt_id")
        if attempt_id is None:
            continue
        attempt_ids.add(attempt_id)
        chapter_id = row.get("chapter_id")
        if chapter_id is None:
            continue
        try:
            chapter_attempt_ids[int(chapter_id)].add(attempt_id)
        except (TypeError, ValueError):
            continue
    return len(attempt_ids), {
        chapter_id: len(ids)
        for chapter_id, ids in chapter_attempt_ids.items()
    }


def _chapter_title(chapter: Chapter, locale: str) -> str:
    translations = {item.locale: item.title for item in chapter.translations}
    return translations.get(locale) or translations.get("kk") or chapter.code


def _chapter_rank_by_code() -> dict[str, int]:
    return {
        str(item.get("code")): index
        for index, item in enumerate(load_chapter_catalog(), start=1)
    }


def _chapter_ranks(
    chapters: Iterable[Chapter],
    catalog_ranks: dict[str, int] | None = None,
) -> dict[int, int]:
    catalog_ranks = catalog_ranks or _chapter_rank_by_code()
    chapters = list(chapters)
    missing_codes = sorted({chapter.code for chapter in chapters if chapter.code not in catalog_ranks})
    if missing_codes:
        message = f"Chapter codes are missing from the chapter catalog: {missing_codes}"
        raise ValueError(message)
    return {int(chapter.id): catalog_ranks[chapter.code] for chapter in chapters}


def _select_attribution_chapter(
    question: object,
    *,
    catalog_ranks: dict[str, int],
    requested_chapter_id: int | None = None,
    allowed_chapter_ids: set[int] | None = None,
) -> Chapter:
    candidates = eligible_chapters(question)
    if requested_chapter_id is not None:
        candidates = [chapter for chapter in candidates if chapter.id == requested_chapter_id]
    if allowed_chapter_ids is not None:
        candidates = [chapter for chapter in candidates if chapter.id in allowed_chapter_ids]
    if not candidates:
        raise ValueError("Question has no eligible chapter for attempt attribution")
    ranks = _chapter_ranks(candidates, catalog_ranks)
    return min(candidates, key=lambda chapter: (ranks[chapter.id], chapter.code))


def _mode_requirement(mode: str) -> int:
    return {"random": 20, "mock": 40, "weak": 1, "chapter": 1}[mode]


def _mode_availability_row(
    mode: str,
    available_questions: int,
    *,
    has_weak_history: bool = False,
) -> dict[str, Any]:
    """
    Return the single server-side availability decision used everywhere.

    Dashboard rendering and attempt creation must agree on the same pool
    requirements. Keeping the reason/count contract in one helper also makes
    the 409 response deterministic when a pool changes between requests.
    """
    required = _mode_requirement(mode)
    is_available = available_questions >= required
    reason = (
        "no_weak_chapters"
        if mode == "weak" and not has_weak_history
        else "insufficient_question_pool"
    )
    return {
        "mode": mode,
        "available": is_available,
        "available_questions": available_questions,
        "required_questions": required,
        "reason": reason,
    }


def _weak_chapter_ids(
    attempts: Sequence[TestAttempt],
    *,
    now: datetime,
    chapter_ranks: dict[int, int],
) -> set[int]:
    metrics = compute_dashboard_metrics(attempts, now=now)["chapter_metrics"]
    qualifying_ids = {
        int(chapter_id)
        for chapter_id, value in metrics.items()
        if value["accuracy"] is not None and value["accuracy"] < WEAK_ACCURACY_THRESHOLD
    }
    missing_ids = sorted(qualifying_ids - set(chapter_ranks))
    if missing_ids:
        message = f"Historical chapters are missing from the chapter catalog mapping: {missing_ids}"
        raise ValueError(message)
    ranked = sorted(
        (
            (float(value["accuracy"]), int(chapter_id))
            for chapter_id, value in metrics.items()
            if value["accuracy"] is not None and value["accuracy"] < WEAK_ACCURACY_THRESHOLD
        ),
        key=lambda item: (item[0], chapter_ranks[item[1]]),
    )
    if len(ranked) < WEAK_CHAPTER_COUNT:
        return set()
    return {chapter_id for _, chapter_id in ranked[:WEAK_CHAPTER_COUNT]}


async def _resolve_weak_chapter_ids(
    session: AsyncSession,
    *,
    user_id: int,
    attempts: Sequence[TestAttempt],
    now: datetime,
    chapter_ranks: dict[int, int],
) -> set[int]:
    """Resolve weak chapters from the user's latest Analyze, then history."""
    latest = await get_latest_analyze_result_for_tests(session, user_id=user_id)
    if latest is None:
        return _weak_chapter_ids(attempts, now=now, chapter_ranks=chapter_ranks)

    ranked: list[tuple[float, float, int, int, int]] = []
    for item in latest.items or ():
        chapter_id = int(item.chapter_id)
        lost_points = int(item.max_score) - int(item.score)
        if lost_points <= 0:
            continue
        if chapter_id not in chapter_ranks:
            message = f"Analyze chapters are missing from the chapter catalog mapping: [{chapter_id}]"
            raise ValueError(message)
        ranked.append(
            (
                -lost_points,
                float(item.percentage),
                -int(item.question_count),
                chapter_ranks[chapter_id],
                chapter_id,
            ),
        )
    ranked.sort()
    return {row[4] for row in ranked[:WEAK_CHAPTER_COUNT]}


class TestsService:
    def __init__(
        self,
        session: AsyncSession,
        *,
        now: datetime | None = None,
        sampler: QuestionSampler = random.sample,
    ):
        self.session = session
        self.now = _utc(now)
        self.sampler = sampler

    async def dashboard(self, *, user_id: int, locale: str = "ru") -> dict[str, Any]:
        if settings.TEST_CATALOG_STATS_READ_ENABLED:
            return await self._dashboard_from_catalog_stats(user_id=user_id, locale=locale)
        return await self._dashboard_legacy(user_id=user_id, locale=locale)

    async def _dashboard_legacy(self, *, user_id: int, locale: str = "ru") -> dict[str, Any]:
        chapters = await list_chapters(self.session, locale=locale)
        counts = await question_counts_by_chapter(self.session)
        attempts = await list_completed_attempts(self.session, user_id=user_id)
        metrics = compute_dashboard_metrics(attempts, now=self.now)
        completed_attempt_count, chapter_attempt_counts = _completed_attempt_counts(attempts)
        chapter_accuracy = metrics["chapter_metrics"]
        rank_by_code = _chapter_rank_by_code()
        chapter_ranks = _chapter_ranks(chapters, rank_by_code)

        def chapter_metric(chapter_id: int, key: str) -> Any:
            # Pure dashboard math keeps the original chapter-id type, while
            # JSON/database adapters may expose it as a string. Accept both
            # representations so chapter cards never silently lose metrics.
            row = chapter_accuracy.get(chapter_id) or chapter_accuracy.get(str(chapter_id), {})
            return row.get(key)

        ordered_chapters = sorted(
            chapters,
            key=lambda chapter: chapter_ranks[chapter.id],
        )
        chapter_rows = [
            {
                "chapter_ref": encode_public_ref("chapter", chapter.id),
                "code": chapter.code,
                "title": _chapter_title(chapter, locale),
                "importance_rank": chapter_ranks[chapter.id],
                "question_count": counts.get(chapter.id, 0),
                "completed_attempt_count": chapter_attempt_counts.get(chapter.id, 0),
                "accuracy": chapter_metric(chapter.id, "accuracy"),
                "delta_points": chapter_metric(chapter.id, "delta_points"),
            }
            for chapter in ordered_chapters
        ]
        recent = [
            {
                "id": encode_public_ref("attempt", attempt.id),
                "mode": attempt.mode,
                "title": attempt.title,
                "completed_at": _utc(attempt.completed_at),
                "accuracy": attempt.score_percent,
            }
            for attempt in attempts[:3]
        ]
        mode_availability = await self._mode_availability(
            attempts,
            chapters,
            counts,
            user_id=user_id,
        )
        return {
            "completed_attempt_count": completed_attempt_count,
            "overall_accuracy": metrics["overall_accuracy"],
            "overall_delta_points": metrics["overall_delta_points"],
            "delta_window_days": 7,
            "recent_tests": recent,
            "chapters": chapter_rows,
            "mode_availability": mode_availability,
        }

    async def _dashboard_from_catalog_stats(self, *, user_id: int, locale: str) -> dict[str, Any]:  # noqa: C901, PLR0915
        """Build the bounded dashboard from immutable attempt snapshots and published catalog stats."""
        chapters = await list_chapters(self.session, locale=locale)
        rank_by_code = _chapter_rank_by_code()
        chapter_ranks = _chapter_ranks(chapters, rank_by_code)
        history_payload = await read_dashboard_history(self.session, user_id=user_id)
        history = history_payload["history"]
        recent_rows = history_payload["recent"]
        completed_attempt_count, chapter_attempt_counts = _history_attempt_counts(history)

        def row_time(row: dict[str, object]) -> datetime:
            return _utc(row.get("completed_at") if isinstance(row, dict) else None)

        def weight(row: dict[str, object]) -> float:
            try:
                return max(0.0, float(row.get("awarded_weight", 0)))
            except (TypeError, ValueError):
                return 0.0

        current_start = self.now - timedelta(days=7)
        previous_start = self.now - timedelta(days=14)
        current_rows = [row for row in history if current_start <= row_time(row) < self.now]
        previous_rows = [row for row in history if previous_start <= row_time(row) < current_start]

        def aggregate(rows: Sequence[dict[str, object]]) -> tuple[float, float, dict[int, tuple[float, float]]]:
            numerator = 0.0
            denominator = 0.0
            chapters_total: dict[int, list[float]] = defaultdict(lambda: [0.0, 0.0])
            for row in rows:
                chapter_id = row.get("chapter_id")
                if chapter_id is None:
                    continue
                try:
                    chapter_key = int(chapter_id)
                except (TypeError, ValueError):
                    continue
                earned = weight(row)
                numerator += earned
                denominator += 1
                chapters_total[chapter_key][0] += earned
                chapters_total[chapter_key][1] += 1
            return numerator, denominator, {
                chapter_id: (values[0], values[1])
                for chapter_id, values in chapters_total.items()
            }

        all_numerator, all_denominator, all_chapters = aggregate(history)
        current_numerator, current_denominator, current_chapters = aggregate(current_rows)
        previous_numerator, previous_denominator, previous_chapters = aggregate(previous_rows)
        chapter_ids = set(all_chapters) | set(current_chapters) | set(previous_chapters)
        chapter_metrics: dict[int, dict[str, Any]] = {}
        for chapter_id in chapter_ids:
            all_n, all_d = all_chapters.get(chapter_id, (0.0, 0.0))
            current_n, current_d = current_chapters.get(chapter_id, (0.0, 0.0))
            previous_n, previous_d = previous_chapters.get(chapter_id, (0.0, 0.0))
            current_accuracy = (current_n / current_d) * 100 if current_d else None
            previous_accuracy = (previous_n / previous_d) * 100 if previous_d else None
            chapter_metrics[chapter_id] = {
                "accuracy": _round_metric((all_n / all_d) * 100) if all_d else None,
                "delta_points": (
                    _round_metric(current_accuracy - previous_accuracy)
                    if current_accuracy is not None and previous_accuracy is not None
                    else None
                ),
            }
        weak_ids = await _resolve_weak_chapter_ids(
            self.session,
            user_id=user_id,
            attempts=history,
            now=self.now,
            chapter_ranks=chapter_ranks,
        )
        catalog = await read_dashboard_catalog_snapshot(
            self.session,
            weak_chapter_ids=sorted(weak_ids),
        )
        chapter_counts = catalog["chapter_counts"]
        unknown_catalog_chapters = set(chapter_counts) - {int(chapter.id) for chapter in chapters}
        if unknown_catalog_chapters:
            unknown_message = f"Catalog stats reference unknown chapters: {sorted(unknown_catalog_chapters)}"
            raise TestCatalogStaleError(unknown_message)
        ordered_chapters = sorted(chapters, key=lambda chapter: chapter_ranks[chapter.id])
        chapter_rows = [
            {
                "chapter_ref": encode_public_ref("chapter", chapter.id),
                "code": chapter.code,
                "title": _chapter_title(chapter, locale),
                "importance_rank": chapter_ranks[chapter.id],
                "question_count": chapter_counts.get(chapter.id, 0),
                "completed_attempt_count": chapter_attempt_counts.get(chapter.id, 0),
                "accuracy": chapter_metrics.get(chapter.id, {}).get("accuracy"),
                "delta_points": chapter_metrics.get(chapter.id, {}).get("delta_points"),
            }
            for chapter in ordered_chapters
        ]
        recent_accuracy: dict[int, tuple[float, int]] = defaultdict(lambda: (0.0, 0))
        for row in history:
            attempt_id = row.get("attempt_id")
            if attempt_id is None:
                continue
            earned, count = recent_accuracy[int(attempt_id)]
            recent_accuracy[int(attempt_id)] = (earned + weight(row), count + 1)
        recent = [
            {
                "id": encode_public_ref("attempt", int(row["id"])),
                "mode": row["mode"],
                "title": row["title"],
                "completed_at": _utc(row["completed_at"]),
                "accuracy": _round_metric((recent_accuracy[int(row["id"])][0] / recent_accuracy[int(row["id"])][1]) * 100)
                if recent_accuracy[int(row["id"])][1]
                else 0,
            }
            for row in recent_rows[:3]
        ]
        total_count = int(catalog["total_count"])
        weak_count = int(catalog.get("weak_question_count", 0))
        chapter_count = sum(int(value) for value in chapter_counts.values())
        availability = [
            self._availability_response("random", total_count),
            self._availability_response("mock", total_count),
            self._availability_response("weak", weak_count, has_weak_history=bool(weak_ids)),
            self._availability_response("chapter", chapter_count),
        ]
        return {
            "completed_attempt_count": completed_attempt_count,
            "overall_accuracy": _round_metric((all_numerator / all_denominator) * 100) if all_denominator else None,
            "overall_delta_points": (
                _round_metric((current_numerator / current_denominator) * 100 - (previous_numerator / previous_denominator) * 100)
                if current_denominator and previous_denominator
                else None
            ),
            "delta_window_days": 7,
            "recent_tests": recent,
            "chapters": chapter_rows,
            "mode_availability": availability,
        }

    @staticmethod
    def _availability_response(mode: str, available_questions: int, *, has_weak_history: bool = False) -> dict[str, Any]:
        row = _mode_availability_row(mode, available_questions, has_weak_history=has_weak_history)
        available = bool(row["available"])
        return {
            "mode": mode,
            "available": available,
            "disabled_reason": None
            if available
            else {
                "code": "TEST_MODE_UNAVAILABLE",
                "reason": row["reason"],
                "required_questions": row["required_questions"],
                "available_questions": available_questions,
                "required_chapters": WEAK_CHAPTER_COUNT if mode == "weak" else 1,
                "message": "Selected test mode is unavailable.",
            },
        }

    async def _mode_availability(
        self,
        attempts: Sequence[TestAttempt],
        chapters: Sequence[Chapter],
        counts: dict[int, int],
        *,
        user_id: int,
    ) -> list[dict[str, Any]]:
        questions = await list_questions(self.session)
        total = len(questions)
        catalog_ranks = _chapter_rank_by_code()
        chapter_ranks = _chapter_ranks(chapters, catalog_ranks)
        weak_chapters = await _resolve_weak_chapter_ids(
            self.session,
            user_id=user_id,
            attempts=attempts,
            now=self.now,
            chapter_ranks=chapter_ranks,
        )
        availability: list[dict[str, Any]] = []
        for mode, available_count in (
            ("random", total),
            ("mock", total),
            (
                "weak",
                sum(
                    any(chapter.id in weak_chapters for chapter in eligible_chapters(question))
                    for question in questions
                ),
            ),
            ("chapter", sum(counts.values())),
        ):
            row = _mode_availability_row(mode, available_count, has_weak_history=bool(weak_chapters))
            is_available = row["available"]
            availability.append(
                {
                    "mode": mode,
                    "available": is_available,
                    "disabled_reason": None
                    if is_available
                    else {
                        "code": "TEST_MODE_UNAVAILABLE",
                        "reason": row["reason"],
                        "required_questions": row["required_questions"],
                        "available_questions": available_count,
                        "message": "Selected test mode is unavailable.",
                    },
                },
            )
        return availability

    async def create_attempt(
        self,
        *,
        user_id: int,
        mode: TestMode,
        chapter_ref: str | None = None,
        locale: str = "ru",
    ) -> TestAttempt:
        chapter_id: int | None = None
        if mode == "chapter":
            if not chapter_ref:
                raise TestModeUnavailableError(mode, "invalid_chapter_ref", 1, 0)
            try:
                chapter_id = decode_public_ref("chapter", chapter_ref)
            except (InvalidPublicRef, ValueError):
                raise TestModeUnavailableError(mode, "invalid_chapter_ref", 1, 0) from None
            chapter_result = await self.session.get(Chapter, chapter_id)
            if chapter_result is None:
                raise TestModeUnavailableError(mode, "invalid_chapter_ref", 1, 0)
        questions = await list_questions(self.session, chapter_ids=[chapter_id] if chapter_id else None)
        completed = await list_completed_attempts(self.session, user_id=user_id)
        counts = await question_counts_by_chapter(self.session)
        chapters = await list_chapters(self.session, locale=locale)
        catalog_ranks = _chapter_rank_by_code()
        chapter_ranks = _chapter_ranks(chapters, catalog_ranks)
        eligible = {
            question.id: eligible_chapters(question)
            for question in questions
        }
        _chapter_ranks(
            (chapter for chapters in eligible.values() for chapter in chapters),
            catalog_ranks,
        )
        weak_ids = await _resolve_weak_chapter_ids(
            self.session,
            user_id=user_id,
            attempts=completed,
            now=self.now,
            chapter_ranks=chapter_ranks,
        )
        if mode == "weak":
            questions = [
                question
                for question in questions
                if any(chapter.id in weak_ids for chapter in eligible[question.id])
            ]
            questions.sort(
                key=lambda question: (
                    chapter_ranks[
                        _select_attribution_chapter(
                            question,
                            catalog_ranks=catalog_ranks,
                            allowed_chapter_ids=weak_ids,
                        ).id
                    ],
                    question.source_key,
                ),
            )
        availability = _mode_availability_row(mode, len(questions), has_weak_history=bool(weak_ids))
        if not availability["available"]:
            raise TestModeUnavailableError(
                mode,
                availability["reason"],
                availability["required_questions"],
                availability["available_questions"],
            )
        required = availability["required_questions"]
        count = required if mode in {"random", "mock"} else min(20, len(questions))
        questions = self.sampler(questions, count) if mode == "random" else questions[:count]
        title = {"random": "Random test", "weak": "Weak topics test", "mock": "Mock test", "chapter": "Chapter test"}[mode]
        attempt = TestAttempt(user_id=user_id, mode=mode, chapter_id=chapter_id, title=title, questions_total=len(questions))
        self.session.add(attempt)
        await self.session.flush()
        for ordinal, question in enumerate(questions):
            attribution_chapter = _select_attribution_chapter(
                question,
                catalog_ranks=catalog_ranks,
                requested_chapter_id=chapter_id if mode == "chapter" else None,
                allowed_chapter_ids=weak_ids if mode == "weak" else None,
            )
            options = [
                {
                    "option_ref": encode_public_ref("test_option", option.id),
                    "label": option.label,
                    "text": option.text,
                }
                for option in question.options
            ]
            correct_option = next(option for option in question.options if option.is_correct)
            chapter_title = _chapter_title(attribution_chapter, locale)
            snapshot = TestAttemptQuestion(
                attempt_id=attempt.id,
                question_id=question.id,
                ordinal=ordinal,
                question_ref=encode_public_ref("test_question", question.id),
                prompt=question.prompt,
                options_json=options,
                correct_option_ref=encode_public_ref("test_option", correct_option.id),
                explanation=question.explanation,
                chapter_id=attribution_chapter.id,
                topic_title=chapter_title,
                question_count=counts.get(attribution_chapter.id, 0),
                estimated_minutes=max(1, counts.get(attribution_chapter.id, 0) // 2),
            )
            attempt.questions.append(snapshot)
        await self.session.commit()
        loaded_attempt = await get_attempt(self.session, attempt_id=attempt.id, user_id=user_id)
        if loaded_attempt is None:
            raise AttemptNotFoundError
        return loaded_attempt

    async def get_attempt_response(self, *, user_id: int, attempt_ref: str) -> TestAttempt:
        try:
            attempt_id = decode_public_ref("attempt", attempt_ref)
        except (InvalidPublicRef, ValueError):
            raise AttemptNotFoundError from None
        attempt = await get_attempt(self.session, attempt_id=attempt_id, user_id=user_id)
        if attempt is None:
            raise AttemptNotFoundError
        return attempt

    async def submit_answer(  # noqa: C901
        self,
        *,
        user_id: int,
        attempt_ref: str,
        question_ref: str,
        option_ref: str,
    ) -> dict[str, Any]:
        try:
            attempt_id = decode_public_ref("attempt", attempt_ref)
            question_id = decode_public_ref("test_question", question_ref)
        except (InvalidPublicRef, ValueError):
            raise AttemptNotFoundError from None
        attempt = await get_attempt_for_update(self.session, attempt_id=attempt_id, user_id=user_id)
        if attempt is None:
            raise AttemptNotFoundError
        if attempt.status == "completed" or attempt.completed_at is not None:
            raise AttemptCompletedError
        attempt_question = await get_attempt_question_for_update(
            self.session,
            attempt_id=attempt_id,
            question_id=question_id,
        )
        if attempt_question is None:
            attempt_question = next((item for item in attempt.questions if item.question_ref == question_ref), None)
        if attempt_question is None:
            raise AttemptNotFoundError
        if attempt_question.question_ref != question_ref:
            raise AttemptNotFoundError
        selected_option = next((item for item in attempt_question.options_json if item.get("option_ref") == option_ref), None)
        if selected_option is None:
            try:
                option_id = decode_public_ref("test_option", option_ref)
            except (InvalidPublicRef, ValueError):
                option_id = None
            selected_option = next(
                (item for item in attempt_question.options_json if option_id is not None and item.get("option_ref", "").endswith(str(option_id))),
                None,
            )
        if selected_option is None:
            raise ValueError("Unknown option reference")
        if attempt_question.answer is not None:
            if attempt_question.answer.selected_option_ref == option_ref:
                return self._feedback(attempt_question, attempt_question.answer.selected_option_ref, attempt_question.answer.awarded_weight)
            raise AnswerAlreadySubmittedError
        awarded_weight = int(option_ref == attempt_question.correct_option_ref)
        attempt_question.answer = TestAttemptAnswer(
            selected_option_ref=option_ref,
            awarded_weight=awarded_weight,
        )
        feedback = self._feedback(attempt_question, option_ref, awarded_weight)
        await self.session.commit()
        return feedback

    @staticmethod
    def _feedback(question: TestAttemptQuestion, option_ref: str, awarded_weight: int) -> dict[str, Any]:
        return {
            "question_ref": question.question_ref,
            "option_ref": option_ref,
            "correct": bool(awarded_weight),
            "correct_option_ref": question.correct_option_ref,
            "explanation": question.explanation,
            "awarded_weight": awarded_weight,
        }

    async def complete_attempt(self, *, user_id: int, attempt_ref: str) -> dict[str, Any]:
        try:
            attempt_id = decode_public_ref("attempt", attempt_ref)
        except (InvalidPublicRef, ValueError):
            raise AttemptNotFoundError from None
        attempt = await get_attempt_for_update(self.session, attempt_id=attempt_id, user_id=user_id)
        if attempt is None:
            raise AttemptNotFoundError
        if attempt.status == "completed" and attempt.summary_json:
            return attempt.summary_json
        await lock_attempt_questions(self.session, attempt_id=attempt.id)
        if any(question.answer is None for question in attempt.questions):
            raise AttemptIncompleteError
        completed_at = self.now
        answers = {question.id: question.answer for question in attempt.questions if question.answer is not None}
        summary = compute_attempt_summary(
            attempt.questions,
            answers,
            started_at=attempt.started_at,
            completed_at=completed_at,
        )
        previous = (
            await get_previous_completed_attempt(
                self.session,
                user_id=user_id,
                mode=attempt.mode,
                exclude_attempt_id=attempt.id,
            )
            if attempt.mode != "chapter"
            else None
        )
        previous_score = previous.score_percent if previous is not None else None
        summary["previous_score_percent"] = previous_score
        summary["accuracy_delta_points"] = (
            _round_metric(float(summary["score_percent"]) - float(previous_score))
            if previous_score is not None
            else None
        )
        attempt.status = "completed"
        attempt.completed_at = completed_at
        attempt.answered_questions = summary["answered_questions"]
        attempt.correct_answer_count = summary["correct_answer_count"]
        attempt.score_percent = summary["score_percent"]
        attempt.duration_seconds = summary["duration_seconds"]
        attempt.average_pace_seconds = summary["average_pace_seconds"]
        attempt.summary_json = summary
        await self.session.commit()
        return summary
