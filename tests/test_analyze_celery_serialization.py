import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from src.analyze.exceptions import InvalidAnalyzeDocumentError
from src.analyze.router import create_analyze_task
from src.analyze.serialization import decode_file_content, encode_file_content
from src.celery_app.analyze_task import run_analyze_task


class FakeUploadFile:
    content_type = "application/pdf"

    def __init__(self, content: bytes) -> None:
        self.content = content

    async def read(self) -> bytes:
        return self.content


class FakeSession:
    async def commit(self) -> None:
        pass

    async def rollback(self) -> None:
        pass


class AnalyzeCelerySerializationTests(unittest.IsolatedAsyncioTestCase):
    def test_file_content_round_trips_through_json_safe_base64(self):
        content = b"%PDF-1.4\nbinary payload"

        encoded = encode_file_content(content)

        self.assertIsInstance(encoded, str)
        self.assertEqual(decode_file_content(encoded), content)

    def test_decode_file_content_rejects_invalid_base64(self):
        with self.assertRaises(InvalidAnalyzeDocumentError):
            decode_file_content("not base64")

    async def test_router_enqueues_base64_payload(self):
        content = b"%PDF-1.4\nbinary payload"
        apply_async = MagicMock()

        with (
            patch("src.analyze.router.validate_pdf_upload"),
            patch("src.analyze.router.reserve_analyze_task_owner", new=AsyncMock()),
            patch("src.analyze.router.uuid4", return_value="task-1"),
            patch.object(
                create_analyze_task.__globals__["process_document"],
                "apply_async",
                apply_async,
            ),
        ):
            await create_analyze_task(
                file=FakeUploadFile(content),
                current_user=SimpleNamespace(id=1),
                session=FakeSession(),
            )

        queued_kwargs = apply_async.call_args.kwargs["kwargs"]
        self.assertNotIn("file_content", queued_kwargs)
        self.assertEqual(decode_file_content(queued_kwargs["file_content_b64"]), content)

    async def test_run_analyze_task_decodes_base64_payload(self):
        content = b"%PDF-1.4\nbinary payload"
        get_analyze_result = AsyncMock(return_value=[])

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
                get_analyze_result,
            ),
        ):
            payload = await run_analyze_task(
                task_id="task-1",
                user_id=1,
                file_content_b64=encode_file_content(content),
            )

        self.assertEqual(payload["status"], "success")
        self.assertEqual(
            get_analyze_result.call_args.kwargs["file_content"],
            content,
        )


if __name__ == "__main__":
    unittest.main()
