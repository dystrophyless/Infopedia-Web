from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, computed_field

from src.security.public_refs import encode_public_ref


class BookBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class BookResponse(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1, exclude=True)

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("book", self.id)


class ChapterBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    topic_codes: list[TopicCodeDetailedResponse] | None = Field(default=None)


class ChapterResponse(ChapterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1, exclude=True)

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("chapter", self.id)


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

    id: int = Field(ge=1, exclude=True)

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("topic_code", self.id)


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

    id: int = Field(ge=1, exclude=True)
    book: BookResponse

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("topic", self.id)


class TopicDetailedResponse(TopicResponse):
    topic_codes: list[TopicCodeDetailedResponse] = Field(min_length=1)
