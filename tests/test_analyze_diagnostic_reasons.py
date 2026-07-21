import asyncio
import io
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from fastapi import UploadFile

from src.analyze.exceptions import (
    AnalyzeExtractionError,
    InvalidAnalyzeDocumentError,
)
from src.analyze.router import create_analyze_task
from src.analyze.serialization import decode_file_content
from src.analyze.service import AnalyzeService
from src.analyze.validation import validate_pdf_upload


class AnalyzeValidationReasonTests(unittest.TestCase):
    def test_invalid_serialized_file_content_has_stable_reason(self):
        with self.assertRaises(InvalidAnalyzeDocumentError) as raised:
            decode_file_content("not-base64")
        self.assertEqual(raised.exception.reason, "invalid_file_content")

    def test_validation_branches_have_stable_reasons(self):
        cases = (
            (lambda: validate_pdf_upload(b""), "empty_file"),
            (
                lambda: validate_pdf_upload(b"%PDF", content_type="text/plain"),
                "invalid_content_type",
            ),
            (lambda: validate_pdf_upload(b"not a pdf"), "invalid_pdf"),
        )

        for validate, reason in cases:
            with self.subTest(reason=reason):
                with self.assertRaises(InvalidAnalyzeDocumentError) as raised:
                    validate()
                self.assertEqual(raised.exception.reason, reason)

    def test_empty_and_unreadable_pdf_branches_have_stable_reasons(self):
        empty_pdf = SimpleNamespace(pages=[])
        empty_context = Mock()
        empty_context.__enter__ = Mock(return_value=empty_pdf)
        empty_context.__exit__ = Mock(return_value=None)

        with patch("src.analyze.validation.pdfplumber.open", return_value=empty_context):
            with self.assertRaises(InvalidAnalyzeDocumentError) as raised:
                validate_pdf_upload(b"%PDF")
        self.assertEqual(raised.exception.reason, "empty_pdf")

        with patch(
            "src.analyze.validation.pdfplumber.open",
            side_effect=RuntimeError("SECRET_UNREADABLE_PDF"),
        ):
            with self.assertRaises(InvalidAnalyzeDocumentError) as raised:
                validate_pdf_upload(b"%PDF")
        self.assertEqual(raised.exception.reason, "invalid_pdf")


class AnalyzeExtractionReasonTests(unittest.IsolatedAsyncioTestCase):
    async def test_define_pages_maps_pdf_failures_to_stable_reasons(self):
        service = AnalyzeService(None)
        with patch(
            "src.analyze.service.pdfplumber.open",
            side_effect=RuntimeError("SECRET_PDF_FAILURE"),
        ):
            with self.assertRaises(AnalyzeExtractionError) as raised:
                await service.define_pages(b"%PDF")
        self.assertEqual(raised.exception.reason, "extraction_failed")

        empty_pdf = SimpleNamespace(pages=[])
        empty_context = Mock()
        empty_context.__enter__ = Mock(return_value=empty_pdf)
        empty_context.__exit__ = Mock(return_value=None)
        with patch("src.analyze.service.pdfplumber.open", return_value=empty_context):
            with self.assertRaises(AnalyzeExtractionError) as raised:
                await service.define_pages(b"%PDF")
        self.assertEqual(raised.exception.reason, "empty_pdf")

    async def test_wait_for_extraction_status_branches_have_reasons(self):
        service = AnalyzeService(
            SimpleNamespace(whisper_status=lambda **kwargs: {"status_code": 500})
        )
        with self.assertRaises(AnalyzeExtractionError) as raised:
            await service.wait_for_extraction("hash")
        self.assertEqual(raised.exception.reason, "extraction_status_failed")

        service = AnalyzeService(
            SimpleNamespace(
                whisper_status=lambda **kwargs: {"status_code": 200, "status": "error"}
            )
        )
        with self.assertRaises(AnalyzeExtractionError) as raised:
            await service.wait_for_extraction("hash")
        self.assertEqual(raised.exception.reason, "extraction_failed")

        service = AnalyzeService(
            SimpleNamespace(
                whisper_status=lambda **kwargs: {
                    "status_code": 200,
                    "status": "unexpected",
                }
            )
        )
        with self.assertRaises(AnalyzeExtractionError) as raised:
            await service.wait_for_extraction("hash")
        self.assertEqual(raised.exception.reason, "unexpected_extraction_status")

    async def test_extract_text_branches_have_reasons(self):
        service = AnalyzeService(SimpleNamespace(whisper=lambda **kwargs: {"status_code": 202}))
        service.define_pages = AsyncMock(return_value="1-")
        with self.assertRaises(AnalyzeExtractionError) as raised:
            await service.extract_text(b"%PDF")
        self.assertEqual(raised.exception.reason, "missing_whisper_hash")

        for result, reason in (
            ({}, "empty_extraction"),
            ({"extraction": {"result_text": ""}}, "empty_extracted_text"),
        ):
            with self.subTest(reason=reason):
                service = AnalyzeService(SimpleNamespace(whisper=lambda **kwargs: result))
                service.define_pages = AsyncMock(return_value="1-")
                with self.assertRaises(AnalyzeExtractionError) as raised:
                    await service.extract_text(b"%PDF")
                self.assertEqual(raised.exception.reason, reason)

        service = AnalyzeService(
            SimpleNamespace(
                whisper=lambda **kwargs: (_ for _ in ()).throw(
                    RuntimeError("SECRET_WHISPER_FAILURE")
                )
            )
        )
        service.define_pages = AsyncMock(return_value="1-")
        with self.assertRaises(AnalyzeExtractionError) as raised:
            await service.extract_text(b"%PDF")
        self.assertEqual(raised.exception.reason, "extraction_failed")


class AnalyzeCleanupLoggingTests(unittest.IsolatedAsyncioTestCase):
    async def test_cleanup_failures_log_structured_fields_without_exception_text(self):
        session = AsyncMock()
        session.commit.side_effect = RuntimeError("SECRET_PRIMARY_FAILURE")
        revoked = Mock(
            revoke=Mock(side_effect=RuntimeError("SECRET_REVOKE_FAILURE")),
        )
        upload = UploadFile(file=io.BytesIO(b"pdf"), filename="secret.pdf")

        with (
            patch("src.analyze.router.validate_pdf_upload"),
            patch("src.analyze.router.reserve_analyze_task_owner", new=AsyncMock()),
            patch("src.analyze.router.release_analyze_task_owner", new=AsyncMock(side_effect=RuntimeError("SECRET_OWNER_FAILURE"))),
            patch("src.analyze.router.process_document.apply_async"),
            patch("src.analyze.router.AsyncResult", return_value=revoked),
        ):
            with self.assertLogs("src.analyze.router", level="WARNING") as captured:
                with self.assertRaisesRegex(RuntimeError, "SECRET_PRIMARY_FAILURE"):
                    await create_analyze_task(upload, SimpleNamespace(id=7), session)

        log_output = "\n".join(captured.output)
        self.assertIn("code=analyze_task_enqueue_failed", log_output)
        self.assertIn("stage=enqueue_failed", log_output)
        self.assertIn("reason=unexpected_exception", log_output)
        self.assertIn("code=analyze_cleanup_failed", log_output)
        self.assertIn("stage=cleanup_failed", log_output)
        self.assertIn("reason=task_revoke_failed", log_output)
        self.assertIn("reason=owner_release_failed", log_output)
        self.assertNotIn("SECRET_REVOKE_FAILURE", log_output)
        self.assertNotIn("SECRET_OWNER_FAILURE", log_output)
        self.assertNotIn("Traceback", log_output)


if __name__ == "__main__":
    unittest.main()
