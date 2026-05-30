from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from src.users.enums import UserGrade, UserLanguage, UserRole
from src.users.validators import validate_email_value, validate_username_value


class UserBase(BaseModel):
    username: str
    email: EmailStr

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return validate_username_value(value)

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return validate_email_value(value)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=256)


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=64)
    grade: UserGrade | None = Field(default=None)
    language: UserLanguage | None = Field(default=None)

    @field_validator("username", mode="before")
    @classmethod
    def validate_optional_username(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_username_value(value)

    @field_validator("email", mode="before")
    @classmethod
    def validate_optional_email(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_email_value(value)


class UserResponsePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(ge=1)
    username: str | None = Field(min_length=3, max_length=20)
    role: UserRole
    grade: UserGrade | None
    language: UserLanguage
    banned: bool


class UserResponsePrivate(UserResponsePublic):
    email: EmailStr = Field(max_length=64)
    onboarding_completed: bool


class UsernameSetupRequest(BaseModel):
    username: str = Field(min_length=3, max_length=20)

    @field_validator("username", mode="before")
    @classmethod
    def validate_username(cls, value: str) -> str:
        return validate_username_value(value)

class GradeSetupRequest(BaseModel):
    grade: UserGrade


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)