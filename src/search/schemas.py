from typing import Literal

from pydantic import BaseModel, Field, field_validator

from src.terms.schemas import TermDetailedResponse


class SearchTaskCreateRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2048)

    @field_validator("query", mode="before")
    @classmethod
    def strip_query(cls, value: str) -> str:
        if isinstance(value, str):
            return value.strip()
        return value


class SearchTaskError(BaseModel):
    code: str
    message: str


class SearchTaskResult(BaseModel):
    term: str
    book_publisher: str
    book_grade: int = Field(ge=7, le=11)
    text: str
    topic: str
    page: int = Field(ge=1)
    definition_public_id: str


class SearchTaskResponse(BaseModel):
    task_id: str
    status: Literal["pending", "started", "success", "failure"]
    result: SearchTaskResult | None = None
    error: SearchTaskError | None = None


class SearchTermsResponse(BaseModel):
    terms: list[TermDetailedResponse]
    total: int = Field(ge=0)
    skip: int = Field(ge=0)
    limit: int = Field(ge=1)
    has_more: bool
