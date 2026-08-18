from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.terms.models import Definition


class Book(Base):
    __tablename__ = "book"
    __table_args__ = (
        UniqueConstraint("publisher", "grade", name="uq_book_publisher_grade"),
        Index("ix_book_grade", "grade"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    publisher: Mapped[str] = mapped_column(String(255), nullable=False)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)

    topics: Mapped[list["Topic"]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
    )
    chapter_coverages: Mapped[list["BookChapterCoverage"]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
    )


class Chapter(Base):
    __tablename__ = "chapter"
    __table_args__ = (UniqueConstraint("code", name="uq_chapter_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(128), nullable=False, index=True)

    topic_codes: Mapped[list["TopicCode"]] = relationship(
        back_populates="chapter",
    )
    book_coverages: Mapped[list["BookChapterCoverage"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
    )

    translations: Mapped[list["ChapterTranslation"]] = relationship(
        back_populates="chapter", cascade="all, delete-orphan"
    )

    @property
    def title(self) -> str:
        return getattr(self, "_localized_title", self.code)

    @title.setter
    def title(self, value: str) -> None:
        self._localized_title = value


class ChapterTranslation(Base):
    __tablename__ = "chapter_translation"
    __table_args__ = (
        UniqueConstraint(
            "chapter_id", "locale", name="uq_chapter_translation_chapter_locale"
        ),
        CheckConstraint("locale IN ('kk', 'ru')", name="ck_chapter_translation_locale"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chapter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("chapter.id"), nullable=False
    )
    locale: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    chapter: Mapped["Chapter"] = relationship(back_populates="translations")


class TopicCode(Base):
    __tablename__ = "topic_code"
    __table_args__ = (Index("ix_topic_code_chapter_id", "chapter_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    chapter_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("chapter.id"),
        nullable=True,
    )

    chapter: Mapped["Chapter | None"] = relationship(
        back_populates="topic_codes",
    )
    topics: Mapped[list["Topic"]] = relationship(
        back_populates="topic_codes",
        secondary="topic_mapping",
    )
    translations: Mapped[list["TopicCodeTranslation"]] = relationship(
        back_populates="topic_code",
        cascade="all, delete-orphan",
    )

    @property
    def title(self) -> str:
        return getattr(self, "_localized_title", self.name)

    def set_localized_title(self, title: str) -> None:
        self._localized_title = title


class TopicCodeTranslation(Base):
    __tablename__ = "topic_code_translation"
    __table_args__ = (
        UniqueConstraint(
            "topic_code_id",
            "locale",
            name="uq_topic_code_translation_code_locale",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    topic_code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("topic_code.id"),
        nullable=False,
    )
    locale: Mapped[str] = mapped_column(String(8), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)

    topic_code: Mapped["TopicCode"] = relationship(back_populates="translations")


class TopicMapping(Base):
    __tablename__ = "topic_mapping"
    __table_args__ = (Index("ix_topic_mapping_topic_id", "topic_id"),)

    topic_code_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("topic_code.id"),
        primary_key=True,
    )
    topic_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("topic.id"),
        primary_key=True,
    )


class BookChapterCoverage(Base):
    __tablename__ = "book_chapter_coverage"
    __table_args__ = (
        UniqueConstraint(
            "chapter_id",
            "book_id",
            name="uq_book_chapter_coverage_chapter_book",
        ),
        Index("ix_book_chapter_coverage_book_id", "book_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    chapter_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("chapter.id"),
        nullable=False,
    )
    book_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("book.id"),
        nullable=False,
    )
    topic_count: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[int] = mapped_column(Integer, nullable=False)

    chapter: Mapped["Chapter"] = relationship(back_populates="book_coverages")
    book: Mapped["Book"] = relationship(back_populates="chapter_coverages")


class Topic(Base):
    __tablename__ = "topic"
    __table_args__ = (
        UniqueConstraint("book_id", "name", name="uq_topics_book_id_name"),
        Index("ix_topics_book_id", "book_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    page_start: Mapped[int] = mapped_column(Integer, nullable=False)
    page_end: Mapped[int] = mapped_column(Integer, nullable=False)

    book_id: Mapped[int] = mapped_column(Integer, ForeignKey("book.id"))

    topic_codes: Mapped[list["TopicCode"]] = relationship(
        back_populates="topics",
        secondary="topic_mapping",
    )

    book: Mapped["Book"] = relationship(
        back_populates="topics",
    )

    definitions: Mapped[list["Definition"]] = relationship(
        back_populates="topic",
        cascade="all, delete-orphan",
    )
