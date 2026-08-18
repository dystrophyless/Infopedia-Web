from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, computed_field

from src.security.public_refs import encode_public_ref


class BookBase(BaseModel):
    publisher: str = Field(min_length=1, max_length=255)
    grade: int = Field(ge=7, le=11)


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    publisher: str | None = Field(default=None, min_length=1, max_length=255)
    grade: int | None = Field(default=None, ge=7, le=11)


class BookResponse(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1, exclude=True)

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("book", self.id)


class ChapterBase(BaseModel):
    code: str = Field(min_length=1, max_length=128)


class ChapterCreate(ChapterBase):
    pass


class ChapterUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=128)
    topic_codes: list["TopicCodeReferenceResponse"] | None = Field(default=None)


class ChapterResponse(ChapterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1, exclude=True)
    title: str = Field(min_length=1)

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("chapter", self.id)


class ChapterReferenceResponse(ChapterBase):
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
    chapter: ChapterReferenceResponse | None = Field(default=None)


class TopicCodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=512)
    chapter: ChapterReferenceResponse | None = Field(default=None)


class TopicCodeResponse(TopicCodeBase):
    model_config = ConfigDict(from_attributes=True)

    title: str = Field(min_length=1)

    id: int = Field(ge=1, exclude=True)

    @computed_field
    @property
    def public_id(self) -> str:
        return encode_public_ref("topic_code", self.id)


class TopicCodeReferenceResponse(TopicCodeBase):
    """Input/reference shape for topic associations; titles are response-only."""

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
    topic_codes: list[TopicCodeReferenceResponse] = Field(min_length=1)


class TopicUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    page_start: int | None = Field(default=None, ge=1)
    page_end: int | None = Field(default=None, ge=1)
    book_id: int | None = Field(default=None, ge=1)
    topic_codes: list[TopicCodeReferenceResponse] | None = Field(default=None, min_length=1)


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
