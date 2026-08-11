# ruff: noqa: PT009, PT027
from __future__ import annotations

import unittest
from datetime import UTC, datetime
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
        with (
            patch("src.config.settings.TEST_CATALOG_STATS_READ_ENABLED", True),
            patch("src.tests.service.list_questions", new=AsyncMock(side_effect=AssertionError("list_questions is forbidden"))),
            patch("src.tests.service.list_chapters", new=AsyncMock(return_value=chapters)),
            patch("src.tests.service._chapter_rank_by_code", return_value={"c1": 1, "c2": 2, "c3": 3}),
            patch("src.tests.service.read_dashboard_history", new=AsyncMock(return_value={"history": snapshot["history"], "recent": snapshot["recent"]})),
            patch("src.tests.service.read_dashboard_catalog_snapshot", new=AsyncMock(return_value=snapshot["catalog"])),
            patch("src.tests.service.get_latest_analyze_result_for_tests", new=AsyncMock(return_value=None)),
        ):
            dashboard = await TestsService(SimpleNamespace(), now=NOW).dashboard(user_id=7)

        self.assertEqual(dashboard["mode_availability"][0]["disabled_reason"]["available_questions"], 19)
        self.assertEqual(len(dashboard["recent_tests"]), 1)

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


if __name__ == "__main__":
    unittest.main()
