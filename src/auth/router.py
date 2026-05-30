from datetime import UTC, datetime, timedelta
from typing import Annotated

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.constants import GOOGLE_PROVIDER, PASSWORD_PROVIDER
from src.auth.emailer import (
    EmailDeliveryError,
    send_password_reset_email,
    send_verification_code,
)
from src.auth.models import PasswordResetToken, PendingUser
from src.auth.repository import (
    add_auth_identity,
    add_refresh_token,
    delete_all_reset_tokens_for_user,
    get_auth_identity_by_provider_subject,
    get_password_reset_token_by_hash,
    get_pending_user_by_email,
    get_refresh_token_by_hash,
    get_user_by_auth_identity,
    revoke_refresh_token,
)
from src.auth.schemas import (
    ForgotPasswordRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    VerifyEmailRequest,
)
from src.auth.utils import (
    GOOGLE_OAUTH_STATE_COOKIE,
    create_access_token,
    create_google_oauth_state,
    create_refresh_token,
    create_verification_code,
    generate_google_oauth_redirect_uri,
    generate_reset_token,
    get_refresh_token_expires_at,
    hash_password,
    hash_refresh_token,
    hash_reset_token,
    hash_verification_code,
    is_code_valid,
    verify_google_oauth_state,
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

GOOGLE_AUTH_FAILED_DETAIL = "Не удалось авторизоваться через Google."
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"
GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


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


async def exchange_google_authorization_code(code: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET.get_secret_value(),
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    return response.json()


async def fetch_google_token_info(id_token: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            GOOGLE_TOKEN_INFO_URL,
            params={"id_token": id_token},
        )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    token_info = response.json()

    if token_info.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    if token_info.get("iss") not in GOOGLE_ISSUERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    email_verified = token_info.get("email_verified")
    if email_verified not in {True, "true", "True"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    if not token_info.get("sub") or not token_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    return token_info


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
        send_verification_code(to_email=email, code=code)
    except EmailDeliveryError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось отправить код подтверждения.",
        )

    return {"message": "Код подтверждения отправлен на ваш email."}


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
            onboarding_completed=False,
        )
        if user.id is None:
            await session.flush()

        await add_auth_identity(
            session,
            user_id=user.id,
            provider=PASSWORD_PROVIDER,
            provider_subject=pending.email.lower(),
            email=pending.email.lower(),
            password_hash=pending.password_hash,
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
    email = form_data.username.lower()
    auth_identity = await get_auth_identity_by_provider_subject(
        session,
        provider=PASSWORD_PROVIDER,
        provider_subject=email,
    )

    user = auth_identity.user if auth_identity is not None else None
    password_hash = auth_identity.password_hash if auth_identity is not None else None

    if (
        not user
        or password_hash is None
        or not verify_password(form_data.password, password_hash)
    ):
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


@router.get("/google/url")
async def get_google_oauth_url():
    state = create_google_oauth_state()
    redirect_uri = generate_google_oauth_redirect_uri(state=state)

    response = RedirectResponse(url=redirect_uri, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        key=GOOGLE_OAUTH_STATE_COOKIE,
        value=state,
        max_age=settings.GOOGLE_OAUTH_STATE_TTL_SECONDS,
        httponly=True,
        secure=settings.FRONTEND_URL.startswith("https://"),
        samesite="lax",
    )

    return response


@router.get("/google/callback", response_model=TokenPair)
async def handle_google_oauth_callback(
    code: str,
    state: str,
    session: Annotated[AsyncSession, Depends(get_async_session)],
    google_oauth_state: Annotated[
        str | None,
        Cookie(alias=GOOGLE_OAUTH_STATE_COOKIE),
    ] = None,
):
    if (
        google_oauth_state is None
        or google_oauth_state != state
        or not verify_google_oauth_state(state)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    google_tokens = await exchange_google_authorization_code(code)
    id_token = google_tokens.get("id_token")
    if id_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GOOGLE_AUTH_FAILED_DETAIL,
        )

    token_info = await fetch_google_token_info(id_token)
    provider_subject = token_info["sub"]
    email = token_info["email"].lower()

    user = await get_user_by_auth_identity(
        session,
        provider=GOOGLE_PROVIDER,
        provider_subject=provider_subject,
    )

    if user is None:
        user = await get_user_by_email(session, email=email)

        if user is None:
            user = await add_user(
                session,
                username=None,
                email=email,
                onboarding_completed=False,
            )

        if user.id is None:
            await session.flush()

        await add_auth_identity(
            session,
            user_id=user.id,
            provider=GOOGLE_PROVIDER,
            provider_subject=provider_subject,
            email=email,
            password_hash=None,
        )

    if user.banned:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь заблокирован.",
            headers={"WWW-Authenticate": "Bearer"},
        )

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


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
    request_data: ForgotPasswordRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    user: User | None = await get_user_by_email(
        session, email=request_data.email.lower()
    )

    if user:
        auth_identity_exists: bool = await get_auth_identity_by_provider_subject(
            session,
            provider=PASSWORD_PROVIDER,
            provider_subject=request_data.email.lower(),
        )

        if auth_identity_exists:
            token = generate_reset_token()
            token_hash = hash_reset_token(token)
            expires_at = datetime.now(UTC) + timedelta(
                minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
            )

            try:
                send_password_reset_email(
                    to_email=user.email,
                    username=user.username or user.email,
                    reset_token=token,
                )
            except EmailDeliveryError:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Не удалось отправить письмо для сброса пароля.",
                )

            reset_token = PasswordResetToken(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )

            session.add(reset_token)
            await session.commit()

    return {
        "message": "Если пользователь с таким email существует, ему было отправлено письмо для сброса пароля."
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request_data: ResetPasswordRequest,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    token_hash = hash_reset_token(request_data.token)

    reset_token = await get_password_reset_token_by_hash(session, token_hash=token_hash)

    if not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или истекший токен сброса пароля.",
        )

    if reset_token.expires_at < datetime.now(UTC):
        await session.delete(reset_token)
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или истекший токен сброса пароля.",
        )

    user = await get_user_by_id(session, user_id=reset_token.user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или истекший токен сброса пароля.",
        )

    auth_identity = await get_auth_identity_by_provider_subject(
        session,
        provider=PASSWORD_PROVIDER,
        provider_subject=user.email.lower(),
    )
    if auth_identity is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Недействительный или истекший токен сброса пароля.",
        )

    auth_identity.password_hash = hash_password(request_data.new_password)

    await delete_all_reset_tokens_for_user(session, user_id=user.id)
    await session.commit()

    return {
        "message": "Пароль успешно сброшен. Теперь вы можете войти с новым паролем."
    }
