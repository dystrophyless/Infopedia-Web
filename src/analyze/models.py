from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.topics.models import Chapter as ChapterModel

if TYPE_CHECKING:
    from src.users.models import User


class AnalyzeResult(Base):
    __tablename__ = "analyze_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("TIMEZONE('utc', now())"),
    )
    unt_attempt_id: Mapped[str | None] = mapped_column(String(16), nullable=True)
    unt_attempt_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    items: Mapped[list["AnalyzeResultItem"]] = relationship(
        back_populates="result",
        cascade="all, delete-orphan",
    )


Index(
    "uq_analyze_results_user_unt_attempt",
    AnalyzeResult.user_id,
    AnalyzeResult.unt_attempt_id,
    unique=True,
    postgresql_where=AnalyzeResult.unt_attempt_id.is_not(None),
    sqlite_where=AnalyzeResult.unt_attempt_id.is_not(None),
)


class AnalyzeResultItem(Base):
    __tablename__ = "analyze_result_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    result_id: Mapped[int] = mapped_column(
        ForeignKey("analyze_results.id"), nullable=False, index=True
    )

    chapter_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("chapter.id"),
        nullable=False,
        index=True,
    )

    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    percentage: Mapped[int] = mapped_column(Integer, nullable=False)

    result: Mapped["AnalyzeResult"] = relationship(back_populates="items")
    chapter: Mapped[ChapterModel] = relationship()
