import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from sqlalchemy.exc import MissingGreenlet

from src.analyze.models import AnalyzeResultItem
from src.analyze.projection import select_free_chapter_id
from src.analyze.service import AnalyzeService
from src.terms.models import Definition  # noqa: F401


class _ExpiringResult:
    def __init__(self, result_id: int):
        self._result_id = result_id
        self.expired = False

    @property
    def id(self) -> int:
        if self.expired:
            raise MissingGreenlet("result.id was accessed after commit")
        return self._result_id


class _CommitExpiringSession:
    def __init__(self):
        self.result = None

    async def commit(self):
        self.result.expired = True


class AnalyzeServiceTests(unittest.TestCase):
    def test_save_parsed_data_keeps_result_id_before_commit(self):
        session = _CommitExpiringSession()
        loaded_result = object()
        observed = {}

        async def create_result(current_session, **kwargs):
            result = _ExpiringResult(result_id=42)
            current_session.result = result
            return result

        async def get_result(current_session, *, result_id, locale):
            observed["result_id"] = result_id
            observed["locale"] = locale
            return loaded_result

        with patch(
            "src.analyze.service.create_analyze_result",
            side_effect=create_result,
        ), patch(
            "src.analyze.service.get_analyze_result_by_id",
            side_effect=get_result,
        ):
            actual = asyncio.run(
                AnalyzeService(llmwhisperer_client=None).save_parsed_data(
                    session,
                    user_id=7,
                    parsed_data=[],
                    locale="ru",
                ),
            )

        self.assertIs(actual, loaded_result)
        self.assertEqual(observed, {"result_id": 42, "locale": "ru"})

    def test_missing_result_after_commit_logs_without_result_identifier(self):
        class _Result:
            id = "SECRET_RESULT_ID"

        class _Session:
            async def commit(self):
                return None

        async def create_result(current_session, **kwargs):
            return _Result()

        with patch(
            "src.analyze.service.create_analyze_result",
            side_effect=create_result,
        ), patch(
            "src.analyze.service.get_analyze_result_by_id",
            new=AsyncMock(return_value=None),
        ):
            with self.assertLogs("src.analyze.service", level="ERROR") as captured:
                with self.assertRaisesRegex(RuntimeError, "SECRET_RESULT_ID"):
                    asyncio.run(
                        AnalyzeService(llmwhisperer_client=None).save_parsed_data(
                            _Session(),
                            user_id=7,
                            parsed_data=[],
                        ),
                    )

        log_output = "\n".join(captured.output)
        self.assertIn("code=analyze_result_missing", log_output)
        self.assertIn("stage=persistence_invariant_failed", log_output)
        self.assertIn("reason=result_missing_after_commit", log_output)
        self.assertNotIn("SECRET_RESULT_ID", log_output)

    def test_missing_chapter_relation_logs_without_item_identifier(self):
        service = AnalyzeService(None)
        service.extract_text = AsyncMock(return_value="ignored")
        service.get_parsed_data = AsyncMock(return_value=[])
        service.save_parsed_data = AsyncMock(
            return_value=SimpleNamespace(
                items=[
                    SimpleNamespace(
                        id="SECRET_ITEM_ID",
                        chapter_id=1,
                        chapter=None,
                        question_count=1,
                        max_score=10,
                        score=2,
                        percentage=20,
                    )
                ]
            )
        )

        with (
            patch(
                "src.analyze.service.get_books_coverage_by_chapter_ids",
                new=AsyncMock(return_value={}),
            ),
            patch(
                "src.analyze.service.get_topic_material_summaries_by_chapter_ids",
                new=AsyncMock(return_value={}),
            ),
            patch(
                "src.analyze.service.get_topic_codes_by_chapter_ids",
                new=AsyncMock(return_value={}),
            ),
        ):
            with self.assertLogs("src.analyze.service", level="ERROR") as captured:
                with self.assertRaisesRegex(RuntimeError, "SECRET_ITEM_ID"):
                    asyncio.run(
                        service.analyze_document(
                            object(),
                            user_id=7,
                            file_content=b"pdf",
                        )
                    )

        log_output = "\n".join(captured.output)
        self.assertIn("code=analyze_result_invalid", log_output)
        self.assertIn("stage=domain_invariant_failed", log_output)
        self.assertIn("reason=chapter_relation_missing", log_output)
        self.assertNotIn("SECRET_ITEM_ID", log_output)

    def test_select_free_chapter_id_returns_none_when_all_items_are_perfect(self):
        items = [
            AnalyzeResultItem(
                chapter_id=2,
                question_count=3,
                max_score=3,
                score=3,
                percentage=100,
            ),
            AnalyzeResultItem(
                chapter_id=1,
                question_count=5,
                max_score=5,
                score=5,
                percentage=100,
            ),
        ]

        self.assertIsNone(select_free_chapter_id(items))


if __name__ == "__main__":
    unittest.main()
