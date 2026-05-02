import re

from pydantic_core import PydanticCustomError

from src.users.errors import UserErrorCode


def validate_username_value(value: str) -> str:
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
            "Username должен содержать только латинские буквы, цифры, точки и нижние подчеркивания.",
        )

    if value[0] in "_." or value[-1] in "_.":
        raise PydanticCustomError(
            UserErrorCode.USERNAME_INVALID_EDGE_SYMBOL,
            "Username не должен начинаться или заканчиваться точкой или нижним подчеркиванием.",
        )

    if ".." in value or "__" in value or "._" in value or "_." in value:
        raise PydanticCustomError(
            UserErrorCode.USERNAME_REPEATED_SYMBOLS,
            "Username не должен содержать подряд точки/нижние подчеркивания.",
        )

    return value


def validate_email_value(value: str) -> str:
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
