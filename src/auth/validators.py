from pydantic_core import PydanticCustomError

PASSWORD_ALLOWED_CHARACTERS = set(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    r"""!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~"""
)


def validate_password_value(value: str) -> str:
    if any(char not in PASSWORD_ALLOWED_CHARACTERS for char in value):
        raise PydanticCustomError(
            "password_invalid_characters",
            "Пароль должен содержать только латинские буквы, цифры и символы.",
        )

    return value
