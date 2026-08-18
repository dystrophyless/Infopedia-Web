from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

TestMode = Literal["random", "weak", "mock", "chapter"]


class TestAttemptCreateRequest(BaseModel):
    mode: TestMode
    chapter_ref: str | None = Field(default=None, min_length=1, max_length=255)


class TestAnswerRequest(BaseModel):
    option_ref: str = Field(min_length=1, max_length=255)


class TestQuestionOptionResponse(BaseModel):
    option_ref: str
    label: str
    text: str


class TestChapterSummary(BaseModel):
    id: str
    title: str
    question_count: int
    estimated_minutes: int
    chapter_ref: str | None = None
    code: str | None = None


class TestQuestionResponse(BaseModel):
    question_ref: str
    prompt: str
    options: list[TestQuestionOptionResponse]
    chapter: TestChapterSummary
    explanation: str | None = None


class TestAnswerResponse(BaseModel):
    question_ref: str
    option_ref: str
    correct: bool
    correct_option_ref: str | None = None
    explanation: str | None = None
    awarded_weight: int = 0


class TestCompletionResponse(BaseModel):
    correct_answer_count: int
    total_questions: int
    answered_questions: int
    score_percent: float
    duration_seconds: int
    average_pace_seconds: int
    weak_topic: dict[str, object] | None = None
    previous_score_percent: float | None = None
    accuracy_delta_points: float | None = None


class TestAttemptResponse(BaseModel):
    id: str
    attempt_ref: str
    mode: TestMode
    title: str
    status: Literal["active", "completed"]
    questions: list[TestQuestionResponse]
    answers: dict[str, TestAnswerResponse] = Field(default_factory=dict)
    summary: TestCompletionResponse | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    current_question_index: int = 0


class TestModeDisabledReason(BaseModel):
    code: str
    reason: str
    required_questions: int
    available_questions: int
    required_chapters: int | None = None
    message: str | None = None


class TestModeAvailability(BaseModel):
    mode: TestMode
    available: bool
    disabled_reason: TestModeDisabledReason | None = None


class TestDashboardChapter(BaseModel):
    chapter_ref: str
    code: str
    title: str
    importance_rank: int
    question_count: int
    completed_attempt_count: int
    accuracy: float | None
    delta_points: float | None


class TestDashboardRecent(BaseModel):
    id: str
    mode: TestMode
    title: str
    completed_at: datetime
    accuracy: float


class TestsDashboardResponse(BaseModel):
    completed_attempt_count: int
    overall_accuracy: float | None
    overall_delta_points: float | None
    delta_window_days: int = 7
    recent_tests: list[TestDashboardRecent]
    chapters: list[TestDashboardChapter]
    mode_availability: list[TestModeAvailability]
