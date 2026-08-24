# ruff: noqa: I001, PT009, PT027
import re
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from src.tests.errors import TestCatalogNotReadyError, TestCatalogStaleError
from src.tests.router import _attempt_response, _raise_http
from src.tests.router import router as tests_router
from src.tests.schemas import TestCompletionResponse, TestDashboardChapter, TestDashboardRecent, TestsDashboardResponse

ROOT = Path(__file__).resolve().parents[1]
ROUTER_SOURCE = (ROOT / "src" / "tests" / "router.py").read_text(encoding="utf-8")
MAIN_SOURCE = (ROOT / "src" / "main.py").read_text(encoding="utf-8")


class TestTestsRouterContract(unittest.TestCase):
    def test_completion_schema_exposes_nullable_server_accuracy_comparison(self):
        self.assertFalse(TestCompletionResponse.model_fields["previous_score_percent"].is_required())
        self.assertFalse(TestCompletionResponse.model_fields["accuracy_delta_points"].is_required())

    def test_dashboard_schema_requires_authoritative_completed_attempt_counts(self):
        self.assertIn("completed_attempt_count", TestsDashboardResponse.model_fields)
        self.assertTrue(TestsDashboardResponse.model_fields["completed_attempt_count"].is_required())
        self.assertIn("completed_attempt_count", TestDashboardChapter.model_fields)
        self.assertTrue(TestDashboardChapter.model_fields["completed_attempt_count"].is_required())

    def test_dashboard_recent_schema_requires_persisted_answer_totals(self):
        for field_name in (
            "correct_answer_count",
            "incorrect_answer_count",
            "skipped_question_count",
        ):
            with self.subTest(field_name=field_name):
                self.assertIn(field_name, TestDashboardRecent.model_fields)
                field = TestDashboardRecent.model_fields[field_name]
                self.assertTrue(field.is_required())
                self.assertEqual(field.annotation, int)

    def test_dashboard_without_token_returns_401_not_missing_current_user(self):
        app = FastAPI()
        app.include_router(tests_router, prefix="/api/tests")

        response = TestClient(app).get("/api/tests/dashboard?locale=ru")

        self.assertEqual(response.status_code, 401)
        self.assertNotIn("current_user", response.text)

    def test_correct_answer_is_hidden_until_an_answer_snapshot_exists(self):
        question = SimpleNamespace(
            question_ref="question-ref",
            prompt="Prompt",
            options_json=[{"option_ref": "a", "label": "A", "text": "Option"}],
            chapter_id=7,
            topic_title="Chapter",
            question_count=10,
            estimated_minutes=5,
            answer=None,
            correct_option_ref="secret",
            explanation="secret explanation",
        )
        attempt = SimpleNamespace(
            id=3,
            mode="random",
            title="Test",
            status="active",
            questions=[question],
            summary_json=None,
            started_at=None,
            completed_at=None,
        )

        response = _attempt_response(attempt).model_dump()

        self.assertEqual(response["answers"], {})
        self.assertIsNone(response["questions"][0]["explanation"])
        self.assertNotIn("secret", str(response))

    def test_attempt_response_derives_title_from_mode_and_locale(self):
        attempt = SimpleNamespace(
            id=3,
            mode="chapter",
            title="historical English title",
            status="completed",
            questions=[],
            summary_json=None,
            started_at=None,
            completed_at=None,
        )

        self.assertEqual(_attempt_response(attempt, "kk").title, "Бөлім бойынша тест")

    def test_exact_authenticated_routes_and_no_mode_route(self):
        self.assertIn("Depends(get_current_user)", ROUTER_SOURCE)
        for pattern in (
            '@router.get("/dashboard"',
            '@router.post("/attempts"',
            '@router.get("/attempts/{attempt_ref}"',
            '@router.post("/attempts/{attempt_ref}/questions/{question_ref}/answer"',
            '@router.post("/attempts/{attempt_ref}/complete"',
        ):
            self.assertIn(pattern, ROUTER_SOURCE)
        self.assertNotRegex(ROUTER_SOURCE, r'@router\.get\("/\{mode\}"')

    def test_route_order_static_dashboard_and_attempts_before_nested_paths(self):
        routes = re.findall(r'@router\.(?:get|post)\("([^"]+)"', ROUTER_SOURCE)
        self.assertLess(routes.index("/dashboard"), routes.index("/attempts"))
        self.assertNotIn("src.migrations", MAIN_SOURCE)
        self.assertIn("from src.tests.router import router as tests_router", MAIN_SOURCE)

    def test_catalog_reader_failures_are_503_with_distinct_codes(self):
        for error, code in (
            (TestCatalogNotReadyError(), "TEST_CATALOG_NOT_READY"),
            (TestCatalogStaleError("stale"), "TEST_CATALOG_STALE"),
        ):
            with self.assertRaises(HTTPException) as raised:
                _raise_http(error)
            self.assertEqual(raised.exception.status_code, 503)
            self.assertEqual(raised.exception.detail["code"], code)



if __name__ == "__main__":
    unittest.main()
