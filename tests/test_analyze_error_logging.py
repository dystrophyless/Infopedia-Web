import ast
import base64
import io
import logging
import re
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException, UploadFile

from src.analyze.exceptions import UnsupportedAnalyzeDocumentError
from src.analyze.parser import parse_table
from src.analyze.repository import create_analyze_result
from src.celery_app.analyze_task import run_analyze_task
from src.analyze.router import create_analyze_task
from src.analyze.utils import assert_task_owner
import src.auth.models  # noqa: F401
import src.terms.models  # noqa: F401


class _AsyncSessionContext:
    async def __aenter__(self):
        return object()

    async def __aexit__(self, exc_type, exc_value, traceback):
        return None


class AnalyzeErrorLoggingTests(unittest.IsolatedAsyncioTestCase):
    async def test_unexpected_exception_log_excludes_exception_text_and_traceback(self):
        exception_marker = "SECRET_UNEXPECTED_EXCEPTION_TEXT"
        session_context = _AsyncSessionContext()
        published_events = []

        async def publish_event(task_id, payload):
            published_events.append((task_id, payload))

        with (
            patch(
                "src.celery_app.analyze_task.AsyncSessionMaker",
                return_value=session_context,
            ),
            patch(
                "src.celery_app.analyze_task.get_analyze_result",
                new=AsyncMock(side_effect=RuntimeError(exception_marker)),
            ),
            patch(
                "src.celery_app.analyze_task.publish_analyze_task_progress",
                new=AsyncMock(),
            ),
            patch(
                "src.celery_app.analyze_task.publish_analyze_task_event",
                new=publish_event,
            ),
        ):
            with self.assertLogs(
                "src.celery_app.analyze_task",
                level="ERROR",
            ) as captured:
                payload = await run_analyze_task(
                    task_id="task-unexpected",
                    user_id=7,
                    file_content_b64=base64.b64encode(b"pdf").decode("ascii"),
                )

        log_output = "\n".join(captured.output)
        self.assertIn("code=analyze_execution_failed", log_output)
        self.assertIn("stage=failed", log_output)
        self.assertIn("reason=unexpected_exception", log_output)
        self.assertIn("task_id=task-unexpected", log_output)
        self.assertNotIn(exception_marker, log_output)
        self.assertNotIn("Traceback", log_output)
        expected_payload = {
            "task_id": "task-unexpected",
            "status": "failure",
            "stage": "failed",
            "result": None,
            "error": {
                "code": "analyze_execution_failed",
                "message": "Не удалось выполнить задачу анализа документа.",
            },
        }
        self.assertEqual(payload, expected_payload)
        self.assertEqual(published_events, [("task-unexpected", expected_payload)])

    async def test_unsupported_document_is_logged_before_failure_payload(self):
        error = UnsupportedAnalyzeDocumentError(
            reason="no_table_rows",
            context={
                "row_index": 4,
                "document_text": "SECRET_DOCUMENT_TEXT",
                "filename": "SECRET_DOCUMENT_FILENAME.pdf",
                "file_bytes": b"SECRET_FILE_BYTES",
            },
        )
        session_context = _AsyncSessionContext()

        with (
            patch(
                "src.celery_app.analyze_task.AsyncSessionMaker",
                return_value=session_context,
            ),
            patch(
                "src.celery_app.analyze_task.get_analyze_result",
                new=AsyncMock(side_effect=error),
            ),
            patch(
                "src.celery_app.analyze_task.publish_analyze_task_progress",
                new=AsyncMock(),
            ),
            patch(
                "src.celery_app.analyze_task.publish_analyze_task_event",
                new=AsyncMock(),
            ),
        ):
            with self.assertLogs(
                "src.celery_app.analyze_task",
                level="WARNING",
            ) as captured:
                payload = await run_analyze_task(
                    task_id="task-1",
                    user_id=7,
                    file_content_b64=base64.b64encode(b"pdf").decode("ascii"),
                )

        log_output = "\n".join(captured.output)
        self.assertIn("code=unsupported_document", log_output)
        self.assertIn("stage=validation_failed", log_output)
        self.assertIn("reason=no_table_rows", log_output)
        self.assertNotIn("SECRET_DOCUMENT_TEXT", log_output)
        self.assertNotIn("SECRET_DOCUMENT_FILENAME.pdf", log_output)
        self.assertNotIn("SECRET_FILE_BYTES", log_output)
        self.assertEqual(
            payload["error"],
            {
                "code": "unsupported_document",
                "message": "Upload the official informatics result PDF.",
            },
        )
        self.assertNotIn("reason", payload["error"])
        self.assertNotIn("context", payload["error"])


class AnalyzeTaskEventOrderTests(unittest.IsolatedAsyncioTestCase):
    async def test_failure_warning_precedes_final_publish_event(self):
        error = UnsupportedAnalyzeDocumentError(reason="no_table_rows")
        events = []

        class _WarningOrderHandler(logging.Handler):
            def emit(self, record):
                if record.levelno >= logging.WARNING:
                    events.append("warning")

        async def publish_event(task_id, payload):
            events.append("publish_analyze_task_event")

        logger = logging.getLogger("src.celery_app.analyze_task")
        handler = _WarningOrderHandler()
        logger.addHandler(handler)
        try:
            with (
                patch(
                    "src.celery_app.analyze_task.AsyncSessionMaker",
                    return_value=_AsyncSessionContext(),
                ),
                patch(
                    "src.celery_app.analyze_task.get_analyze_result",
                    new=AsyncMock(side_effect=error),
                ),
                patch(
                    "src.celery_app.analyze_task.publish_analyze_task_progress",
                    new=AsyncMock(),
                ),
                patch(
                    "src.celery_app.analyze_task.publish_analyze_task_event",
                    new=publish_event,
                ),
            ):
                await run_analyze_task(
                    task_id="task-order",
                    user_id=7,
                    file_content_b64=base64.b64encode(b"pdf").decode("ascii"),
                )
        finally:
            logger.removeHandler(handler)

        self.assertEqual(events, ["warning", "publish_analyze_task_event"])


class AnalyzeRepositoryLoggingTests(unittest.IsolatedAsyncioTestCase):
    async def test_chapter_not_found_logs_unmatched_chapter_and_keeps_safe_context(self):
        document_chapter = "  SECRET_CHAPTER_TITLE  "
        normalized_length = len("secret_chapter_title")
        session = AsyncMock()
        lookup_error = ValueError(
            "Unknown chapter title 'SECRET_CHAPTER_TITLE' "
            "(lookup_reason=no_fuzzy_candidate; fuzzy_threshold=0.92; candidates=0)"
        )

        with patch(
            "src.analyze.repository.get_chapter_model_by_title",
            new=AsyncMock(side_effect=lookup_error),
        ):
            with self.assertLogs("src.analyze.repository", level="WARNING") as captured:
                with self.assertRaises(UnsupportedAnalyzeDocumentError) as raised:
                    await create_analyze_result(
                        session,
                        user_id=7,
                        parsed_data=[{"topic": document_chapter}],
                    )

        error = raised.exception
        self.assertEqual(error.reason, "chapter_not_found")
        self.assertEqual(
            error.context,
            {"row_index": 0, "value_length": normalized_length},
        )
        self.assertEqual(error.safe_context, error.context)
        self.assertEqual(
            error.to_payload(),
            {
                "code": "unsupported_document",
                "message": "Upload the official informatics result PDF.",
            },
        )
        log_output = "\n".join(captured.output)
        self.assertIn("code=unsupported_document", log_output)
        self.assertIn("stage=validation_failed", log_output)
        self.assertIn("reason=chapter_not_found", log_output)
        self.assertIn("row_index=0", log_output)
        self.assertIn(f"value_length={normalized_length}", log_output)
        self.assertIn("chapter_value='SECRET_CHAPTER_TITLE'", log_output)
        self.assertIn(
            "lookup_strategy=normalized_exact_then_extensions_then_fuzzy_92",
            log_output,
        )
        self.assertIn("fallback_attempted=true", log_output)
        self.assertIn(
            "fallback_modes=extension,dot_segment,boundary_aware_substring,fuzzy_92",
            log_output,
        )
        self.assertIn("candidates=0", log_output)
        self.assertIn("lookup_reason=no_fuzzy_candidate", log_output)
        self.assertNotIn("Traceback", log_output)

    async def test_ambiguous_fuzzy_chapter_log_reports_fallback_and_candidates(self):
        session = AsyncMock()
        lookup_error = ValueError(
            "Ambiguous chapter title 'DATABASES' "
            "(lookup_reason=ambiguous_fuzzy_top_score; "
            "fuzzy_threshold=0.92; top_score=0.941234; candidates=2)"
        )

        with patch(
            "src.analyze.repository.get_chapter_model_by_title",
            new=AsyncMock(side_effect=lookup_error),
        ):
            with self.assertLogs("src.analyze.repository", level="WARNING") as captured:
                with self.assertRaises(UnsupportedAnalyzeDocumentError):
                    await create_analyze_result(
                        session,
                        user_id=7,
                        parsed_data=[{"topic": "DATABASES"}],
                    )

        log_output = "\n".join(captured.output)
        self.assertIn("fallback_attempted=true", log_output)
        self.assertIn("candidates=2", log_output)
        self.assertIn("lookup_reason=ambiguous_fuzzy_top_score", log_output)

    async def test_ambiguous_extension_chapter_log_reports_fallback_attempted(self):
        session = AsyncMock()
        lookup_error = ValueError(
            "Ambiguous chapter title 'COMPUTER NETWORKS' "
            "(lookup_reason=ambiguous_fallback_match)"
        )

        with patch(
            "src.analyze.repository.get_chapter_model_by_title",
            new=AsyncMock(side_effect=lookup_error),
        ):
            with self.assertLogs("src.analyze.repository", level="WARNING") as captured:
                with self.assertRaises(UnsupportedAnalyzeDocumentError):
                    await create_analyze_result(
                        session,
                        user_id=7,
                        parsed_data=[{"topic": "COMPUTER NETWORKS"}],
                    )

        log_output = "\n".join(captured.output)
        self.assertIn("fallback_attempted=true", log_output)
        self.assertIn("lookup_reason=ambiguous_fallback_match", log_output)

    async def test_ambiguous_exact_chapter_log_does_not_claim_fallback(self):
        session = AsyncMock()
        lookup_error = ValueError(
            "Ambiguous chapter title 'COMPUTER NETWORKS' "
            "(lookup_reason=ambiguous_exact_match)"
        )

        with patch(
            "src.analyze.repository.get_chapter_model_by_title",
            new=AsyncMock(side_effect=lookup_error),
        ):
            with self.assertLogs("src.analyze.repository", level="WARNING") as captured:
                with self.assertRaises(UnsupportedAnalyzeDocumentError):
                    await create_analyze_result(
                        session,
                        user_id=7,
                        parsed_data=[{"topic": "COMPUTER NETWORKS"}],
                    )

        log_output = "\n".join(captured.output)
        self.assertIn("fallback_attempted=unknown", log_output)
        self.assertIn("lookup_reason=ambiguous_exact_match", log_output)

    async def test_chapter_not_found_log_is_bounded_and_single_line(self):
        document_chapter = "CHAPTER-" + ("x" * 600) + "\nINJECTED"
        session = AsyncMock()

        with patch(
            "src.analyze.repository.get_chapter_model_by_title",
            new=AsyncMock(side_effect=ValueError("unknown chapter")),
        ):
            with self.assertLogs("src.analyze.repository", level="WARNING") as captured:
                with self.assertRaises(UnsupportedAnalyzeDocumentError):
                    await create_analyze_result(
                        session,
                        user_id=7,
                        parsed_data=[{"topic": document_chapter}],
                    )

        log_output = "\n".join(captured.output)
        self.assertEqual(len(captured.output), 1)
        self.assertEqual(log_output, captured.output[0])
        log_record = captured.output[0]
        if log_record.endswith("\r\n"):
            log_record = log_record[:-2]
        elif log_record.endswith(("\n", "\r")):
            log_record = log_record[:-1]
        self.assertNotIn("\n", log_record)
        self.assertNotIn("\r", log_record)
        match = re.search(r"\bchapter_value=(?P<value>'(?:\\.|[^'])*')", log_output)
        self.assertIsNotNone(match)
        chapter_value = ast.literal_eval(match.group("value"))
        expected_chapter_value = ("CHAPTER-" + ("x" * 600))[:500]
        self.assertLessEqual(len(chapter_value), 500)
        self.assertEqual(chapter_value, " ".join(chapter_value.split()))
        self.assertEqual(chapter_value, expected_chapter_value)
        self.assertNotIn("INJECTED", chapter_value)
        self.assertNotIn("Traceback", log_output)


class AnalyzeRouterLoggingTests(unittest.IsolatedAsyncioTestCase):
    USER = SimpleNamespace(id=7)
    SESSION = AsyncMock()

    async def test_task_owner_denial_log_has_only_stable_structured_fields(self):
        task_id = "SECRET_TASK_ID"
        user_id = 7
        redis = SimpleNamespace(
            get=AsyncMock(return_value="8"),
            aclose=AsyncMock(),
        )

        with patch("src.analyze.utils.get_async_redis_client", return_value=redis):
            with self.assertLogs("src.analyze.utils", level="WARNING") as captured:
                with self.assertRaises(HTTPException) as raised:
                    await assert_task_owner(task_id=task_id, user_id=user_id)

        self.assertEqual(raised.exception.status_code, 404)
        log_output = "\n".join(captured.output)
        self.assertIn("code=analyze_task_forbidden", log_output)
        self.assertIn("stage=authorization_failed", log_output)
        self.assertIn("reason=task_owner_mismatch", log_output)
        self.assertNotIn(task_id, log_output)
        self.assertNotIn(str(user_id), log_output)
        self.assertNotIn("8", log_output)

    async def test_oversized_file_warning_contains_size_without_file_bytes(self):
        filename = "SECRET_OVERSIZED_FILENAME.pdf"
        file_bytes = b"SECRET_OVERSIZED_FILE_BYTES"
        upload = UploadFile(file=io.BytesIO(file_bytes), filename=filename)

        with patch("src.analyze.router.settings.MAX_UPLOAD_SIZE_BYTES", 3):
            with self.assertLogs("src.analyze.router", level="WARNING") as captured:
                with self.assertRaises(HTTPException) as raised:
                    await create_analyze_task(upload, self.USER, self.SESSION)

        self.assertEqual(raised.exception.status_code, 400)
        log_output = "\n".join(captured.output)
        self.assertIn("code=file_too_large", log_output)
        self.assertIn("reason=upload_size_exceeded", log_output)
        self.assertIn(f"size_bytes={len(file_bytes)}", log_output)
        self.assertNotIn(filename, log_output)
        self.assertNotIn("SECRET_OVERSIZED_FILE_BYTES", log_output)

    async def test_invalid_pdf_warning_uses_filename_presence_without_raw_data(self):
        filename = "SECRET_INVALID_FILENAME.pdf"
        file_bytes = b"SECRET_INVALID_FILE_BYTES"
        upload = UploadFile(
            file=io.BytesIO(file_bytes),
            filename=filename,
            headers={"content-type": "text/plain"},
        )

        with self.assertLogs("src.analyze.router", level="WARNING") as captured:
            with self.assertRaises(HTTPException) as raised:
                await create_analyze_task(upload, self.USER, self.SESSION)

        self.assertEqual(raised.exception.status_code, 400)
        log_output = "\n".join(captured.output)
        self.assertIn("code=invalid_document_type", log_output)
        self.assertIn("stage=validation_failed", log_output)
        self.assertIn("reason=invalid_content_type", log_output)
        self.assertIn("content_type=text/plain", log_output)
        self.assertIn("filename_present=True", log_output)
        self.assertIn(f"size_bytes={len(file_bytes)}", log_output)
        self.assertNotIn(filename, log_output)
        self.assertNotIn("SECRET_INVALID_FILE_BYTES", log_output)

    async def test_invalid_pdf_warning_uses_invalid_pdf_reason(self):
        filename = "SECRET_MALFORMED_FILENAME.pdf"
        file_bytes = b"SECRET_MALFORMED_PDF_BYTES"
        upload = UploadFile(
            file=io.BytesIO(file_bytes),
            filename=filename,
            headers={"content-type": "application/pdf"},
        )

        with self.assertLogs("src.analyze.router", level="WARNING") as captured:
            with self.assertRaises(HTTPException):
                await create_analyze_task(upload, self.USER, self.SESSION)

        log_output = "\n".join(captured.output)
        self.assertIn("reason=invalid_pdf", log_output)
        self.assertNotIn(filename, log_output)
        self.assertNotIn("SECRET_MALFORMED_PDF_BYTES", log_output)

    def test_analyze_error_safe_context_excludes_document_derived_fields(self):
        error = UnsupportedAnalyzeDocumentError(
            context={
                "chapter_title": "SECRET_CHAPTER_TITLE",
                "value": "SECRET_VALUE",
                "document_text": "SECRET_DOCUMENT_TEXT",
                "filename": "SECRET_FILENAME.pdf",
                "file_bytes": b"SECRET_FILE_BYTES",
                "row_index": 2,
                "score": "SECRET_SCORE",
                "value_length": 13,
            }
        )

        self.assertEqual(
            error.safe_context,
            {"row_index": 2, "value_length": 13},
        )
        self.assertNotIn("SECRET_SCORE", error.safe_context)


class ParserDiagnosticReasonTests(unittest.TestCase):
    HEADER = "| Тема | сұрақ | ұпай | балл | пайыз |"

    def _table(self, row: str = "") -> str:
        lines = ["| Информатика", self.HEADER]
        if row:
            lines.append(row)
        return "\n".join(lines)

    def _assert_reason(self, text: str, reason: str) -> None:
        with self.assertRaises(UnsupportedAnalyzeDocumentError) as raised:
            parse_table(text)
        self.assertEqual(raised.exception.reason, reason)

    def test_parser_reports_specific_unsupported_document_reasons(self):
        cases = (
            ("plain extracted text", "no_table_rows"),
            ("| another section", "expected_table_header_not_found"),
            (
                self._table("| [X] | 10 | 10 | 5 | 50 |"),
                "missing_topic",
            ),
            (
                self._table("| Topic | 10 | - | 5 | 50 |"),
                "incomplete_row",
            ),
            (
                self._table("| Topic | 10 | 10 | 11 | 100 |"),
                "score_exceeds_max_score",
            ),
            (
                self._table("| Topic | 10 | 10 | 5 | 101 |"),
                "percentage_out_of_range",
            ),
            (self._table(), "no_parsed_rows"),
        )

        for text, reason in cases:
            with self.subTest(reason=reason):
                self._assert_reason(text, reason)

    def test_parser_diagnostic_context_contains_only_safe_row_values(self):
        with self.assertRaises(UnsupportedAnalyzeDocumentError) as raised:
            parse_table(self._table("| Topic | 10 | 10 | 11 | 100 |"))

        self.assertEqual(
            raised.exception.safe_context,
            {"row_index": 0, "score": 11, "max_score": 10},
        )


if __name__ == "__main__":
    unittest.main()
