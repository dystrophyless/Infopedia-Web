from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.terms.models import Term
    from src.users.models import User


class FavoriteTerm(Base):
    """A term saved by a user, uniquely identified by the user/term pair."""

    __tablename__ = "favorite_term"
    __table_args__ = (
        Index("ix_favorite_term_user_created_at", "user_id", "created_at"),
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    term_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("term.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("TIMEZONE('utc', now())"),
    )

    user: Mapped["User"] = relationship()
    term: Mapped["Term"] = relationship()
