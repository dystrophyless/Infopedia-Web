from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base

if TYPE_CHECKING:
    from src.topics.models import Topic


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
