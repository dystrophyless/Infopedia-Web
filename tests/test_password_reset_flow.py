import unittest
from unittest.mock import AsyncMock, Mock, patch

from sqlalchemy.exc import IntegrityError


class RegisterUserTests(unittest.IsolatedAsyncioTestCase):
    async def test_reverts_registration_resend_throttle_when_email_send_fails(self):
        from datetime import UTC, datetime, timedelta

        from fastapi import HTTPException

        from src.auth.emailer import EmailDeliveryError
        from src.auth.router import register_user
        from src.auth.schemas import RegisterRequest

        previous_last_sent_at = datetime.now(UTC) - timedelta(hours=1)
        existing_pending = Mock(last_sent_at=previous_last_sent_at)
        session = Mock()
        session.commit = AsyncMock()

        with (
            patch(
                "src.auth.router.check_user_exists_by_email",
                new=AsyncMock(return_value=False),
            ),
            patch(
                "src.auth.router.get_pending_user_by_email",
                new=AsyncMock(return_value=existing_pending),
            ),
            patch("src.auth.router.create_verification_code", return_value="123456"),
            patch("src.auth.router.hash_verification_code", return_value="code-hash"),
            patch("src.auth.router.hash_password", return_value="password-hash"),
            patch(
                "src.auth.router.send_verification_code",
                side_effect=EmailDeliveryError("send failed"),
            ),
        ):
            with self.assertRaises(HTTPException) as raised:
                await register_user(
                    RegisterRequest(email="person@example.com", password="secret123"),
                    session,
                )

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(existing_pending.last_sent_at, previous_last_sent_at)
        self.assertEqual(session.commit.await_count, 2)

    async def test_updates_pending_user_when_concurrent_insert_wins_race(self):
        from src.auth.router import register_user
        from src.auth.schemas import RegisterRequest

        existing_pending = Mock(last_sent_at=None)
        session = Mock()
        session.add = Mock()
        session.rollback = AsyncMock()
        session.commit = AsyncMock(
            side_effect=[
                IntegrityError("insert pending user", {}, Exception("duplicate email")),
                None,
            ],
        )

        with (
            patch(
                "src.auth.router.check_user_exists_by_email",
                new=AsyncMock(return_value=False),
            ),
            patch(
                "src.auth.router.get_pending_user_by_email",
                new=AsyncMock(side_effect=[None, existing_pending]),
            ),
            patch("src.auth.router.create_verification_code", return_value="123456"),
            patch("src.auth.router.hash_verification_code", return_value="code-hash"),
            patch("src.auth.router.hash_password", return_value="password-hash"),
            patch("src.auth.router.send_verification_code") as send_code,
        ):
            result = await register_user(
                RegisterRequest(email="person@example.com", password="secret123"),
                session,
            )

        session.rollback.assert_awaited_once()
        self.assertEqual(session.commit.await_count, 2)
        self.assertEqual(existing_pending.password_hash, "password-hash")
        self.assertEqual(existing_pending.code_hash, "code-hash")
        self.assertEqual(existing_pending.attempts, 0)
        send_code.assert_called_once_with(
            to_email="person@example.com",
            code="123456",
        )
        self.assertIn("message", result)


class ForgotPasswordTests(unittest.IsolatedAsyncioTestCase):
    async def test_does_not_send_reset_email_when_token_commit_fails(self):
        from src.auth.router import forgot_password
        from src.auth.schemas import ForgotPasswordRequest

        user = Mock(id=123, email="person@example.com", username="person")
        session = Mock()
        session.add = Mock()
        session.commit = AsyncMock(side_effect=RuntimeError("commit failed"))

        with (
            patch("src.auth.router.get_user_by_email", new=AsyncMock(return_value=user)),
            patch(
                "src.auth.router.get_auth_identity_by_provider_subject",
                new=AsyncMock(return_value=Mock()),
            ),
            patch("src.auth.router.generate_reset_token", return_value="reset-token"),
            patch("src.auth.router.hash_reset_token", return_value="token-hash"),
            patch("src.auth.router.send_password_reset_email") as send_email,
        ):
            with self.assertRaises(RuntimeError):
                await forgot_password(
                    ForgotPasswordRequest(email="person@example.com"),
                    session,
                )

        send_email.assert_not_called()
