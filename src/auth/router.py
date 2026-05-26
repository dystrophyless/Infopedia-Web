from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.emailer import EmailDeliveryError, send_verification_code
from src.auth.models import PendingUser
from src.auth.repository import (
    add_refresh_token,
    get_pending_user_by_email,
    get_refresh_token_by_hash,
    revoke_refresh_token,
)
from src.auth.schemas import (
    RefreshTokenRequest,
    RegisterRequest,
    TokenPair,
    VerifyEmailRequest,
)
from src.auth.utils import (
    create_access_token,
    create_refresh_token,
    create_verification_code,
    get_refresh_token_expires_at,
    hash_password,
    hash_refresh_token,
    hash_verification_code,
    is_code_valid,
    verify_password,
)
from src.config import settings
from src.database import get_async_session
from src.users.models import User
from src.users.repository import (
    add_user,
    check_user_exists_by_email,
    get_user_by_email,
    get_user_by_id,
)

router = APIRouter()


async def issue_token_pair(
    session: AsyncSession,
    *,
    user: User,
) -> TokenPair:
    if user.id is None:
        await session.flush()

    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token()

    await add_refresh_token(
        session,
        user_id=user.id,
        token_hash=hash_refresh_token(refresh_token),
        expires_at=get_refresh_token_expires_at(),
    )

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/register", status_code=status.HTTP_202_ACCEPTED)
async def register_user(
    user_data: RegisterRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    email = user_data.email.lower()

    if await check_user_exists_by_email(session, email=email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует.",
        )

    now = datetime.now(UTC)
    code = create_verification_code()
    code_hash = hash_verification_code(email, code)
    expires_at = now + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)

    pending = await get_pending_user_by_email(session, email=email)

    if pending is not None and pending.last_sent_at is not None:
        cooldown_until = pending.last_sent_at + timedelta(
            seconds=settings.REGISTRATION_RESEND_COOLDOWN_SECONDS,
        )
        if now < cooldown_until:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Код уже отправлен. Попробуйте позже.",
            )

    if pending is None:
        pending = PendingUser(
            email=email,
            password_hash=hash_password(user_data.password),
            code_hash=code_hash,
            expires_at=expires_at,
            attempts=0,
            last_sent_at=now,
        )
        session.add(pending)
    else:
        pending.password_hash = hash_password(user_data.password)
        pending.code_hash = code_hash
        pending.expires_at = expires_at
        pending.attempts = 0
        pending.last_sent_at = now

    await session.commit()

    try:
        await send_verification_code(to_email=email, code=code)
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось отправить код подтверждения.",
        )


@router.post("/verify-email", response_model=TokenPair)
async def verify_email(
    verification_data: VerifyEmailRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    email = verification_data.email.lower()

    pending = await get_pending_user_by_email(session, email=email)

    if pending is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код не найден или истек.",
        )

    now = datetime.now(UTC)

    if pending.expires_at < now:
        await session.delete(pending)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Код истек.",
        )

    if pending.attempts >= settings.REGISTRATION_MAX_ATTEMPTS:
        await session.delete(pending)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Превышено количество попыток.",
        )

    if not is_code_valid(email, verification_data.code, pending.code_hash):
        pending.attempts += 1
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный код.",
        )

    try:
        user = await add_user(
            session,
            username=None,
            email=pending.email,
            password_hash=pending.password_hash,
            onboarding_completed=False,
        )
        await session.delete(pending)

        token_pair: TokenPair = await issue_token_pair(session, user=user)

        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует.",
        )

    return token_pair


@router.post("/token", response_model=TokenPair)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    user: User | None = await get_user_by_email(session, email=form_data.username)

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_pair: TokenPair = await issue_token_pair(session, user=user)

    await session.commit()

    return token_pair


@router.post("/refresh", response_model=TokenPair)
async def refresh_access_token(
    token_data: RefreshTokenRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    token_hash = hash_refresh_token(token_data.refresh_token)

    stored_token = await get_refresh_token_by_hash(session, token_hash=token_hash)

    if stored_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if (
        stored_token.revoked_at is not None
        or stored_token.expires_at < datetime.now(UTC)
    ):  # fmt: skip
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user: User | None = await get_user_by_id(session, user_id=stored_token.user_id)

    if user is None or user.banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден или заблокирован.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    await revoke_refresh_token(refresh_token=stored_token)

    token_pair: TokenPair = await issue_token_pair(session, user=user)

    await session.commit()

    return token_pair


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token_data: RefreshTokenRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    token_hash = hash_refresh_token(token_data.refresh_token)

    stored_token = await get_refresh_token_by_hash(session, token_hash=token_hash)

    if stored_token is not None and stored_token.revoked_at is None:
        await revoke_refresh_token(refresh_token=stored_token)
        await session.commit()
