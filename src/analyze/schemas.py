from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeTaskError(BaseModel):
    code: str
    message: str


class AnalyzeBookCoverage(BaseModel):
    public_id: str = Field(min_length=1)
    publisher: str = Field(min_length=1, max_length=255)
    grade: int = Field(ge=7, le=11)
    topic_count: int = Field(ge=0)
    percentage: int = Field(ge=0, le=100)


class AnalyzeTopicCode(BaseModel):
    """Stable topic-code identifier paired with its localized display title."""

    name: str = Field(min_length=1, max_length=512)
    title: str = Field(min_length=1)


class AnalyzeChapterResult(BaseModel):
    chapter_id: int = Field(ge=1)
    code: str = Field(min_length=1)
    title: str = Field(min_length=1)
    question_count: int = Field(ge=0)
    max_score: int = Field(ge=0)
    score: int = Field(ge=0)
    percentage: int = Field(ge=0, le=100)
    books: list[AnalyzeBookCoverage] = Field(default_factory=list)
    topic_count: int = Field(default=0, ge=0)
    material_grades: list[int] = Field(default_factory=list)
    topic_codes: list[AnalyzeTopicCode] = Field(default_factory=list)


class AnalyzeTaskResponse(BaseModel):
    task_id: str
    status: Literal["pending", "started", "success", "failure"]
    stage: str | None = None
    result: list[AnalyzeChapterResult] | None = None
    error: AnalyzeTaskError | None = None
