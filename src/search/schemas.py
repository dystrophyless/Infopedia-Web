from typing import Literal

from pydantic import BaseModel, Field, field_validator


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
    book: str
    text: str
    topic: str
    page: int = Field(ge=1)
    definition_id: int = Field(ge=1)


class SearchTaskResponse(BaseModel):
    task_id: str
    status: Literal["pending", "started", "success", "failure"]
    result: SearchTaskResult | None = None
    error: SearchTaskError | None = None
