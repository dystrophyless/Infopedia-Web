import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from enums import UserGrade, UserLanguage, UserRole


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    email: EmailStr = Field(max_length=64)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if len(value) < 3 or len(value) > 16:
            raise ValueError(
                "Никнейм должен содержать от 3 до 20 символов",
            )

        if not re.match(r"^[a-zA-Z0-9_.]+$", value):
            raise ValueError(
                "Никнейм должен содержать только латинские буквы, цифры и нижнее подчеркивание",
            )

        if value[0] in "_." or value[-1] in "_.":
            raise ValueError(
                "Никнейм не должен начинаться или заканчиваться точкой или нижним подчёркиванием",
            )

        if ".." in value or "__" in value or "._" in value or "_." in value:
            raise ValueError(
                "Никнейм не должен содержать подряд идущие точки или нижние подчёркивания",
            )

        return value


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=64)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=16)
    email: EmailStr | None = Field(default=None, max_length=64)
    language: UserLanguage | None = Field(default=None, min_length=2, max_length=2)
    grade: UserGrade | None = Field(default=None)
    role: UserRole | None = Field(default=None)
    banned: bool | None = Field(default=None)


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    username: str = Field(min_length=3, max_length=20)
    id: int = Field(ge=1)
    language: UserLanguage = Field(min_length=2, max_length=2)
    grade: UserGrade
    role: UserRole
    banned: bool = Field(default=False)
    image_file: str | None = Field(default=None)
    image_path: str


class UserPrivate(UserPublic):
    email: EmailStr = Field(max_length=64)


class Token(BaseModel):
    access_token: str
    token_type: str
