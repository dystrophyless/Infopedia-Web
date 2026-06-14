import asyncio
import io
from collections.abc import Awaitable, Callable

import pdfplumber
from sqlalchemy.ext.asyncio import AsyncSession
from unstract.llmwhisperer.client_v2 import LLMWhispererClientException

from src.analyze.client import get_llmwhisperer_client
from src.analyze.parser import parse_table
from src.analyze.repository import create_analyze_result
from src.analyze.schemas import AnalyzeChapterResult
from src.topics.repository import get_books_coverage_by_chapter

ProgressEmitter = Callable[[str], Awaitable[None]]
LLMWHISPERER_WAIT_TIMEOUT_SECONDS = 30
LLMWHISPERER_POLL_INTERVAL_SECONDS = 5


class AnalyzeService:
    def __init__(self, llmwhisperer_client):
        self.llmwhisperer_client = llmwhisperer_client

    async def define_pages(self, file_content: bytes) -> str:
        file_like_object = io.BytesIO(file_content)
        with pdfplumber.open(file_like_object) as pdf:
            num_pages = len(pdf.pages)

            start_page = max(1, num_pages - 1)

            return f"{start_page}-"

    async def wait_for_extraction(
        self,
        whisper_hash: str,
        *,
        emit_progress: ProgressEmitter | None = None,
    ) -> dict:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + LLMWHISPERER_WAIT_TIMEOUT_SECONDS
        last_status = None

        while loop.time() < deadline:
            status_result = await asyncio.to_thread(
                self.llmwhisperer_client.whisper_status,
                whisper_hash=whisper_hash,
            )
            if status_result.get("status_code") != 200:
                raise ValueError("Не смогли обработать документ")

            status_value = str(status_result.get("status") or "")
            if emit_progress is not None and status_value != last_status:
                await emit_progress(f"llmwhisperer_{status_value or 'unknown'}")
                last_status = status_value

            if status_value in {"accepted", "processing"}:
                remaining_seconds = deadline - loop.time()
                if remaining_seconds <= 0:
                    break

                await asyncio.sleep(
                    min(LLMWHISPERER_POLL_INTERVAL_SECONDS, remaining_seconds)
                )
                continue

            if status_value == "processed":
                retrieve_result = await asyncio.to_thread(
                    self.llmwhisperer_client.whisper_retrieve,
                    whisper_hash=whisper_hash,
                )
                if retrieve_result.get("status_code") != 200:
                    raise ValueError("Не смогли обработать документ")

                return {
                    "status_code": 200,
                    "message": "Whisper operation completed",
                    "status": "processed",
                    "extraction": retrieve_result.get("extraction", {}),
                }

            if status_value == "error" or "error" in status_value:
                raise ValueError("Не смогли обработать документ")

            raise ValueError("Не смогли обработать документ")

        raise ValueError("Не смогли обработать документ")

    async def extract_text(
        self,
        file_content: bytes,
        *,
        emit_progress: ProgressEmitter | None = None,
    ) -> str:
        file_like_object = io.BytesIO(file_content)

        pages_to_extract = await self.define_pages(file_content)

        try:
            result = await asyncio.to_thread(
                self.llmwhisperer_client.whisper,
                stream=file_like_object,
                mode="table",
                output_mode="layout_preserving",
                lang="kk-cyrl",
                pages_to_extract=pages_to_extract,
                wait_for_completion=False,
                wait_timeout=LLMWHISPERER_WAIT_TIMEOUT_SECONDS,
            )
            if result.get("status_code") == 202:
                whisper_hash = result.get("whisper_hash")
                if not whisper_hash:
                    raise ValueError("Не смогли обработать документ")

                result = await self.wait_for_extraction(
                    whisper_hash,
                    emit_progress=emit_progress,
                )
        except LLMWhispererClientException as e:
            raise ValueError("Не смогли обработать документ")

        except Exception as e:
            raise ValueError("Не смогли обработать документ")

        extraction: dict = result.get("extraction", "")

        if not extraction:
            raise ValueError("Не смогли обработать документ")

        text: str = extraction.get("result_text", "")

        return text

    async def get_parsed_data(self, text: str) -> list[dict]:
        parsed_table: list[dict] = parse_table(text)

        return parsed_table

    async def save_parsed_data(
        self,
        session: AsyncSession,
        *,
        user_id: int,
        parsed_data: list[dict],
    ):
        result = await create_analyze_result(
            session,
            user_id=user_id,
            parsed_data=parsed_data,
        )

        await session.commit()
        await session.refresh(result, attribute_names=["items"])

        return result

    async def analyze_document(
        self,
        session: AsyncSession,
        *,
        user_id: int,
        file_content: bytes,
        emit_progress: ProgressEmitter | None = None,
    ):
        if emit_progress is not None:
            await emit_progress("extracting")
        text = await self.extract_text(file_content, emit_progress=emit_progress)

        if emit_progress is not None:
            await emit_progress("parsing")
        parsed_data = await self.get_parsed_data(text)

        if emit_progress is not None:
            await emit_progress("saving")
        result = await self.save_parsed_data(
            session,
            user_id=user_id,
            parsed_data=parsed_data,
        )

        if emit_progress is not None:
            await emit_progress("matching_books")

        results = []

        for item in result.items:
            books = await get_books_coverage_by_chapter(
                session,
                chapter_id=item.chapter_id,
            )

            chapter_result = AnalyzeChapterResult(
                chapter=item.analyze_chapter.value,
                question_count=item.question_count,
                max_score=item.max_score,
                score=item.score,
                percentage=item.percentage,
                books=books or [],
            )

            results.append(chapter_result.model_dump())

        return results


async def get_analyze_result(
    session: AsyncSession,
    *,
    user_id: int,
    file_content: bytes,
    emit_progress: ProgressEmitter | None = None,
) -> dict | None:
    llmwhisperer_client = get_llmwhisperer_client()

    analyze_service = AnalyzeService(llmwhisperer_client)

    return await analyze_service.analyze_document(
        session,
        user_id=user_id,
        file_content=file_content,
        emit_progress=emit_progress,
    )
