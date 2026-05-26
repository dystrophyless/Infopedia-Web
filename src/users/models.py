from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database import Base
from src.users.enums import Feature, UserGrade, UserLanguage, UserRole

if TYPE_CHECKING:
    from src.auth.models import AuthIdentity, RefreshToken


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str | None] = mapped_column(
        String(32), unique=True, index=True, nullable=True
    )
    email: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)
    language: Mapped[UserLanguage] = mapped_column(
        Enum(UserLanguage, native_enum=False),
        nullable=False,
    )
    grade: Mapped[UserGrade | None] = mapped_column(
        Enum(UserGrade, native_enum=False),
        nullable=True,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False),
        nullable=False,
    )
    banned: Mapped[bool] = mapped_column(Boolean, nullable=False)

    onboarding_completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("TIMEZONE('utc', now())"),
    )

    feature_usages: Mapped[list["FeatureUsage"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    auth_identities: Mapped[list["AuthIdentity"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class FeatureUsage(Base):
    __tablename__ = "feature_usage"
    __table_args__ = (
        Index("ix_feature_usage_lookup", "user_id", "feature_name", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user.id"),
        nullable=False,
    )
    feature_name: Mapped[Feature] = mapped_column(
        Enum(Feature, native_enum=False),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("TIMEZONE('utc', now())"),
    )

    user: Mapped["User"] = relationship(back_populates="feature_usages")
