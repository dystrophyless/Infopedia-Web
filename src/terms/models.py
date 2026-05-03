from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base


class Book(Base):
    __tablename__ = "book"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    topics: Mapped[list["Topic"]] = relationship(
        back_populates="book",
        cascade="all, delete-orphan",
    )


class Chapter(Base):
    __tablename__ = "chapter"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    topic_codes: Mapped[list["TopicCode"]] = relationship(
        back_populates="chapter",
    )


class TopicCode(Base):
    __tablename__ = "topic_code"

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


class TopicMapping(Base):
    __tablename__ = "topic_mapping"

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


class Term(Base):
    __tablename__ = "term"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)

    definitions: Mapped[list["Definition"]] = relationship(
        back_populates="term",
        cascade="all, delete-orphan",
    )


class Definition(Base):
    __tablename__ = "definition"
    __table_args__ = (
        Index(
            "ix_definitions_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    term_id: Mapped[int] = mapped_column(
        ForeignKey("term.id"),
        nullable=False,
        index=True,
    )
    topic_id: Mapped[int] = mapped_column(
        ForeignKey("topic.id"),
        nullable=False,
        index=True,
    )

    text: Mapped[str] = mapped_column(Text, nullable=False)
    page: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list[float]] = mapped_column(Vector(1024))

    term: Mapped["Term"] = relationship(back_populates="definitions")
    topic: Mapped["Topic"] = relationship(back_populates="definitions")
