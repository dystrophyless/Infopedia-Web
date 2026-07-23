import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from src.auth.constants import PASSWORD_PROVIDER
from src.users import router
from src.users.schemas import CreatePasswordRequest, UserResponsePrivate, UserResponsePrivateMe, UserResponsePublic


class SessionFake:
    def __init__(self):
        self.commit = AsyncMock()


def make_user():
    return SimpleNamespace(
        id=7,
        username="student",
        email="Student@Example.com",
        role="user",
        grade=None,
        language="ru",
        banned=False,
        onboarding_completed=False,
    )


class CreatePasswordRouterTests(unittest.IsolatedAsyncioTestCase):
    async def test_absent_identity_creates_and_revokes_reset_tokens(self):
        session = SessionFake()
        identity = SimpleNamespace(password_hash="new-hash")
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock()) as limiter,
            patch.object(router, "hash_password", return_value="new-hash") as hasher,
            patch.object(router, "create_password_identity_if_missing_or_empty", AsyncMock(return_value=identity)) as create,
            patch.object(router, "delete_all_reset_tokens_for_user", AsyncMock()) as delete_tokens,
        ):
            result = await router.create_my_password(
                CreatePasswordRequest(new_password="NewPassword1!"), make_user(), session
            )

        self.assertEqual(result, {"created": True})
        limiter.assert_awaited_once_with(7)
        hasher.assert_called_once_with("NewPassword1!")
        create.assert_awaited_once_with(
            session,
            user_id=7,
            provider_subject="student@example.com",
            email="student@example.com",
            password_hash="new-hash",
        )
        delete_tokens.assert_awaited_once_with(session, user_id=7)
        session.commit.assert_awaited_once()

    async def test_nullable_identity_is_treated_as_create(self):
        session = SessionFake()
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock()),
            patch.object(router, "hash_password", return_value="hash"),
            patch.object(router, "create_password_identity_if_missing_or_empty", AsyncMock(return_value=SimpleNamespace(password_hash="hash"))),
            patch.object(router, "delete_all_reset_tokens_for_user", AsyncMock()) as delete_tokens,
        ):
            result = await router.create_my_password(
                CreatePasswordRequest(new_password="NewPassword1!"), make_user(), session
            )
        self.assertEqual(result, {"created": True})
        delete_tokens.assert_awaited_once()

    async def test_existing_hash_and_race_no_return_map_to_stable_conflict(self):
        session = SessionFake()
        with (
            patch.object(router, "enforce_password_attempt_limit", AsyncMock()),
            patch.object(router, "hash_password", return_value="replacement") as hasher,
            patch.object(router, "create_password_identity_if_missing_or_empty", AsyncMock(return_value=None)),
            patch.object(router, "delete_all_reset_tokens_for_user", AsyncMock()) as delete_tokens,
        ):
            with self.assertRaises(HTTPException) as raised:
                await router.create_my_password(
                    CreatePasswordRequest(new_password="NewPassword1!"), make_user(), session
                )

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(raised.exception.detail["code"], "password_already_configured")
        hasher.assert_called_once_with("NewPassword1!")
        delete_tokens.assert_not_awaited()
        session.commit.assert_not_awaited()

    async def test_limiter_precedes_hash(self):
        order = []
        session = SessionFake()

        async def limit(_user_id):
            order.append("limit")

        def hasher(_password):
            order.append("hash")
            return "hash"

        with (
            patch.object(router, "enforce_password_attempt_limit", limit),
            patch.object(router, "hash_password", hasher),
            patch.object(router, "create_password_identity_if_missing_or_empty", AsyncMock(return_value=None)),
        ):
            with self.assertRaises(HTTPException):
                await router.create_my_password(
                    CreatePasswordRequest(new_password="NewPassword1!"), make_user(), session
                )
        self.assertEqual(order, ["limit", "hash"])

    async def test_get_me_reports_truthful_password_state_and_private_only(self):
        self.assertNotIn("has_password", UserResponsePublic.model_fields)
        self.assertNotIn("has_password", UserResponsePrivate.model_fields)
        self.assertIn("has_password", UserResponsePrivateMe.model_fields)
        session = SessionFake()
        with patch.object(
            router,
            "get_auth_identity_by_provider_subject",
            AsyncMock(return_value=SimpleNamespace(password_hash="hash")),
        ) as lookup:
            result = await router.get_current_user(make_user(), session)
        self.assertTrue(result.has_password)
        lookup.assert_awaited_once_with(
            session,
            provider=PASSWORD_PROVIDER,
            provider_subject="student@example.com",
        )

        with patch.object(
            router,
            "get_auth_identity_by_provider_subject",
            AsyncMock(return_value=SimpleNamespace(password_hash=None)),
        ):
            result = await router.get_current_user(make_user(), session)
        self.assertFalse(result.has_password)


class CreatePasswordSchemaTests(unittest.TestCase):
    def test_validation_matches_password_contract(self):
        self.assertEqual(CreatePasswordRequest(new_password="a" * 8).new_password, "a" * 8)
        self.assertEqual(CreatePasswordRequest(new_password="a" * 128).new_password, "a" * 128)
        for value in ("a" * 7, "a" * 129, "пароль123"):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                CreatePasswordRequest(new_password=value)


if __name__ == "__main__":
    unittest.main()
