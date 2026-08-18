from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import (
    text as sa_text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.topics.models import Topic


class TestQuestion(Base):
    __tablename__ = "test_question"
    __table_args__ = (
        UniqueConstraint("source_key", name="uq_test_question_source_key"),
        Index("ix_test_question_topic_active", "topic_id", "active"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_key: Mapped[str] = mapped_column(String(255), nullable=False)
    topic_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("topic.id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default=sa_text("TRUE"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=sa_text("TIMEZONE('utc', now())"),
    )

    options: Mapped[list[TestQuestionOption]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="TestQuestionOption.id",
    )
    topic: Mapped[Topic | None] = relationship()
    attempt_questions: Mapped[list[TestAttemptQuestion]] = relationship(
        back_populates="question",
    )


class TestCatalogGeneration(Base):
    """Immutable materialized generation for the public Tests catalog."""

    __tablename__ = "test_catalog_generation"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    source_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    refreshed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=sa_text("TIMEZONE('utc', now())"),
    )
    stats: Mapped[list[TestCatalogStat]] = relationship(
        "TestCatalogStat",
        back_populates="generation", cascade="all, delete-orphan",
    )


class TestCatalogState(Base):
    """Singleton pointer; readers must treat current_generation_id as sole truth."""

    __tablename__ = "test_catalog_state"
    __table_args__ = (CheckConstraint("id = 1", name="ck_test_catalog_state_singleton"),)

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True, default=1, server_default=sa_text("1"))
    current_generation_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("test_catalog_generation.id", ondelete="SET NULL"), nullable=True,
    )
    generation: Mapped[TestCatalogGeneration | None] = relationship("TestCatalogGeneration")


class TestCatalogStat(Base):
    """One total row (chapter_id NULL) and zero or more chapter rows per generation."""

    __tablename__ = "test_catalog_stat"
    __table_args__ = (
        CheckConstraint("active_question_count >= 0", name="ck_test_catalog_stat_nonnegative"),
        Index(
            "uq_test_catalog_stat_generation_total",
            "generation_id",
            unique=True,
            postgresql_where=sa_text("chapter_id IS NULL"),
            sqlite_where=sa_text("chapter_id IS NULL"),
        ),
        Index(
            "uq_test_catalog_stat_generation_chapter",
            "generation_id",
            "chapter_id",
            unique=True,
            postgresql_where=sa_text("chapter_id IS NOT NULL"),
            sqlite_where=sa_text("chapter_id IS NOT NULL"),
        ),
        Index("ix_test_catalog_stat_generation", "generation_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    generation_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("test_catalog_generation.id", ondelete="CASCADE"), nullable=False,
    )
    chapter_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("chapter.id", ondelete="CASCADE"), nullable=True,
    )
    active_question_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default=sa_text("0"),
    )
    generation: Mapped[TestCatalogGeneration] = relationship(
        "TestCatalogGeneration", back_populates="stats",
    )

    @property
    def question_count(self) -> int:
        """Backward-compatible attribute name for internal callers."""
        return self.active_question_count

    @question_count.setter
    def question_count(self, value: int) -> None:
        self.active_question_count = value


# Descriptive aliases used by callers that prefer pluralized stats terminology.
TestCatalogStats = TestCatalogStat
TestsCatalogGeneration = TestCatalogGeneration
TestsCatalogState = TestCatalogState
TestCatalogStatsGeneration = TestCatalogGeneration
TestCatalogStatsState = TestCatalogState


class TestQuestionOption(Base):
    __tablename__ = "test_question_option"
    __table_args__ = (
        UniqueConstraint("question_id", "source_ref", name="uq_test_question_option_ref"),
        Index("ix_test_question_option_question", "question_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("test_question.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_ref: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(16), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=sa_text("FALSE"))

    question: Mapped[TestQuestion] = relationship(back_populates="options")


class TestAttempt(Base):
    __tablename__ = "test_attempt"
    __table_args__ = (
        Index("ix_test_attempt_user_completed", "user_id", "completed_at"),
        Index("ix_test_attempt_user_status", "user_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )
    mode: Mapped[str] = mapped_column(String(16), nullable=False)
    chapter_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("chapter.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active", server_default=sa_text("'active'"))
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=sa_text("TIMEZONE('utc', now())"),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    questions_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))
    answered_questions: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))
    correct_answer_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))
    score_percent: Mapped[float] = mapped_column(nullable=False, default=0, server_default=sa_text("0"))
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))
    average_pace_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))
    summary_json: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    questions: Mapped[list[TestAttemptQuestion]] = relationship(
        back_populates="attempt",
        cascade="all, delete-orphan",
        order_by="TestAttemptQuestion.ordinal",
    )


class TestAttemptQuestion(Base):
    __tablename__ = "test_attempt_question"
    __table_args__ = (
        UniqueConstraint("attempt_id", "ordinal", name="uq_test_attempt_question_ordinal"),
        UniqueConstraint("attempt_id", "question_id", name="uq_test_attempt_question_question"),
        Index("ix_test_attempt_question_attempt", "attempt_id"),
        Index("ix_test_attempt_question_chapter", "chapter_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("test_attempt.id", ondelete="CASCADE"),
        nullable=False,
    )
    question_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("test_question.id", ondelete="SET NULL"),
        nullable=True,
    )
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)
    question_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options_json: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    correct_option_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    chapter_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    topic_title: Mapped[str] = mapped_column(String(255), nullable=False, default="", server_default=sa_text("''"))
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=sa_text("0"))

    attempt: Mapped[TestAttempt] = relationship(back_populates="questions")
    question: Mapped[TestQuestion | None] = relationship(back_populates="attempt_questions")
    answer: Mapped[TestAttemptAnswer | None] = relationship(
        back_populates="attempt_question",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TestAttemptAnswer(Base):
    __tablename__ = "test_attempt_answer"
    __table_args__ = (
        UniqueConstraint("attempt_question_id", name="uq_test_attempt_answer_question"),
        Index("ix_test_attempt_answer_question", "attempt_question_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    attempt_question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("test_attempt_question.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_option_ref: Mapped[str] = mapped_column(String(255), nullable=False)
    awarded_weight: Mapped[int] = mapped_column(Integer, nullable=False)
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=sa_text("TIMEZONE('utc', now())"),
    )

    attempt_question: Mapped[TestAttemptQuestion] = relationship(back_populates="answer")
