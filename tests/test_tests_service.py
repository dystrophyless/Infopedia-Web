# ruff: noqa: PT009, PT027
import os
import unittest
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

import src.models  # noqa: F401 - register SQLAlchemy relationships for snapshot construction
from src.migrations.tests_migration import migrate_tests_schema
from src.security.public_refs import encode_public_ref
from src.tests.models import TestAttempt, TestQuestion, TestQuestionOption
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
from src.topics.models import Chapter, Topic, TopicCode, TopicMapping
from src.users.models import User

TEST_NOW = datetime(2026, 8, 8, 12, 0, tzinfo=UTC)


class AttemptSessionStub:
    def __init__(self, chapters: list[SimpleNamespace], expected_questions: int) -> None:
        self.chapters = {chapter.id: chapter for chapter in chapters}
        self.attempt = None
        self.expected_questions = expected_questions
        self.flush_count = 0
        self.commit_count = 0

    def add(self, attempt) -> None:
        self.attempt = attempt

    async def flush(self) -> None:
        self.flush_count += 1
        if self.flush_count == 1:
            if self.attempt is None or len(self.attempt.questions) != self.expected_questions:
                raise AssertionError(
                    "first flush must see the complete question graph",
                )
            self.attempt.id = 700

    async def commit(self) -> None:
        self.commit_count += 1

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
    return_session: bool = False,
):
    expected_questions = 40 if mode == "mock" else min(20, len(questions))
    session = AttemptSessionStub(chapters, expected_questions)
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
        attempt = await TestsService(session, now=TEST_NOW, sampler=sampler).create_attempt(
            user_id=7,
            mode=mode,
            chapter_ref=chapter_ref,
        )
    return (attempt, session) if return_session else attempt


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


class AttemptCompletionDeltaTests(unittest.IsolatedAsyncioTestCase):
    @staticmethod
    def _attempt(*, status="active", summary_json=None):
        answer = SimpleNamespace(awarded_weight=1)
        question = SimpleNamespace(
            id=1,
            answer=answer,
            chapter_id=10,
            topic_title="Chapter",
        )
        return SimpleNamespace(
            id=42,
            user_id=7,
            mode="random",
            status=status,
            completed_at=TEST_NOW if status == "completed" else None,
            started_at=TEST_NOW - timedelta(seconds=20),
            questions=[question],
            summary_json=summary_json,
            answered_questions=0,
            correct_answer_count=0,
            score_percent=None,
            duration_seconds=None,
            average_pace_seconds=None,
        )

    async def test_completion_persists_delta_against_previous_same_mode_attempt(self):
        attempt = self._attempt()
        session = SimpleNamespace(commit=AsyncMock())
        previous = SimpleNamespace(score_percent=65)
        with (
            patch("src.tests.service.get_attempt_for_update", new=AsyncMock(return_value=attempt)),
            patch("src.tests.service.lock_attempt_questions", new=AsyncMock(return_value=attempt.questions)),
            patch("src.tests.service.get_previous_completed_attempt", new=AsyncMock(return_value=previous)) as lookup,
        ):
            summary = await TestsService(session, now=TEST_NOW).complete_attempt(
                user_id=7,
                attempt_ref=encode_public_ref("attempt", 42),
            )

        self.assertEqual(summary["previous_score_percent"], 65)
        self.assertEqual(summary["accuracy_delta_points"], 35)
        self.assertEqual(attempt.summary_json, summary)
        lookup.assert_awaited_once_with(
            session,
            user_id=7,
            mode="random",
            exclude_attempt_id=42,
        )

    async def test_completion_uses_null_delta_when_no_previous_attempt_exists(self):
        attempt = self._attempt()
        session = SimpleNamespace(commit=AsyncMock())
        with (
            patch("src.tests.service.get_attempt_for_update", new=AsyncMock(return_value=attempt)),
            patch("src.tests.service.lock_attempt_questions", new=AsyncMock(return_value=attempt.questions)),
            patch("src.tests.service.get_previous_completed_attempt", new=AsyncMock(return_value=None)),
        ):
            summary = await TestsService(session, now=TEST_NOW).complete_attempt(
                user_id=7,
                attempt_ref=encode_public_ref("attempt", 42),
            )

        self.assertIsNone(summary["previous_score_percent"])
        self.assertIsNone(summary["accuracy_delta_points"])

    async def test_repeated_completion_returns_persisted_delta_without_lookup(self):
        persisted = {
            "score_percent": 70,
            "previous_score_percent": 70,
            "accuracy_delta_points": 0,
        }
        attempt = self._attempt(status="completed", summary_json=persisted)
        session = SimpleNamespace(commit=AsyncMock())
        lookup = AsyncMock()
        with (
            patch("src.tests.service.get_attempt_for_update", new=AsyncMock(return_value=attempt)),
            patch("src.tests.service.get_previous_completed_attempt", new=lookup),
        ):
            summary = await TestsService(session, now=TEST_NOW).complete_attempt(
                user_id=7,
                attempt_ref=encode_public_ref("attempt", 42),
            )

        self.assertIs(summary, persisted)
        lookup.assert_not_awaited()
        session.commit.assert_not_awaited()

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
    async def test_create_attempt_builds_complete_relationship_graph_before_flush(self):
        chapter = make_chapter(10, "a")
        questions = [make_question(question_id, [chapter]) for question_id in range(1, 41)]

        attempt, session = await create_attempt_with_repository_stubs(
            mode="random",
            questions=questions,
            chapters=[chapter],
            sampler=lambda candidates, count: list(candidates[:count]),
            return_session=True,
        )

        self.assertEqual(session.flush_count, 1)
        self.assertEqual(session.commit_count, 1)
        self.assertEqual(len(attempt.questions), 20)
        self.assertEqual(attempt.id, 700)
        self.assertTrue(all(snapshot.attempt is attempt for snapshot in attempt.questions))

    async def test_create_attempt_persists_relationship_graph_with_real_async_session(self):
        database_url = os.environ.get("TEST_DATABASE_URL", "")
        if not database_url:
            self.skipTest("NOT RUN: set TEST_DATABASE_URL for the PostgreSQL persistence regression")
        if not database_url.startswith("postgresql+psycopg"):
            self.fail("PostgreSQL persistence regression requires a postgresql+psycopg TEST_DATABASE_URL")

        engine = create_async_engine(database_url, pool_size=2, max_overflow=0)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        attempt_id: int | None = None
        question_ids: list[int] = []
        try:
            await migrate_tests_schema(engine)
            async with sessions() as session:
                user_id = (await session.execute(select(User.id).order_by(User.id).limit(1))).scalar_one_or_none()
                eligibility = (
                    await session.execute(
                        select(Topic.id, Chapter.id)
                        .join(TopicMapping, TopicMapping.topic_id == Topic.id)
                        .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
                        .join(Chapter, Chapter.id == TopicCode.chapter_id)
                        .order_by(Topic.id, Chapter.id)
                        .limit(1),
                    )
                ).one_or_none()
                if user_id is None or eligibility is None:
                    self.skipTest("NOT RUN: PostgreSQL app schema has no user and eligible topic/chapter fixture")
                topic_id, _chapter_id = eligibility
                prefix = f"attempt-relationship-{uuid4().hex}"
                for index in range(20):
                    question = TestQuestion(
                        source_key=f"{prefix}-{index:02d}",
                        topic_id=topic_id,
                        prompt=f"Persistence question {index}",
                        explanation="Persistence regression",
                    )
                    question.options.extend(
                        [
                            TestQuestionOption(source_ref="a", label="A", text="Correct", is_correct=True),
                            TestQuestionOption(source_ref="b", label="B", text="Wrong", is_correct=False),
                        ],
                    )
                    session.add(question)
                    question_ids.append(question.id)
                await session.flush()
                question_ids = [
                    row[0]
                    for row in (
                        await session.execute(
                            select(TestQuestion.id).where(TestQuestion.source_key.like(f"{prefix}-%")),
                        )
                    ).all()
                ]

                def choose_regression_questions(candidates, count):
                    selected = [question for question in candidates if question.id in question_ids]
                    return selected[:count]

                attempt = await TestsService(session, now=TEST_NOW, sampler=choose_regression_questions).create_attempt(
                    user_id=user_id,
                    mode="random",
                )
                attempt_id = attempt.id
                self.assertEqual(len(attempt.questions), 20)
                self.assertTrue(all(snapshot.attempt_id == attempt.id for snapshot in attempt.questions))

            async with sessions() as verify:
                persisted = (
                    await verify.execute(
                        select(TestAttempt)
                        .options(selectinload(TestAttempt.questions))
                        .where(TestAttempt.id == attempt_id),
                    )
                ).scalar_one()
                self.assertEqual(len(persisted.questions), 20)
                self.assertTrue(all(snapshot.attempt_id == persisted.id for snapshot in persisted.questions))
        finally:
            async with engine.begin() as cleanup:
                if attempt_id is not None:
                    await cleanup.execute(delete(TestAttempt).where(TestAttempt.id == attempt_id))
                if question_ids:
                    await cleanup.execute(delete(TestQuestion).where(TestQuestion.id.in_(question_ids)))
            await engine.dispose()

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
