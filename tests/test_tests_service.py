# ruff: noqa: PT009, PT027
import unittest
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import src.models  # noqa: F401 - register SQLAlchemy relationships for snapshot construction
from src.security.public_refs import encode_public_ref
from src.tests.service import (
    TestsService,
    _chapter_ranks,
    _mode_availability_row,
    _resolve_weak_chapter_ids,
    _select_attribution_chapter,
    _weak_chapter_ids,
    compute_attempt_summary,
    compute_dashboard_metrics,
)

TEST_NOW = datetime(2026, 8, 8, 12, 0, tzinfo=UTC)


class AttemptSessionStub:
    def __init__(self, chapters: list[SimpleNamespace]) -> None:
        self.chapters = {chapter.id: chapter for chapter in chapters}
        self.attempt = None

    def add(self, attempt) -> None:
        self.attempt = attempt
        attempt.id = 700

    async def flush(self) -> None:
        return None

    async def commit(self) -> None:
        return None

    async def get(self, _model, identity: int):
        return self.chapters.get(identity)


def make_chapter(chapter_id: int, code: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=chapter_id,
        code=code,
        translations=[SimpleNamespace(locale="ru", title=f"Chapter {code.upper()}")],
    )


def make_question(
    question_id: int,
    chapters: list[SimpleNamespace],
    *,
    source_key: str | None = None,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=question_id,
        source_key=source_key or f"question-{question_id:03d}",
        prompt=f"Question {question_id}",
        explanation=f"Explanation {question_id}",
        options=[
            SimpleNamespace(id=question_id * 10 + 1, label="A", text="Correct", is_correct=True),
            SimpleNamespace(id=question_id * 10 + 2, label="B", text="Wrong", is_correct=False),
        ],
        topic=SimpleNamespace(
            topic_codes=[SimpleNamespace(chapter=chapter) for chapter in chapters],
        ),
    )


async def create_attempt_with_repository_stubs(  # noqa: PLR0913
    *,
    mode: str,
    questions: list[SimpleNamespace],
    chapters: list[SimpleNamespace],
    sampler,
    completed: list[SimpleNamespace] | None = None,
    chapter_ref: str | None = None,
):
    session = AttemptSessionStub(chapters)
    counts = {chapter.id: len(questions) for chapter in chapters}
    catalog_ranks = {chapter.code: index for index, chapter in enumerate(chapters, start=1)}
    with (
        patch("src.tests.service.list_questions", new=AsyncMock(return_value=questions)),
        patch("src.tests.service.list_completed_attempts", new=AsyncMock(return_value=completed or [])),
        patch("src.tests.service.question_counts_by_chapter", new=AsyncMock(return_value=counts)),
        patch("src.tests.service.list_chapters", new=AsyncMock(return_value=chapters)),
        patch("src.tests.service.get_attempt", new=AsyncMock(side_effect=lambda *_args, **_kwargs: session.attempt)),
        patch("src.tests.service.get_latest_analyze_result_for_tests", new=AsyncMock(return_value=None)),
        patch("src.tests.service._chapter_rank_by_code", return_value=catalog_ranks),
    ):
        return await TestsService(session, now=TEST_NOW, sampler=sampler).create_attempt(
            user_id=7,
            mode=mode,
            chapter_ref=chapter_ref,
        )


class TestServiceMathTests(unittest.TestCase):
    def test_attribution_uses_requested_then_weak_intersection_then_catalog_rank(self):
        chapter_a = SimpleNamespace(id=10, code="a")
        chapter_b = SimpleNamespace(id=20, code="b")
        question = SimpleNamespace(
            topic=SimpleNamespace(
                topic_codes=[
                    SimpleNamespace(chapter=chapter_a),
                    SimpleNamespace(chapter=chapter_b),
                ],
            ),
        )
        ranks = {"b": 1, "a": 2}

        self.assertIs(
            _select_attribution_chapter(question, catalog_ranks=ranks, requested_chapter_id=10),
            chapter_a,
        )
        self.assertIs(
            _select_attribution_chapter(question, catalog_ranks=ranks, allowed_chapter_ids={10}),
            chapter_a,
        )
        self.assertIs(_select_attribution_chapter(question, catalog_ranks=ranks), chapter_b)

    def test_missing_catalog_mapping_fails_without_database_id_fallback(self):
        chapters = [SimpleNamespace(id=999, code="not-in-catalog")]

        with self.assertRaisesRegex(ValueError, "catalog"):
            _chapter_ranks(chapters, {"known": 1})

    def test_completion_summary_uses_persisted_answers_and_server_duration(self):
        questions = [
            SimpleNamespace(id=1, chapter_id=10, topic_title="A", correct_option_ref="a"),
            SimpleNamespace(id=2, chapter_id=10, topic_title="A", correct_option_ref="b"),
        ]
        answers = {
            1: SimpleNamespace(selected_option_ref="a", awarded_weight=1),
            2: SimpleNamespace(selected_option_ref="a", awarded_weight=0),
        }
        summary = compute_attempt_summary(
            questions,
            answers,
            started_at=datetime(2026, 8, 3, 10, 0, tzinfo=UTC),
            completed_at=datetime(2026, 8, 3, 10, 2, 30, tzinfo=UTC),
        )
        self.assertEqual(summary["correct_answer_count"], 1)
        self.assertEqual(summary["total_questions"], 2)
        self.assertEqual(summary["answered_questions"], 2)
        self.assertEqual(summary["score_percent"], 50)
        self.assertEqual(summary["duration_seconds"], 150)
        self.assertEqual(summary["average_pace_seconds"], 75)

    def test_dashboard_delta_is_answer_weighted_and_null_for_empty_comparison(self):
        now = datetime(2026, 8, 3, 12, 0, tzinfo=UTC)
        attempts = [
            SimpleNamespace(
                id=1,
                user_id=7,
                completed_at=now - timedelta(days=2),
                score_percent=75,
                questions_total=4,
                chapter_scores={10: (3, 4)},
                title="Recent",
                mode="random",
            ),
        ]
        metrics = compute_dashboard_metrics(attempts, now=now, window_days=7)
        self.assertEqual(metrics["overall_accuracy"], 75)
        self.assertIsNone(metrics["overall_delta_points"])
        self.assertEqual(metrics["chapter_metrics"][10]["accuracy"], 75)

    def test_mode_availability_contract_is_shared_by_dashboard_and_creation(self):
        random_row = _mode_availability_row("random", 19)
        self.assertFalse(random_row["available"])
        self.assertEqual(random_row["required_questions"], 20)
        self.assertEqual(random_row["reason"], "insufficient_question_pool")

        weak_row = _mode_availability_row("weak", 0, has_weak_history=False)
        self.assertFalse(weak_row["available"])
        self.assertEqual(weak_row["reason"], "no_weak_chapters")

    def test_dashboard_uses_half_open_utc_windows_and_answer_weighting(self):
        now = datetime(2026, 8, 3, 12, 0, tzinfo=UTC)
        attempts = [
            SimpleNamespace(completed_at=now - timedelta(days=7), score_percent=100, questions_total=1, chapter_scores={1: (1, 1)}),
            SimpleNamespace(completed_at=now - timedelta(days=14), score_percent=0, questions_total=9, chapter_scores={1: (0, 9)}),
            SimpleNamespace(completed_at=now, score_percent=100, questions_total=100, chapter_scores={1: (100, 100)}),
        ]
        metrics = compute_dashboard_metrics(attempts, now=now)
        self.assertEqual(metrics["overall_accuracy"], 91.82)
        self.assertEqual(metrics["overall_delta_points"], 100)

    def test_dashboard_is_empty_when_no_completed_attempts_exist(self):
        metrics = compute_dashboard_metrics([], now=datetime(2026, 8, 3, tzinfo=UTC))
        self.assertIsNone(metrics["overall_accuracy"])
        self.assertIsNone(metrics["overall_delta_points"])
        self.assertEqual(metrics["chapter_metrics"], {})

    def test_weak_mode_requires_three_qualifying_chapters_and_uses_lowest_accuracy(self):
        now = datetime(2026, 8, 3, 12, 0, tzinfo=UTC)
        attempts = [
            SimpleNamespace(completed_at=now - timedelta(days=1), score_percent=50, questions_total=10, chapter_scores={1: (1, 10), 2: (2, 10), 3: (3, 10), 4: (4, 10)}),
        ]
        self.assertEqual(
            _weak_chapter_ids(attempts, now=now, chapter_ranks={1: 1, 2: 2, 3: 3, 4: 4}),
            {1, 2, 3},
        )
        self.assertEqual(
            _weak_chapter_ids(
                [SimpleNamespace(completed_at=now, score_percent=50, questions_total=10, chapter_scores={1: (1, 10), 2: (2, 10)})],
                now=now,
                chapter_ranks={1: 1, 2: 2},
            ),
            set(),
        )
        tied = [SimpleNamespace(completed_at=now, score_percent=50, questions_total=30, chapter_scores={1: (1, 10), 2: (1, 10), 3: (1, 10), 4: (1, 10)})]
        self.assertEqual(_weak_chapter_ids(tied, now=now, chapter_ranks={1: 4, 2: 1, 3: 2, 4: 3}), {2, 3, 4})


class AnalyzeWeakBridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_latest_analyze_result_wins_and_allows_fewer_than_three_weak_chapters(self):
        latest = SimpleNamespace(
            items=[
                SimpleNamespace(chapter_id=20, max_score=10, score=2, percentage=20, question_count=5),
                SimpleNamespace(chapter_id=10, max_score=10, score=10, percentage=100, question_count=20),
                SimpleNamespace(chapter_id=30, max_score=10, score=10, percentage=100, question_count=20),
            ],
        )
        with patch(
            "src.tests.service.get_latest_analyze_result_for_tests",
            new=AsyncMock(return_value=latest),
        ):
            self.assertEqual(
                await _resolve_weak_chapter_ids(
                    SimpleNamespace(),
                    user_id=7,
                    attempts=[],
                    now=TEST_NOW,
                    chapter_ranks={10: 1, 20: 2, 30: 3},
                ),
                {20},
            )

    async def test_latest_analyze_tie_breaks_by_lost_points_percentage_questions_rank_and_id(self):
        latest = SimpleNamespace(
            items=[
                SimpleNamespace(chapter_id=30, max_score=10, score=5, percentage=50, question_count=2),
                SimpleNamespace(chapter_id=20, max_score=10, score=5, percentage=50, question_count=5),
                SimpleNamespace(chapter_id=10, max_score=10, score=5, percentage=50, question_count=5),
                SimpleNamespace(chapter_id=40, max_score=10, score=5, percentage=50, question_count=5),
            ],
        )
        with patch(
            "src.tests.service.get_latest_analyze_result_for_tests",
            new=AsyncMock(return_value=latest),
        ):
            self.assertEqual(
                await _resolve_weak_chapter_ids(
                    SimpleNamespace(),
                    user_id=7,
                    attempts=[],
                    now=TEST_NOW,
                    chapter_ranks={10: 3, 20: 1, 30: 2, 40: 4},
                ),
                {10, 20, 40},
            )

    async def test_missing_latest_analyze_falls_back_to_history(self):
        attempts = [
            SimpleNamespace(
                completed_at=TEST_NOW,
                score_percent=50,
                questions_total=10,
                chapter_scores={1: (1, 10), 2: (2, 10), 3: (3, 10)},
            ),
        ]
        with patch(
            "src.tests.service.get_latest_analyze_result_for_tests",
            new=AsyncMock(return_value=None),
        ):
            self.assertEqual(
                await _resolve_weak_chapter_ids(
                    SimpleNamespace(),
                    user_id=7,
                    attempts=attempts,
                    now=TEST_NOW,
                    chapter_ranks={1: 1, 2: 2, 3: 3},
                ),
                {1, 2, 3},
            )

    async def test_latest_perfect_or_empty_analyze_does_not_fall_back_to_history(self):
        attempts = [
            SimpleNamespace(
                completed_at=TEST_NOW,
                score_percent=50,
                questions_total=10,
                chapter_scores={1: (1, 10), 2: (2, 10), 3: (3, 10)},
            ),
        ]
        for latest in (SimpleNamespace(items=[]), SimpleNamespace(items=[SimpleNamespace(chapter_id=1, max_score=10, score=10, percentage=100, question_count=10)])):
            with patch(
                "src.tests.service.get_latest_analyze_result_for_tests",
                new=AsyncMock(return_value=latest),
            ):
                self.assertEqual(
                    await _resolve_weak_chapter_ids(
                        SimpleNamespace(),
                        user_id=7,
                        attempts=attempts,
                        now=TEST_NOW,
                        chapter_ranks={1: 1, 2: 2, 3: 3},
                    ),
                    set(),
                )


class TestAttemptSelectionTests(unittest.IsolatedAsyncioTestCase):
    async def test_legacy_dashboard_counts_unique_completed_attempts_globally_and_per_chapter(self):
        chapters = [make_chapter(10, "a"), make_chapter(20, "b")]
        attempts = [
            SimpleNamespace(
                id=1,
                completed_at=TEST_NOW - timedelta(days=1),
                questions_total=3,
                score_percent=100,
                chapter_scores={10: (2, 2), 20: (1, 1)},
                title="First",
                mode="random",
            ),
            SimpleNamespace(
                id=2,
                completed_at=TEST_NOW - timedelta(days=2),
                questions_total=2,
                score_percent=50,
                chapter_scores={10: (1, 2)},
                title="Second",
                mode="chapter",
            ),
            SimpleNamespace(
                id=2,
                completed_at=TEST_NOW - timedelta(days=2),
                questions_total=2,
                score_percent=50,
                chapter_scores={10: (1, 2)},
                title="Second duplicate",
                mode="chapter",
            ),
        ]
        with (
            patch("src.tests.service.list_chapters", new=AsyncMock(return_value=chapters)),
            patch("src.tests.service.question_counts_by_chapter", new=AsyncMock(return_value={10: 4, 20: 3})),
            patch("src.tests.service.list_completed_attempts", new=AsyncMock(return_value=attempts)),
            patch("src.tests.service._chapter_rank_by_code", return_value={"a": 1, "b": 2}),
            patch.object(TestsService, "_mode_availability", new=AsyncMock(return_value=[])),
        ):
            dashboard = await TestsService(SimpleNamespace(), now=TEST_NOW)._dashboard_legacy(user_id=7)

        self.assertEqual(dashboard["completed_attempt_count"], 2)
        self.assertEqual(
            {row["code"]: row["completed_attempt_count"] for row in dashboard["chapters"]},
            {"a": 2, "b": 1},
        )

    async def test_catalog_dashboard_deduplicates_question_history_rows_for_attempt_counts(self):
        chapters = [make_chapter(10, "a"), make_chapter(20, "b")]
        history = [
            {"attempt_id": 1, "completed_at": TEST_NOW - timedelta(days=1), "chapter_id": 10, "awarded_weight": 1},
            {"attempt_id": 1, "completed_at": TEST_NOW - timedelta(days=1), "chapter_id": 10, "awarded_weight": 0},
            {"attempt_id": 1, "completed_at": TEST_NOW - timedelta(days=1), "chapter_id": 20, "awarded_weight": 1},
            {"attempt_id": 2, "completed_at": TEST_NOW - timedelta(days=2), "chapter_id": 10, "awarded_weight": 1},
            {"attempt_id": 2, "completed_at": TEST_NOW - timedelta(days=2), "chapter_id": 10, "awarded_weight": 1},
        ]
        history_payload = {
            "history": history,
            "recent": [
                {"id": 1, "mode": "random", "title": "First", "completed_at": TEST_NOW - timedelta(days=1)},
                {"id": 2, "mode": "chapter", "title": "Second", "completed_at": TEST_NOW - timedelta(days=2)},
            ],
        }
        catalog = {"chapter_counts": {10: 4, 20: 3}, "total_count": 7, "weak_question_count": 0}
        with (
            patch("src.tests.service.list_chapters", new=AsyncMock(return_value=chapters)),
            patch("src.tests.service.read_dashboard_history", new=AsyncMock(return_value=history_payload)),
            patch("src.tests.service.read_dashboard_catalog_snapshot", new=AsyncMock(return_value=catalog)),
            patch("src.tests.service.get_latest_analyze_result_for_tests", new=AsyncMock(return_value=None)),
            patch("src.tests.service._chapter_rank_by_code", return_value={"a": 1, "b": 2}),
        ):
            dashboard = await TestsService(SimpleNamespace(), now=TEST_NOW)._dashboard_from_catalog_stats(
                user_id=7,
                locale="ru",
            )

        self.assertEqual(dashboard["completed_attempt_count"], 2)
        self.assertEqual(
            {row["code"]: row["completed_attempt_count"] for row in dashboard["chapters"]},
            {"a": 2, "b": 1},
        )

    async def test_random_mode_uses_injected_sampler_before_snapshot_attribution(self):
        chapter_a = make_chapter(10, "a")
        chapter_b = make_chapter(20, "b")
        questions = [make_question(question_id, [chapter_a, chapter_b]) for question_id in range(1, 41)]

        first_attempt = await create_attempt_with_repository_stubs(
            mode="random",
            questions=questions,
            chapters=[chapter_b, chapter_a],
            sampler=lambda candidates, count: list(candidates[:count]),
        )
        last_attempt = await create_attempt_with_repository_stubs(
            mode="random",
            questions=questions,
            chapters=[chapter_b, chapter_a],
            sampler=lambda candidates, count: list(candidates[-count:]),
        )

        first_ids = [question.question_id for question in first_attempt.questions]
        last_ids = [question.question_id for question in last_attempt.questions]
        self.assertEqual(first_ids, list(range(1, 21)))
        self.assertEqual(last_ids, list(range(21, 41)))
        self.assertEqual(len(first_ids), 20)
        self.assertEqual(len(last_ids), 20)
        self.assertEqual(len(set(first_ids)), 20)
        self.assertEqual(len(set(last_ids)), 20)
        self.assertTrue(all(question.chapter_id == 20 for question in first_attempt.questions))
        self.assertTrue(all(question.chapter_id == 20 for question in last_attempt.questions))

    async def test_mock_mode_preserves_first_forty_repository_candidates(self):
        chapter = make_chapter(10, "a")
        questions = [make_question(question_id, [chapter]) for question_id in range(1, 46)]

        attempt = await create_attempt_with_repository_stubs(
            mode="mock",
            questions=questions,
            chapters=[chapter],
            sampler=lambda _candidates, _count: self.fail("mock mode must not use the random sampler"),
        )

        self.assertEqual([question.question_id for question in attempt.questions], list(range(1, 41)))

    async def test_chapter_mode_preserves_first_twenty_repository_candidates(self):
        chapter = make_chapter(10, "a")
        questions = [make_question(question_id, [chapter]) for question_id in range(1, 26)]

        attempt = await create_attempt_with_repository_stubs(
            mode="chapter",
            questions=questions,
            chapters=[chapter],
            sampler=lambda _candidates, _count: self.fail("chapter mode must not use the random sampler"),
            chapter_ref=encode_public_ref("chapter", chapter.id),
        )

        self.assertEqual([question.question_id for question in attempt.questions], list(range(1, 21)))
        self.assertTrue(all(question.chapter_id == chapter.id for question in attempt.questions))

    async def test_weak_mode_preserves_rank_and_source_key_order(self):
        chapters = [make_chapter(10, "a"), make_chapter(20, "b"), make_chapter(30, "c")]
        questions = [
            make_question(question_id, [chapters[0]], source_key=f"question-{26 - question_id:03d}")
            for question_id in range(1, 26)
        ]
        completed = [
            SimpleNamespace(
                completed_at=TEST_NOW - timedelta(days=1),
                questions_total=30,
                score_percent=20,
                chapter_scores={10: (1, 10), 20: (2, 10), 30: (3, 10)},
            ),
        ]

        attempt = await create_attempt_with_repository_stubs(
            mode="weak",
            questions=questions,
            chapters=chapters,
            completed=completed,
            sampler=lambda _candidates, _count: self.fail("weak mode must not use the random sampler"),
        )

        self.assertEqual(
            [question.question_id for question in attempt.questions],
            [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6],
        )



if __name__ == "__main__":
    unittest.main()
