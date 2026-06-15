import unittest
from typing import get_type_hints
from unittest.mock import AsyncMock, patch

from src.analyze.exceptions import (
    InvalidAnalyzeDocumentError,
    UnsupportedAnalyzeDocumentError,
)
from src.analyze.parser import parse_table
from src.analyze.serialization import encode_file_content
from src.analyze.service import get_analyze_result
from src.analyze.validation import validate_pdf_upload
from src.celery_app.analyze_task import run_analyze_task


class AnalyzeValidationTests(unittest.IsolatedAsyncioTestCase):
    def test_validate_pdf_upload_rejects_non_pdf_bytes(self):
        with self.assertRaises(InvalidAnalyzeDocumentError) as context:
            validate_pdf_upload(
                b"not a pdf",
                content_type="application/pdf",
            )

        self.assertEqual(context.exception.code, "invalid_document_type")

    def test_parse_table_rejects_text_without_expected_table(self):
        with self.assertRaises(UnsupportedAnalyzeDocumentError) as context:
            parse_table("plain text from a random uploaded document")

        self.assertEqual(context.exception.code, "unsupported_document")

    async def test_analyze_task_returns_typed_failure_for_analyze_errors(self):
        error = UnsupportedAnalyzeDocumentError()

        with (
            patch(
                "src.celery_app.analyze_task.publish_analyze_task_event",
                new_callable=AsyncMock,
            ),
            patch(
                "src.celery_app.analyze_task.publish_analyze_task_progress",
                new_callable=AsyncMock,
            ),
            patch(
                "src.celery_app.analyze_task.get_analyze_result",
                new=AsyncMock(side_effect=error),
            ),
        ):
            payload = await run_analyze_task(
                task_id="task-1",
                user_id=1,
                file_content_b64=encode_file_content(b"%PDF-1.4"),
            )

        self.assertEqual(payload["status"], "failure")
        self.assertEqual(payload["stage"], "validation_failed")
        self.assertEqual(payload["error"]["code"], "unsupported_document")

    def test_get_analyze_result_return_annotation_matches_payload(self):
        hints = get_type_hints(get_analyze_result)

        self.assertEqual(hints["return"], list[dict])


if __name__ == "__main__":
    unittest.main()
