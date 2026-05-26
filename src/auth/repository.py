from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import PendingUser, RefreshToken


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
