from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class BookBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class BookResponse(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)


class ChapterBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    topic_codes: list[TopicCodeDetailedResponse] | None = Field(default=None)


class ChapterResponse(ChapterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)


class ChapterDetailedResponse(ChapterResponse):
    topic_codes: list[TopicCodeDetailedResponse] = Field(min_length=1)


class TopicCodeBase(BaseModel):
    name: str = Field(min_length=1, max_length=512)


class TopicCodeCreate(TopicCodeBase):
    chapter: ChapterResponse | None = Field(default=None)


class TopicCodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=512)
    chapter: ChapterResponse | None = Field(default=None)


class TopicCodeResponse(TopicCodeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)


class TopicCodeDetailedResponse(TopicCodeResponse):
    chapter: ChapterResponse | None = Field(default=None)


class TopicBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    page_start: int = Field(ge=1)
    page_end: int = Field(ge=1)


class TopicCreate(TopicBase):
    book_id: int = Field(ge=1)
    topic_codes: list[TopicCodeResponse] = Field(min_length=1)


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    page_start: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    book_id: int | None = Field(default=None, ge=1)
    topic_codes: list[TopicCodeResponse] | None = Field(default=None, min_length=1)


class TopicResponse(TopicBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)
    book: BookResponse


class TopicDetailedResponse(TopicResponse):
    topic_codes: list[TopicCodeDetailedResponse] = Field(min_length=1)
