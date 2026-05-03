from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from src.topics.schemas import TopicResponse


class TermBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class TermCreate(TermBase):
    definitions: list[DefinitionCreate] = Field(min_length=1)


class TermUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    definitions: list[DefinitionCreate] | None = Field(default=None, min_length=1)


class TermResponse(TermBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)


class TermDetailedResponse(TermResponse):
    definitions: list[DefinitionResponse] = Field(min_length=1)


class PaginatedTermsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    terms: list[TermResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class DefinitionBase(BaseModel):
    text: str = Field(min_length=1)
    topic: TopicResponse
    page: int = Field(ge=1, le=250)


class DefinitionCreate(BaseModel):
    text: str = Field(min_length=1)
    topic: str = Field(min_length=1, max_length=255)
    page: int = Field(ge=1, le=250)


class DefinitionUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1)
    topic: TopicResponse | None = Field(default=None)
    page: int | None = Field(default=None, ge=1, le=250)


class DefinitionResponse(DefinitionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)


class DefinitionSemanticResponse(DefinitionResponse):
    embedding: list[float] = Field(min_length=1)
