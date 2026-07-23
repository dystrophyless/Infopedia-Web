import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from src.auth.constants import PASSWORD_PROVIDER
from src.users import router
from src.users.schemas import ChangePasswordRequest, VerifyCurrentPasswordRequest


class SessionFake:
    def __init__(self) -> None:
        self.commit = AsyncMock()
        self.refresh = AsyncMock()


def make_user() -> SimpleNamespace:
    return SimpleNamespace(id=42, email="Student@Example.com")


class PasswordRouterTests(unittest.IsolatedAsyncioTestCase):
    async def test_verify_success_is_non_mutating_and_uses_normalized_password_identity(self):
        user = make_user()
        session = SessionFake()
        identity = SimpleNamespace(password_hash="hash")
        limiter = AsyncMock()
        lookup = AsyncMock(return_value=identity)

        with (
            patch.object(router, "enforce_password_attempt_limit", limiter),
            patch.object(router, "get_auth_identity_by_provider_subject", lookup),
            patch.object(router, "verify_password", return_value=True) as verify,
        ):
            result = await router.verify_current_password(
                VerifyCurrentPasswordRequest(current_password="Current123!"),
                user,
                session,
            )

        self.assertEqual(result, {"verified": True})
        limiter.assert_awaited_once_with(42)
        lookup.assert_awaited_once_with(
            session,
            provider=PASSWORD_PROVIDER,
            provider_subject="student@example.com",
        )
        verify.assert_called_once_with("Current123!", "hash")
        session.commit.assert_not_awaited()
        session.refresh.assert_not_awaited()
        self.assertNotIn("Current123!", repr(result))

    async def test_verify_wrong_password_is_exact_400_and_limiter_precedes_lookup(self):
        user = make_user()
        session = SessionFake()
        order: list[str] = []

        async def limit(_user_id: int) -> None:
            order.append("limit")

        async def lookup(*_args, **_kwargs):
            order.append("lookup")
            return SimpleNamespace(password_hash="hash")

        with (
            patch.object(router, "enforce_password_attempt_limit", limit),
            patch.object(router, "get_auth_identity_by_provider_subject", lookup),
            patch.object(router, "verify_password", return_value=False),
        ):
            with self.assertRaises(HTTPException) as raised:
                await router.verify_current_password(
                    VerifyCurrentPasswordRequest(current_password="Wrong123!"), user, session
                )

        self.assertEqual(order, ["limit", "lookup"])
        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail, "Неверный текущий пароль.")
        self.assertNotIn("Wrong123!", repr(raised.exception.detail))

    async def test_verify_passwordless_identity_is_exact_400(self):
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock()),
            patch.object(router, "get_auth_identity_by_provider_subject", AsyncMock(return_value=None)),
        ):
            with self.assertRaises(HTTPException) as raised:
                await router.verify_current_password(
                    VerifyCurrentPasswordRequest(current_password="Current123!"),
                    make_user(),
                    SessionFake(),
                )

        self.assertEqual(raised.exception.status_code, 400)
        self.assertEqual(raised.exception.detail, "Парольный вход не настроен.")

    async def test_limiter_rejection_stops_verify_lookup(self):
        rejection = HTTPException(status_code=429, detail={"code": "password_attempt_rate_limited"})
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock(side_effect=rejection)),
            patch.object(router, "get_auth_identity_by_provider_subject", AsyncMock()) as lookup,
        ):
            with self.assertRaises(HTTPException) as raised:
                await router.verify_current_password(
                    VerifyCurrentPasswordRequest(current_password="Current123!"), make_user(), SessionFake()
                )

        self.assertIs(raised.exception, rejection)
        lookup.assert_not_awaited()

    async def test_change_password_rechecks_current_and_successfully_mutates(self):
        user = make_user()
        session = SessionFake()
        identity = SimpleNamespace(password_hash="old-hash")
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock()) as limiter,
            patch.object(router, "get_auth_identity_by_provider_subject", AsyncMock(return_value=identity)) as lookup,
            patch.object(router, "verify_password", return_value=True) as verify,
            patch.object(router, "hash_password", return_value="new-hash") as hasher,
            patch.object(router, "delete_all_reset_tokens_for_user", AsyncMock()) as delete_tokens,
        ):
            result = await router.change_password(
                ChangePasswordRequest(current_password="Current123!", new_password="Next456!"),
                user,
                session,
            )

        limiter.assert_awaited_once_with(42)
        lookup.assert_awaited_once()
        verify.assert_called_once_with("Current123!", "old-hash")
        hasher.assert_called_once_with("Next456!")
        delete_tokens.assert_awaited_once_with(session, user_id=42)
        session.commit.assert_awaited_once()
        self.assertEqual(identity.password_hash, "new-hash")
        self.assertNotIn("Next456!", repr(result))

    async def test_change_wrong_current_does_not_hash_delete_or_commit(self):
        session = SessionFake()
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock()),
            patch.object(router, "get_auth_identity_by_provider_subject", AsyncMock(return_value=SimpleNamespace(password_hash="hash"))),
            patch.object(router, "verify_password", return_value=False),
            patch.object(router, "hash_password") as hasher,
            patch.object(router, "delete_all_reset_tokens_for_user", AsyncMock()) as delete_tokens,
        ):
            with self.assertRaises(HTTPException):
                await router.change_password(
                    ChangePasswordRequest(current_password="Wrong123!", new_password="Next456!"),
                    make_user(),
                    session,
                )

        hasher.assert_not_called()
        delete_tokens.assert_not_awaited()
        session.commit.assert_not_awaited()


class PasswordSchemaTests(unittest.TestCase):
    def test_current_password_boundaries(self):
        for schema in (VerifyCurrentPasswordRequest, ChangePasswordRequest):
            with self.subTest(schema=schema.__name__):
                with self.assertRaises(ValidationError):
                    schema(current_password="a" * 7, **({} if schema is VerifyCurrentPasswordRequest else {"new_password": "Next456!"}))
                kwargs = {} if schema is VerifyCurrentPasswordRequest else {"new_password": "Next456!"}
                self.assertEqual(schema(current_password="a" * 8, **kwargs).current_password, "a" * 8)
                self.assertEqual(schema(current_password="a" * 129, **kwargs).current_password, "a" * 129)
                self.assertEqual(schema(current_password="a" * 128, **kwargs).current_password, "a" * 128)
                self.assertEqual(schema(current_password="a" * 256, **kwargs).current_password, "a" * 256)
                with self.assertRaises(ValidationError):
                    schema(current_password="a" * 257, **kwargs)
