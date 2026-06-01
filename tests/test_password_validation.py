import unittest

from pydantic import ValidationError

from src.auth.schemas import RegisterRequest, ResetPasswordRequest
from src.users.schemas import ChangePasswordRequest, UserCreate


class PasswordValidationTest(unittest.TestCase):
    def test_new_password_rejects_cyrillic(self):
        cases = [
            (RegisterRequest, {"email": "user@example.com", "password": "Пароль123"}),
            (UserCreate, {"email": "user@example.com", "username": "roman", "password": "Пароль123"}),
            (ResetPasswordRequest, {"token": "a" * 32, "new_password": "Пароль123"}),
            (
                ChangePasswordRequest,
                {"current_password": "oldPassword1", "new_password": "Пароль123"},
            ),
        ]

        for schema, payload in cases:
            with self.subTest(schema=schema.__name__):
                with self.assertRaises(ValidationError):
                    schema(**payload)

    def test_new_password_accepts_latin_keyboard_characters(self):
        cases = [
            (RegisterRequest, {"email": "user@example.com", "password": "Password123!"}),
            (UserCreate, {"email": "user@example.com", "username": "roman", "password": "Password123!"}),
            (ResetPasswordRequest, {"token": "a" * 32, "new_password": "Password123!"}),
            (
                ChangePasswordRequest,
                {"current_password": "oldPassword1", "new_password": "Password123!"},
            ),
        ]

        for schema, payload in cases:
            with self.subTest(schema=schema.__name__):
                self.assertIsNotNone(schema(**payload))
