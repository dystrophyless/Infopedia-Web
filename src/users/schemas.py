import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError

from src.users.enums import UserGrade, UserLanguage, UserRole
from src.users.errors import UserErrorCode


class UserBase(BaseModel):
    username: str
    email: EmailStr

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not value:
            raise PydanticCustomError(
                UserErrorCode.USERNAME_IS_EMPTY,
                "Username пользователя не может быть пустым.",
            )

        if len(value) < 3:
            raise PydanticCustomError(
                UserErrorCode.USERNAME_TOO_SHORT,
                "Username пользователя должен быть не короче 3 символов.",
            )

        if len(value) > 20:
            raise PydanticCustomError(
                UserErrorCode.USERNAME_TOO_LONG,
                "Username пользователя должен быть не длиннее 20 символов.",
            )

        if not re.match(r"^[a-zA-Z0-9_.]+$", value):
            raise PydanticCustomError(
                UserErrorCode.USERNAME_INVALID_CHARACTERS,
                "Username должен содержать только латинские буквы, цифры и нижнее подчеркивание.",
            )

        if value[0] in "_." or value[-1] in "_.":
            raise PydanticCustomError(
                UserErrorCode.USERNAME_INVALID_EDGE_SYMBOL,
                "Username не должен начинаться или заканчиваться точкой или нижним подчёркиванием.",
            )

        if ".." in value or "__" in value or "._" in value or "_." in value:
            raise PydanticCustomError(
                UserErrorCode.USERNAME_REPEATED_SYMBOLS,
                "Username не должен содержать подряд идущие точки или нижние подчёркивания.",
            )

        return value

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if not value:
            raise PydanticCustomError(
                UserErrorCode.EMAIL_IS_EMPTY,
                "Email пользователя не может быть пустым.",
            )

        if len(value) > 64:
            raise PydanticCustomError(
                UserErrorCode.EMAIL_TOO_LONG,
                "Email пользователя должен быть не длиннее 64 символов.",
            )

        return value


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=256)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=64)
    grade: UserGrade | None = Field(default=None)
    language: UserLanguage | None = Field(default=None)


class UserResponsePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)
    username: str = Field(min_length=3, max_length=20)
    role: UserRole
    grade: UserGrade
    language: UserLanguage
    banned: bool


class UserResponsePrivate(UserResponsePublic):
    email: EmailStr = Field(max_length=64)
