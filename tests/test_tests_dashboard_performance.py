# ruff: noqa: PT009, PT027
from __future__ import annotations

import unittest
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy.dialects import postgresql

import src.models  # noqa: F401 - register SQLAlchemy relationships before compiling statements
from src.tests.errors import TestCatalogNotReadyError, TestCatalogStaleError
from src.tests.repository import (
    _validate_catalog_rows,
    dashboard_catalog_snapshot_statement,
)
from src.tests.service import TestsService

NOW = datetime(2026, 8, 8, 12, 0, tzinfo=UTC)


def chapter(chapter_id: int, code: str) -> SimpleNamespace:
    return SimpleNamespace(
        id=chapter_id,
        code=code,
        translations=[SimpleNamespace(locale="ru", title=f"Chapter {code}")],
    )


class TestTestsDashboardPerformance(unittest.IsolatedAsyncioTestCase):
    def test_catalog_snapshot_has_one_distinct_weak_pool_count_for_selected_ids(self):
        sql = str(
            dashboard_catalog_snapshot_statement(weak_chapter_ids=[7, 3, 7]).compile(
                dialect=postgresql.dialect(),
                compile_kwargs={"literal_binds": True},
            ),
        ).upper()
        self.assertIn("COUNT(DISTINCT(TEST_QUESTION.ID))", sql)
        self.assertIn("CHAPTER_ID IN (3, 7)", sql)

    def test_catalog_reader_distinguishes_missing_pointer_from_stale_generation(self):
        with self.assertRaises(TestCatalogNotReadyError):
            _validate_catalog_rows([SimpleNamespace(current_generation_id=None)])
        with self.assertRaises(TestCatalogStaleError):
            _validate_catalog_rows(
                [
                    SimpleNamespace(
                        current_generation_id=3,
                        generation_id=3,
                        schema_version=999,
                        source_fingerprint="fingerprint",
                        refreshed_at=NOW,
                        chapter_id=None,
                        active_question_count=1,
                        weak_question_count=0,
                    ),
                ],
            )

    def test_catalog_reader_normalizes_string_schema_version(self):
        snapshot = _validate_catalog_rows(
            [
                SimpleNamespace(
                    current_generation_id=3,
                    generation_id=3,
                    schema_version="1",
                    source_fingerprint="fingerprint",
                    refreshed_at=NOW,
                    chapter_id=None,
                    active_question_count=1,
                    weak_question_count=0,
                ),
            ],
        )
        self.assertEqual(snapshot["schema_version"], 1)

    def test_catalog_reader_rejects_malformed_schema_versions(self):
        for schema_version in ("", " 1", "1 ", "1.0", "nope", 2, True):
            with self.subTest(schema_version=schema_version), self.assertRaises(TestCatalogStaleError):
                _validate_catalog_rows(
                    [
                        SimpleNamespace(
                            current_generation_id=3,
                            generation_id=3,
                            schema_version=schema_version,
                            source_fingerprint="fingerprint",
                            refreshed_at=NOW,
                            chapter_id=None,
                            active_question_count=1,
                            weak_question_count=0,
                        ),
                    ],
                )

    async def test_stats_reader_does_not_load_questions_or_options(self):
        chapters = [chapter(1, "c1"), chapter(2, "c2"), chapter(3, "c3")]
        snapshot = {
            "history": [
                {"attempt_id": 1, "completed_at": NOW, "chapter_id": 1, "awarded_weight": 0},
                {"attempt_id": 1, "completed_at": NOW, "chapter_id": 2, "awarded_weight": 1},
            ],
            "recent": [{"id": 1, "mode": "random", "title": "Recent", "completed_at": NOW}],
            "catalog": {
                "schema_version": 1,
                "generation_id": 5,
                "refreshed_at": NOW,
                "total_count": 19,
                "chapter_counts": {1: 2, 2: 3, 3: 14},
                "weak_question_count": 0,
            },
        }
        query_counts = {"chapters": 0, "history": 0, "catalog": 0, "latest_analyze": 0}

        async def counted_chapters(*args, **kwargs):
            query_counts["chapters"] += 1
            return chapters

        async def counted_history(*args, **kwargs):
            query_counts["history"] += 1
            return {"history": snapshot["history"], "recent": snapshot["recent"]}

        async def counted_catalog(*args, **kwargs):
            query_counts["catalog"] += 1
            return snapshot["catalog"]

        async def counted_latest_analyze(*args, **kwargs):
            query_counts["latest_analyze"] += 1
            return None

        with (
            patch("src.config.settings.TEST_CATALOG_STATS_READ_ENABLED", True),
            patch("src.tests.service.list_questions", new=AsyncMock(side_effect=AssertionError("list_questions is forbidden"))),
            patch("src.tests.service.list_chapters", new=AsyncMock(side_effect=counted_chapters)),
            patch("src.tests.service._chapter_rank_by_code", return_value={"c1": 1, "c2": 2, "c3": 3}),
            patch("src.tests.service.read_dashboard_history", new=AsyncMock(side_effect=counted_history)),
            patch("src.tests.service.read_dashboard_catalog_snapshot", new=AsyncMock(side_effect=counted_catalog)),
            patch("src.tests.service.get_latest_analyze_result_for_tests", new=AsyncMock(side_effect=counted_latest_analyze)),
        ):
            dashboard = await TestsService(SimpleNamespace(), now=NOW).dashboard(user_id=7)

        self.assertEqual(dashboard["mode_availability"][0]["disabled_reason"]["available_questions"], 19)
        self.assertEqual(len(dashboard["recent_tests"]), 1)
        self.assertEqual(query_counts, {"chapters": 1, "history": 1, "catalog": 1, "latest_analyze": 1})
        self.assertEqual(sum(query_counts.values()), 4)

    async def test_stats_reader_propagates_catalog_readiness_errors(self):
        for error in (TestCatalogNotReadyError(), TestCatalogStaleError("stale")):
            with (
                patch("src.config.settings.TEST_CATALOG_STATS_READ_ENABLED", True),
                patch("src.tests.service.read_dashboard_history", new=AsyncMock(side_effect=error)),
                patch("src.tests.service.list_chapters", new=AsyncMock(return_value=[])),
                self.assertRaises(type(error)),
            ):
                await TestsService(SimpleNamespace(), now=NOW).dashboard(user_id=7)

    async def test_legacy_dashboard_path_is_unchanged_when_flag_is_false(self):
        with (
            patch("src.config.settings.TEST_CATALOG_STATS_READ_ENABLED", False),
            patch("src.tests.service.list_chapters", new=AsyncMock(return_value=[])),
            patch("src.tests.service.question_counts_by_chapter", new=AsyncMock(return_value={})),
            patch("src.tests.service.list_completed_attempts", new=AsyncMock(return_value=[])),
            patch("src.tests.service.list_questions", new=AsyncMock(return_value=[])),
            patch("src.tests.service.get_latest_analyze_result_for_tests", new=AsyncMock(return_value=None)),
        ):
            dashboard = await TestsService(SimpleNamespace(), now=NOW).dashboard(user_id=7)

        self.assertEqual(dashboard["delta_window_days"], 7)
        self.assertEqual(dashboard["recent_tests"], [])
        self.assertEqual([row["mode"] for row in dashboard["mode_availability"]], ["random", "mock", "weak", "chapter"])

    async def test_catalog_and_legacy_paths_share_snapshot_metric_truth_table(self):
        chapters = [chapter(1, "c1"), chapter(2, "c2")]
        completed_at = NOW - timedelta(days=1)
        attempts = [
            SimpleNamespace(
                id=1,
                mode="random",
                chapter_id=None,
                completed_at=completed_at,
                questions=[
                    SimpleNamespace(chapter_id=1, answer=SimpleNamespace(awarded_weight=1)),
                    SimpleNamespace(chapter_id=2, answer=None),
                ],
                title="historical English",
            ),
            SimpleNamespace(
                id=2,
                mode="weak",
                chapter_id=None,
                completed_at=completed_at,
                questions=[SimpleNamespace(chapter_id=1, answer=SimpleNamespace(awarded_weight=0))],
                title="historical English",
            ),
            SimpleNamespace(
                id=3,
                mode="mock",
                chapter_id=None,
                completed_at=completed_at,
                questions=[SimpleNamespace(chapter_id=2, answer=SimpleNamespace(awarded_weight=1))],
                title="historical English",
            ),
            SimpleNamespace(
                id=4,
                mode="chapter",
                chapter_id=1,
                completed_at=completed_at,
                questions=[
                    SimpleNamespace(chapter_id=1, answer=None),
                    SimpleNamespace(chapter_id=2, answer=SimpleNamespace(awarded_weight=1)),
                ],
                title="historical English",
            ),
            SimpleNamespace(
                id=5,
                mode="malformed",
                chapter_id=1,
                completed_at=completed_at,
                questions=[SimpleNamespace(chapter_id=1, answer=SimpleNamespace(awarded_weight=1))],
                title="historical English",
            ),
        ]
        history = [
            {"attempt_id": 1, "completed_at": completed_at, "mode": "random", "attempt_chapter_id": None, "chapter_id": 1, "awarded_weight": 1},
            {"attempt_id": 1, "completed_at": completed_at, "mode": "random", "attempt_chapter_id": None, "chapter_id": 2, "awarded_weight": None},
            {"attempt_id": 2, "completed_at": completed_at, "mode": "weak", "attempt_chapter_id": None, "chapter_id": 1, "awarded_weight": 0},
            {"attempt_id": 3, "completed_at": completed_at, "mode": "mock", "attempt_chapter_id": None, "chapter_id": 2, "awarded_weight": 1},
            {"attempt_id": 4, "completed_at": completed_at, "mode": "chapter", "attempt_chapter_id": 1, "chapter_id": 1, "awarded_weight": None},
            {"attempt_id": 4, "completed_at": completed_at, "mode": "chapter", "attempt_chapter_id": 1, "chapter_id": 2, "awarded_weight": 1},
            {"attempt_id": 5, "completed_at": completed_at, "mode": "malformed", "attempt_chapter_id": 1, "chapter_id": 1, "awarded_weight": 1},
        ]

        with (
            patch("src.config.settings.TEST_CATALOG_STATS_READ_ENABLED", False),
            patch("src.tests.service.list_chapters", new=AsyncMock(return_value=chapters)),
            patch("src.tests.service.question_counts_by_chapter", new=AsyncMock(return_value={1: 2, 2: 3})),
            patch("src.tests.service.list_completed_attempts", new=AsyncMock(return_value=attempts)),
            patch("src.tests.service._chapter_rank_by_code", return_value={"c1": 1, "c2": 2}),
            patch.object(TestsService, "_mode_availability", new=AsyncMock(return_value=[])),
        ):
            legacy = await TestsService(SimpleNamespace(), now=NOW).dashboard(user_id=7)

        with (
            patch("src.config.settings.TEST_CATALOG_STATS_READ_ENABLED", True),
            patch("src.tests.service.list_chapters", new=AsyncMock(return_value=chapters)),
            patch("src.tests.service._chapter_rank_by_code", return_value={"c1": 1, "c2": 2}),
            patch("src.tests.service.read_dashboard_history", new=AsyncMock(return_value={"history": history, "recent": [{"id": 1, "mode": "random", "title": "historical English", "completed_at": completed_at}]})),
            patch("src.tests.service.read_dashboard_catalog_snapshot", new=AsyncMock(return_value={"chapter_counts": {1: 2, 2: 3}, "total_count": 5, "weak_question_count": 0})),
            patch("src.tests.service.get_latest_analyze_result_for_tests", new=AsyncMock(return_value=None)),
        ):
            catalog = await TestsService(SimpleNamespace(), now=NOW).dashboard(user_id=7)

        for dashboard in (legacy, catalog):
            self.assertEqual(dashboard["completed_attempt_count"], 5)
            self.assertEqual(dashboard["overall_accuracy"], 57.14)
            self.assertEqual([row["completed_attempt_count"] for row in dashboard["chapters"]], [1, 0])
            self.assertEqual([row["accuracy"] for row in dashboard["chapters"]], [0, None])
            self.assertEqual(dashboard["recent_tests"][0]["title"], "Случайный тест")
            self.assertEqual(dashboard["recent_tests"][0]["accuracy"], 50)


if __name__ == "__main__":
    unittest.main()
