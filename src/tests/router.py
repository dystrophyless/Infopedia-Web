from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.database import get_async_session
from src.security.public_refs import encode_public_ref
from src.tests.errors import (
    AnswerAlreadySubmittedError,
    AttemptCompletedError,
    AttemptIncompleteError,
    AttemptNotFoundError,
    TestCatalogNotReadyError,
    TestCatalogStaleError,
    TestModeUnavailableError,
)
from src.tests.schemas import (
    TestAnswerRequest,
    TestAnswerResponse,
    TestAttemptCreateRequest,
    TestAttemptResponse,
    TestChapterSummary,
    TestCompletionResponse,
    TestQuestionOptionResponse,
    TestQuestionResponse,
    TestsDashboardResponse,
)
from src.tests.service import TestsService
from src.users.models import User  # noqa: TC001

router = APIRouter()


def _summary_response(summary: dict | None) -> TestCompletionResponse | None:
    if not summary:
        return None
    return TestCompletionResponse.model_validate(summary)


def _question_response(question) -> TestQuestionResponse:
    chapter_id = question.chapter_id
    if chapter_id is None:
        raise ValueError("Attempt question is missing its chapter attribution snapshot")
    chapter_ref = encode_public_ref("chapter", chapter_id)
    return TestQuestionResponse(
        question_ref=question.question_ref,
        prompt=question.prompt,
        options=[TestQuestionOptionResponse.model_validate(option) for option in question.options_json],
        chapter=TestChapterSummary(
            id=chapter_ref,
            title=question.topic_title,
            question_count=question.question_count,
            estimated_minutes=question.estimated_minutes,
            chapter_ref=chapter_ref,
        ),
        explanation=None,
    )


def _attempt_response(attempt) -> TestAttemptResponse:
    attempt_ref = encode_public_ref("attempt", attempt.id)
    answers = {
        question.question_ref: TestAnswerResponse(
            question_ref=question.question_ref,
            option_ref=question.answer.selected_option_ref,
            correct=bool(question.answer.awarded_weight),
            correct_option_ref=question.correct_option_ref,
            explanation=question.explanation,
            awarded_weight=question.answer.awarded_weight,
        )
        for question in attempt.questions
        if question.answer is not None
    }
    current_index = next(
        (index for index, question in enumerate(attempt.questions) if question.answer is None),
        max(0, len(attempt.questions) - 1),
    )
    return TestAttemptResponse(
        id=attempt_ref,
        attempt_ref=attempt_ref,
        mode=attempt.mode,
        title=attempt.title,
        status="completed" if attempt.status == "completed" or attempt.completed_at else "active",
        questions=[_question_response(question) for question in attempt.questions],
        answers=answers,
        summary=_summary_response(attempt.summary_json),
        started_at=attempt.started_at,
        completed_at=attempt.completed_at,
        current_question_index=current_index,
    )


def _raise_http(exc: Exception) -> None:
    if isinstance(exc, TestCatalogNotReadyError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": "Tests catalog is not ready."},
        ) from exc
    if isinstance(exc, TestCatalogStaleError):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": exc.code, "message": str(exc) or "Tests catalog is stale."},
        ) from exc
    if isinstance(exc, TestModeUnavailableError):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc
    if isinstance(exc, (AttemptNotFoundError, ValueError)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test attempt not found") from exc
    if isinstance(exc, AttemptCompletedError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ATTEMPT_COMPLETED", "message": "The attempt has already been completed."},
        ) from exc
    if isinstance(exc, AttemptIncompleteError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ATTEMPT_INCOMPLETE", "message": "Answer every question before completing the attempt."},
        ) from exc
    if isinstance(exc, AnswerAlreadySubmittedError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ANSWER_ALREADY_SUBMITTED", "message": "Answer has already been submitted for this question."},
        ) from exc
    raise exc


@router.get("/dashboard", response_model=TestsDashboardResponse)
async def get_tests_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    locale: Annotated[Literal["kk", "ru"], Query()] = "ru",
):
    try:
        dashboard = await TestsService(session).dashboard(user_id=current_user.id, locale=locale)
    except (TestCatalogNotReadyError, TestCatalogStaleError) as exc:
        _raise_http(exc)
    return TestsDashboardResponse.model_validate(dashboard)


@router.post("/attempts", response_model=TestAttemptResponse, status_code=status.HTTP_201_CREATED)
async def create_test_attempt(
    payload: TestAttemptCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    locale: Annotated[Literal["kk", "ru"], Query()] = "ru",
):
    try:
        attempt = await TestsService(session).create_attempt(
            user_id=current_user.id,
            mode=payload.mode,
            chapter_ref=payload.chapter_ref,
            locale=locale,
        )
    except (
        AnswerAlreadySubmittedError,
        AttemptCompletedError,
        AttemptIncompleteError,
        AttemptNotFoundError,
        TestModeUnavailableError,
        ValueError,
    ) as exc:
        _raise_http(exc)
    return _attempt_response(attempt)


@router.get("/attempts/{attempt_ref}", response_model=TestAttemptResponse)
async def get_test_attempt(
    attempt_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    try:
        attempt = await TestsService(session).get_attempt_response(
            user_id=current_user.id,
            attempt_ref=attempt_ref,
        )
    except (
        AnswerAlreadySubmittedError,
        AttemptCompletedError,
        AttemptIncompleteError,
        AttemptNotFoundError,
        TestModeUnavailableError,
        ValueError,
    ) as exc:
        _raise_http(exc)
    return _attempt_response(attempt)


@router.post("/attempts/{attempt_ref}/questions/{question_ref}/answer", response_model=TestAnswerResponse)
async def answer_test_question(
    attempt_ref: str,
    question_ref: str,
    payload: TestAnswerRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    try:
        feedback = await TestsService(session).submit_answer(
            user_id=current_user.id,
            attempt_ref=attempt_ref,
            question_ref=question_ref,
            option_ref=payload.option_ref,
        )
    except (
        AnswerAlreadySubmittedError,
        AttemptCompletedError,
        AttemptIncompleteError,
        AttemptNotFoundError,
        TestModeUnavailableError,
        ValueError,
    ) as exc:
        _raise_http(exc)
    return TestAnswerResponse.model_validate(feedback)


@router.post("/attempts/{attempt_ref}/complete", response_model=TestCompletionResponse)
async def complete_test_attempt(
    attempt_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    try:
        summary = await TestsService(session).complete_attempt(
            user_id=current_user.id,
            attempt_ref=attempt_ref,
        )
    except (
        AnswerAlreadySubmittedError,
        AttemptCompletedError,
        AttemptIncompleteError,
        AttemptNotFoundError,
        TestModeUnavailableError,
        ValueError,
    ) as exc:
        _raise_http(exc)
    return TestCompletionResponse.model_validate(summary)
