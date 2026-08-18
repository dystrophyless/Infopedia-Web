import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from src.analyze.router import get_latest_analyze_result
from src.analyze.service import AnalyzeService
from src.analyze.utils import build_sse_message, build_task_response


LOCKED_TOPIC_SECRET = "LOCKED_TOPIC_SECRET"
LOCKED_TOPIC_TITLE = "LOCKED_TITLE_SENTINEL"


def _result_rows():
    return [
        {
            "chapter_id": 1,
            "code": "free-chapter",
            "title": "Free chapter",
            "question_count": 10,
            "max_score": 10,
            "score": 2,
            "percentage": 20,
            "books": [],
            "topic_count": 1,
            "material_grades": [10],
            "topic_codes": [{"name": "FREE_TOPIC_CODE", "title": "Free topic"}],
        },
        {
            "chapter_id": 2,
            "code": "locked-chapter",
            "title": "Locked chapter",
            "question_count": 10,
            "max_score": 10,
            "score": 9,
            "percentage": 90,
            "books": [],
            "topic_count": 4,
            "material_grades": [11],
            "topic_codes": [
                {
                    "name": LOCKED_TOPIC_SECRET,
                    "title": LOCKED_TOPIC_TITLE,
                    "definition": "must not escape",
                    "pages": [99],
                }
            ],
        },
    ]


def _assert_public_json(test_case, value, *, contains_free_topic=True):
    encoded = json.dumps(value, ensure_ascii=False)
    test_case.assertNotIn(LOCKED_TOPIC_SECRET, encoded)
    test_case.assertNotIn(LOCKED_TOPIC_TITLE, encoded)
    test_case.assertNotIn("definition", encoded)
    test_case.assertNotIn("pages", encoded)
    if contains_free_topic:
        test_case.assertIn("FREE_TOPIC_CODE", encoded)


class AnalyzeResponseSecurityTests(unittest.IsolatedAsyncioTestCase):
    async def test_worker_service_result_is_safe_and_keeps_free_topic_codes(self):
        service = AnalyzeService(None)
        service.extract_text = AsyncMock(return_value="ignored")
        service.get_parsed_data = AsyncMock(return_value=[])
        chapter_items = [
            SimpleNamespace(
                id=1,
                chapter_id=1,
                chapter=SimpleNamespace(code="free-chapter", title="Free chapter"),
                question_count=10,
                max_score=10,
                score=2,
                percentage=20,
            ),
            SimpleNamespace(
                id=2,
                chapter_id=2,
                chapter=SimpleNamespace(code="locked-chapter", title="Locked chapter"),
                question_count=10,
                max_score=10,
                score=9,
                percentage=90,
            ),
        ]
        service.save_parsed_data = AsyncMock(
            return_value=SimpleNamespace(items=chapter_items)
        )

        with (
            patch(
                "src.analyze.service.get_books_coverage_by_chapter_ids",
                new=AsyncMock(return_value={1: [], 2: []}),
            ),
            patch(
                "src.analyze.service.get_topic_material_summaries_by_chapter_ids",
                new=AsyncMock(
                    return_value={
                        1: {"topic_count": 1, "material_grades": [10]},
                        2: {"topic_count": 4, "material_grades": [11]},
                    }
                ),
            ),
            patch(
                "src.analyze.service.get_topic_codes_by_chapter_ids",
                new=AsyncMock(
                    return_value={
                        1: [{"name": "FREE_TOPIC_CODE", "title": "Free topic"}],
                        2: [
                            {
                                "name": LOCKED_TOPIC_SECRET,
                                "title": LOCKED_TOPIC_TITLE,
                            }
                        ],
                    }
                ),
            ) as topic_codes,
        ):
            result = await service.analyze_document(
                object(), user_id=1, file_content=b"pdf"
            )

        _assert_public_json(self, result)
        self.assertEqual(topic_codes.await_args.kwargs["chapter_ids"], [1])
        self.assertEqual(result[1]["topic_codes"], [])
        self.assertEqual(result[1]["topic_count"], 4)
        self.assertEqual(result[1]["material_grades"], [11])

    def test_get_task_response_sanitizes_saved_worker_payload(self):
        task_payload = {"status": "success", "result": _result_rows()}
        task = SimpleNamespace(status="SUCCESS", result=task_payload)

        response = build_task_response("task-1", task)

        _assert_public_json(self, response)
        self.assertEqual(response["result"][1]["topic_codes"], [])

    def test_sse_sanitizes_immediately_before_json_encoding(self):
        message = build_sse_message(
            {"task_id": "task-1", "status": "success", "result": _result_rows()}
        )
        event, data = message.split("\ndata: ", 1)
        payload = json.loads(data.rsplit("\n\n", 1)[0])

        self.assertEqual(event, "event: task.completed")
        _assert_public_json(self, payload)
        self.assertEqual(payload["result"][1]["topic_codes"], [])

    async def test_latest_route_sanitizes_before_response_serialization(self):
        chapter_items = [
            SimpleNamespace(
                chapter_id=1,
                chapter=SimpleNamespace(code="free-chapter", title="Free chapter"),
                question_count=10,
                max_score=10,
                score=2,
                percentage=20,
            ),
            SimpleNamespace(
                chapter_id=2,
                chapter=SimpleNamespace(code="locked-chapter", title="Locked chapter"),
                question_count=10,
                max_score=10,
                score=9,
                percentage=90,
            ),
        ]
        analyze_result = SimpleNamespace(items=chapter_items)
        with (
            patch(
                "src.analyze.router.get_analyze_result_by_user_id",
                new=AsyncMock(return_value=analyze_result),
            ),
            patch(
                "src.analyze.router.get_books_coverage_by_chapter_ids",
                new=AsyncMock(return_value={1: [], 2: []}),
            ),
            patch(
                "src.analyze.router.get_topic_material_summaries_by_chapter_ids",
                new=AsyncMock(
                    return_value={
                        1: {"topic_count": 1, "material_grades": [10]},
                        2: {"topic_count": 4, "material_grades": [11]},
                    }
                ),
            ),
            patch(
                "src.analyze.router.get_topic_codes_by_chapter_ids",
                new=AsyncMock(
                    return_value={
                        1: [{"name": "FREE_TOPIC_CODE", "title": "Free topic"}],
                        2: [
                            {
                                "name": LOCKED_TOPIC_SECRET,
                                "title": LOCKED_TOPIC_TITLE,
                            }
                        ],
                    }
                ),
            ) as topic_codes,
        ):
            response = await get_latest_analyze_result(
                object(), SimpleNamespace(id=1), locale="kk"
            )

        _assert_public_json(self, [item.model_dump() for item in response])
        self.assertEqual(topic_codes.await_args.kwargs["chapter_ids"], [1])
        self.assertEqual(response[1].topic_codes, [])


if __name__ == "__main__":
    unittest.main()
