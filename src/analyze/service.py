import asyncio
import io
import logging
from collections.abc import Awaitable, Callable

import pdfplumber
from sqlalchemy.ext.asyncio import AsyncSession
from unstract.llmwhisperer.client_v2 import LLMWhispererClientException

from src.analyze.client import get_llmwhisperer_client
from src.analyze.exceptions import AnalyzeError, AnalyzeExtractionError
from src.analyze.parser import parse_table
from src.analyze.projection import select_free_chapter_id
from src.analyze.repository import (
    create_analyze_result,
    get_analyze_result_by_id,
    get_topic_material_summaries_by_chapter_ids,
    get_topic_codes_by_chapter_ids,
)
from src.analyze.schemas import AnalyzeChapterResult
from src.analyze.utils import sanitize_analyze_result
from src.topics.repository import get_books_coverage_by_chapter_ids

logger = logging.getLogger(__name__)

ProgressEmitter = Callable[[str], Awaitable[None]]
LLMWHISPERER_WAIT_TIMEOUT_SECONDS = 30
LLMWHISPERER_POLL_INTERVAL_SECONDS = 5
EXTRACTION_STAGE_BY_STATUS = {
    "accepted": "extraction_accepted",
    "processing": "extraction_processing",
    "processed": "extraction_completed",
}


def get_public_extraction_stage(status_value: str) -> str:
    return EXTRACTION_STAGE_BY_STATUS.get(status_value, "extracting")


class AnalyzeService:
    def __init__(self, llmwhisperer_client):
        self.llmwhisperer_client = llmwhisperer_client

    async def define_pages(self, file_content: bytes) -> str:
        file_like_object = io.BytesIO(file_content)
        try:
            with pdfplumber.open(file_like_object) as pdf:
                num_pages = len(pdf.pages)
        except Exception as exc:
            raise AnalyzeExtractionError(reason="extraction_failed") from exc

        if num_pages == 0:
            raise AnalyzeExtractionError(reason="empty_pdf")

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
                raise AnalyzeExtractionError(reason="extraction_status_failed")

            status_value = str(status_result.get("status") or "")
            if emit_progress is not None and status_value != last_status:
                await emit_progress(get_public_extraction_stage(status_value))
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
                    raise AnalyzeExtractionError(reason="extraction_retrieve_failed")

                return {
                    "status_code": 200,
                    "message": "Whisper operation completed",
                    "status": "processed",
                    "extraction": retrieve_result.get("extraction", {}),
                }

            if status_value == "error" or "error" in status_value:
                raise AnalyzeExtractionError(reason="extraction_failed")

            raise AnalyzeExtractionError(reason="unexpected_extraction_status")

        raise AnalyzeExtractionError(reason="extraction_timeout")

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
                    raise AnalyzeExtractionError(reason="missing_whisper_hash")

                result = await self.wait_for_extraction(
                    whisper_hash,
                    emit_progress=emit_progress,
                )
        except AnalyzeError:
            raise
        except LLMWhispererClientException as exc:
            raise AnalyzeExtractionError(reason="extraction_failed") from exc

        except Exception as exc:
            raise AnalyzeExtractionError(reason="extraction_failed") from exc

        extraction: dict = result.get("extraction", "")

        if not extraction:
            raise AnalyzeExtractionError(reason="empty_extraction")

        text: str = extraction.get("result_text", "")

        if not text:
            raise AnalyzeExtractionError(reason="empty_extracted_text")

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
        locale: str = "kk",
    ):
        result = await create_analyze_result(
            session,
            user_id=user_id,
            parsed_data=parsed_data,
        )
        result_id = result.id

        await session.commit()
        loaded_result = await get_analyze_result_by_id(
            session,
            result_id=result_id,
            locale=locale,
        )
        if loaded_result is None:
            logger.error(
                "Результат анализа не найден после commit "
                "code=analyze_result_missing stage=persistence_invariant_failed "
                "reason=result_missing_after_commit",
            )
            raise RuntimeError(f"Analyze result id={result_id} disappeared after commit")
        return loaded_result

    async def analyze_document(
        self,
        session: AsyncSession,
        *,
        user_id: int,
        file_content: bytes,
        emit_progress: ProgressEmitter | None = None,
        locale: str = "kk",
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
            locale=locale,
        )

        if emit_progress is not None:
            await emit_progress("matching_books")

        coverage_by_chapter = await get_books_coverage_by_chapter_ids(
            session,
            chapter_ids=[item.chapter_id for item in result.items],
        )
        topic_material_summaries_by_chapter = await get_topic_material_summaries_by_chapter_ids(
            session,
            chapter_ids=[item.chapter_id for item in result.items],
        )
        free_id = select_free_chapter_id(result.items)
        topic_codes_by_chapter = await get_topic_codes_by_chapter_ids(
            session,
            chapter_ids=[free_id] if free_id is not None else [],
            locale=locale,
        )
        results = []

        for item in result.items:
            books = coverage_by_chapter.get(item.chapter_id, [])
            if item.chapter is None:
                logger.error(
                    "У результата анализа отсутствует раздел "
                    "code=analyze_result_invalid stage=domain_invariant_failed "
                    "reason=chapter_relation_missing",
                )
                raise RuntimeError(f"Analyze result item id={item.id} has no Chapter")

            material_summary = topic_material_summaries_by_chapter.get(
                item.chapter_id,
                {"topic_count": 0, "material_grades": []},
            )
            chapter_result = AnalyzeChapterResult(
                chapter_id=item.chapter_id,
                code=item.chapter.code,
                title=item.chapter.title,
                question_count=item.question_count,
                max_score=item.max_score,
                score=item.score,
                percentage=item.percentage,
                books=books,
                topic_count=material_summary["topic_count"],
                material_grades=material_summary["material_grades"],
                topic_codes=(
                    topic_codes_by_chapter.get(free_id, [])
                    if item.chapter_id == free_id
                    else []
                ),
            )

            results.append(chapter_result.model_dump())

        return sanitize_analyze_result(results)


async def get_analyze_result(
    session: AsyncSession,
    *,
    user_id: int,
    file_content: bytes,
    emit_progress: ProgressEmitter | None = None,
    locale: str = "kk",
) -> list[dict]:
    llmwhisperer_client = get_llmwhisperer_client()

    analyze_service = AnalyzeService(llmwhisperer_client)

    return await analyze_service.analyze_document(
        session,
        user_id=user_id,
        file_content=file_content,
        emit_progress=emit_progress,
        locale=locale,
    )
