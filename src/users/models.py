from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Integer,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base
from src.users.enums import UserGrade, UserLanguage, UserRole


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    language: Mapped[UserLanguage] = mapped_column(
        Enum(UserLanguage, native_enum=False),
        nullable=False,
    )
    grade: Mapped[UserGrade] = mapped_column(
        Enum(UserGrade, native_enum=False),
        nullable=False,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, native_enum=False),
        nullable=False,
    )

    banned: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("TIMEZONE('utc', now())"),
    )
