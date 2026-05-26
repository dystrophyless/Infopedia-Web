import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch

from fastapi import HTTPException

from src.auth.schemas import TokenPair, VerifyEmailRequest
from src.users.models import User


class GoogleOAuthStateTests(unittest.TestCase):
    def test_google_oauth_state_round_trips_and_rejects_tampering(self):
        from src.auth.utils import (
            create_google_oauth_state,
            verify_google_oauth_state,
        )

        state = create_google_oauth_state()

        self.assertTrue(verify_google_oauth_state(state))
        self.assertFalse(verify_google_oauth_state(f"{state}x"))


class AuthIdentityModelTests(unittest.TestCase):
    def test_auth_identity_tracks_provider_subject_and_optional_password(self):
        from sqlalchemy import UniqueConstraint

        from src.auth.models import AuthIdentity

        columns = AuthIdentity.__table__.c

        self.assertEqual(AuthIdentity.__tablename__, "auth_identity")
        self.assertFalse(columns.provider.nullable)
        self.assertFalse(columns.provider_subject.nullable)
        self.assertTrue(columns.password_hash.nullable)
        self.assertTrue(User.__table__.c.password_hash.nullable)

        unique_columns = {
            tuple(constraint.columns.keys())
            for constraint in AuthIdentity.__table__.constraints
            if isinstance(constraint, UniqueConstraint)
        }

        self.assertIn(("provider", "provider_subject"), unique_columns)


class GoogleOAuthCallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_google_token_info_errors_use_generic_client_message(self):
        from src.auth.router import fetch_google_token_info

        response = Mock(status_code=200)
        response.json.return_value = {
            "aud": "wrong-client",
            "iss": "https://accounts.google.com",
            "email_verified": "true",
            "sub": "google-sub",
            "email": "person@example.com",
        }
        client = AsyncMock()
        client.get.return_value = response
        client_context = AsyncMock()
        client_context.__aenter__.return_value = client

        with patch("src.auth.router.httpx.AsyncClient", return_value=client_context):
            with self.assertRaises(HTTPException) as raised:
                await fetch_google_token_info("google-id-token")

        self.assertEqual(raised.exception.status_code, 401)
        self.assertEqual(
            raised.exception.detail,
            "Не удалось авторизоваться через Google.",
        )

    async def test_google_callback_uses_existing_identity(self):
        from src.auth.router import handle_google_oauth_callback

        session = Mock()
        session.commit = AsyncMock()
        user = Mock(id=42, banned=False)
        token_pair = TokenPair(
            access_token="access",
            refresh_token="refresh",
            token_type="bearer",
        )

        with (
            patch(
                "src.auth.router.exchange_google_authorization_code",
                new=AsyncMock(return_value={"id_token": "google-id-token"}),
            ),
            patch(
                "src.auth.router.fetch_google_token_info",
                new=AsyncMock(
                    return_value={
                        "sub": "google-sub",
                        "email": "Person@Example.com",
                        "email_verified": "true",
                    },
                ),
            ),
            patch("src.auth.router.verify_google_oauth_state", return_value=True),
            patch(
                "src.auth.router.get_user_by_auth_identity",
                new=AsyncMock(return_value=user),
            ) as get_user_by_auth_identity,
            patch("src.auth.router.get_user_by_email", new=AsyncMock()) as get_user_by_email,
            patch("src.auth.router.add_user", new=AsyncMock()) as add_user,
            patch("src.auth.router.add_auth_identity", new=AsyncMock()) as add_identity,
            patch(
                "src.auth.router.issue_token_pair",
                new=AsyncMock(return_value=token_pair),
            ) as issue_token_pair,
        ):
            result = await handle_google_oauth_callback(
                code="auth-code",
                state="oauth-state",
                google_oauth_state="oauth-state",
                session=session,
            )

        self.assertEqual(result, token_pair)
        get_user_by_auth_identity.assert_awaited_once_with(
            session,
            provider="google",
            provider_subject="google-sub",
        )
        get_user_by_email.assert_not_awaited()
        add_user.assert_not_awaited()
        add_identity.assert_not_awaited()
        issue_token_pair.assert_awaited_once_with(session, user=user)
        session.commit.assert_awaited_once()

    async def test_google_callback_creates_user_and_identity_when_missing(self):
        from src.auth.router import handle_google_oauth_callback

        session = Mock()
        session.commit = AsyncMock()
        user = Mock(id=77, banned=False)
        token_pair = TokenPair(
            access_token="access",
            refresh_token="refresh",
            token_type="bearer",
        )

        with (
            patch(
                "src.auth.router.exchange_google_authorization_code",
                new=AsyncMock(return_value={"id_token": "google-id-token"}),
            ),
            patch(
                "src.auth.router.fetch_google_token_info",
                new=AsyncMock(
                    return_value={
                        "sub": "google-sub",
                        "email": "Person@Example.com",
                        "email_verified": True,
                    },
                ),
            ),
            patch("src.auth.router.verify_google_oauth_state", return_value=True),
            patch(
                "src.auth.router.get_user_by_auth_identity",
                new=AsyncMock(return_value=None),
            ),
            patch("src.auth.router.get_user_by_email", new=AsyncMock(return_value=None)),
            patch("src.auth.router.add_user", new=AsyncMock(return_value=user)) as add_user,
            patch("src.auth.router.add_auth_identity", new=AsyncMock()) as add_identity,
            patch(
                "src.auth.router.issue_token_pair",
                new=AsyncMock(return_value=token_pair),
            ),
        ):
            result = await handle_google_oauth_callback(
                code="auth-code",
                state="oauth-state",
                google_oauth_state="oauth-state",
                session=session,
            )

        self.assertEqual(result, token_pair)
        add_user.assert_awaited_once_with(
            session,
            username=None,
            email="person@example.com",
            password_hash=None,
            onboarding_completed=False,
        )
        add_identity.assert_awaited_once_with(
            session,
            user_id=77,
            provider="google",
            provider_subject="google-sub",
            email="person@example.com",
            password_hash=None,
        )
        session.commit.assert_awaited_once()

    async def test_google_callback_rejects_state_mismatch_before_external_calls(self):
        from src.auth.router import handle_google_oauth_callback

        session = Mock()
        session.commit = AsyncMock()

        with patch(
            "src.auth.router.exchange_google_authorization_code",
            new=AsyncMock(),
        ) as exchange_code:
            with self.assertRaises(HTTPException) as raised:
                await handle_google_oauth_callback(
                    code="auth-code",
                    state="returned-state",
                    google_oauth_state="cookie-state",
                    session=session,
                )

        self.assertEqual(raised.exception.status_code, 400)
        exchange_code.assert_not_awaited()
        session.commit.assert_not_awaited()


class EmailPasswordIdentityTests(unittest.IsolatedAsyncioTestCase):
    async def test_password_login_uses_password_auth_identity(self):
        from src.auth.router import login_for_access_token

        session = Mock()
        session.commit = AsyncMock()
        user = Mock(id=123, banned=False, password_hash=None)
        identity = Mock(user=user, password_hash="password-hash")
        form_data = Mock(username="Person@Example.com", password="plain-password")
        token_pair = TokenPair(
            access_token="access",
            refresh_token="refresh",
            token_type="bearer",
        )

        with (
            patch(
                "src.auth.router.get_auth_identity_by_provider_subject",
                new=AsyncMock(return_value=identity),
            ) as get_identity,
            patch("src.auth.router.get_user_by_email", new=AsyncMock()) as get_user_by_email,
            patch("src.auth.router.verify_password", return_value=True) as verify_password,
            patch(
                "src.auth.router.issue_token_pair",
                new=AsyncMock(return_value=token_pair),
            ) as issue_token_pair,
        ):
            result = await login_for_access_token(form_data, session)

        self.assertEqual(result, token_pair)
        get_identity.assert_awaited_once_with(
            session,
            provider="password",
            provider_subject="person@example.com",
        )
        get_user_by_email.assert_not_awaited()
        verify_password.assert_called_once_with("plain-password", "password-hash")
        issue_token_pair.assert_awaited_once_with(session, user=user)
        session.commit.assert_awaited_once()

    async def test_verify_email_creates_password_auth_identity(self):
        from src.auth.router import verify_email

        session = Mock()
        session.delete = AsyncMock()
        session.commit = AsyncMock()
        pending = Mock(
            email="person@example.com",
            password_hash="password-hash",
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
            attempts=0,
        )
        user = Mock(id=123)
        token_pair = TokenPair(
            access_token="access",
            refresh_token="refresh",
            token_type="bearer",
        )

        with (
            patch(
                "src.auth.router.get_pending_user_by_email",
                new=AsyncMock(return_value=pending),
            ),
            patch("src.auth.router.is_code_valid", return_value=True),
            patch("src.auth.router.add_user", new=AsyncMock(return_value=user)),
            patch("src.auth.router.add_auth_identity", new=AsyncMock()) as add_identity,
            patch(
                "src.auth.router.issue_token_pair",
                new=AsyncMock(return_value=token_pair),
            ),
        ):
            result = await verify_email(
                VerifyEmailRequest(email="person@example.com", code="123456"),
                session,
            )

        self.assertEqual(result, token_pair)
        add_identity.assert_awaited_once_with(
            session,
            user_id=123,
            provider="password",
            provider_subject="person@example.com",
            email="person@example.com",
            password_hash="password-hash",
        )
        session.commit.assert_awaited_once()
