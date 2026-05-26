from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.models import AuthIdentity, PendingUser, RefreshToken
from src.users.models import User


async def add_auth_identity(
    session: AsyncSession,
    *,
    user_id: int,
    provider: str,
    provider_subject: str,
    email: str,
    password_hash: str | None = None,
) -> AuthIdentity:
    auth_identity = AuthIdentity(
        user_id=user_id,
        provider=provider,
        provider_subject=provider_subject,
        email=email,
        password_hash=password_hash,
    )

    session.add(auth_identity)

    return auth_identity


async def get_user_by_auth_identity(
    session: AsyncSession,
    *,
    provider: str,
    provider_subject: str,
) -> User | None:
    query = (
        select(User)
        .join(AuthIdentity)
        .where(
            AuthIdentity.provider == provider,
            AuthIdentity.provider_subject == provider_subject,
        )
    )

    result = await session.execute(query)

    user: User | None = result.scalar_one_or_none()

    return user


async def get_auth_identity_by_provider_subject(
    session: AsyncSession,
    *,
    provider: str,
    provider_subject: str,
) -> AuthIdentity | None:
    query = (
        select(AuthIdentity)
        .options(selectinload(AuthIdentity.user))
        .where(
            AuthIdentity.provider == provider,
            AuthIdentity.provider_subject == provider_subject,
        )
    )

    result = await session.execute(query)

    auth_identity: AuthIdentity | None = result.scalar_one_or_none()

    return auth_identity


async def get_pending_user_by_email(
    session: AsyncSession,
    *,
    email: str,
) -> PendingUser | None:
    query = select(PendingUser).where(func.lower(PendingUser.email) == email.lower())

    result = await session.execute(query)

    pending_user: PendingUser | None = result.scalar_one_or_none()

    return pending_user


async def add_refresh_token(
    session: AsyncSession,
    *,
    user_id: int,
    token_hash: str,
    expires_at,
) -> RefreshToken:
    refresh_token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    session.add(refresh_token)

    return refresh_token


async def get_refresh_token_by_hash(
    session: AsyncSession,
    *,
    token_hash: str,
) -> RefreshToken | None:
    query = select(RefreshToken).where(RefreshToken.token_hash == token_hash)

    result = await session.execute(query)

    refresh_token: RefreshToken | None = result.scalar_one_or_none()

    return refresh_token


async def revoke_refresh_token(
    *,
    refresh_token: RefreshToken,
):
    refresh_token.revoked_at = datetime.now(UTC)
