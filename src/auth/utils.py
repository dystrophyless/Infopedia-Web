import hashlib
import hmac
import secrets
import urllib.parse
from datetime import UTC, datetime, timedelta

import jwt
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash

from src.config import settings

password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


def create_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_verification_code(email: str, code: str) -> str:
    normalized_email = email.strip().lower()

    message = f"{normalized_email}:{code}".encode()

    secret = settings.SECRET_KEY.get_secret_value().encode()

    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def is_code_valid(email: str, code: str, code_hash: str) -> bool:
    expected_hash = hash_verification_code(email, code)
    return hmac.compare_digest(expected_hash, code_hash)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()

    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY.get_secret_value(),
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


def verify_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY.get_secret_value(),
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.InvalidTokenError:
        return None
    else:
        return payload.get("sub")


def create_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    secret = settings.SECRET_KEY.get_secret_value().encode()

    return hmac.new(secret, token.encode(), hashlib.sha256).hexdigest()


def get_refresh_token_expires_at() -> datetime:
    return datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def create_google_oauth_state() -> str:
    nonce = secrets.token_urlsafe(32)
    expires_at = int(
        (
            datetime.now(UTC)
            + timedelta(seconds=settings.GOOGLE_OAUTH_STATE_TTL_SECONDS)
        ).timestamp(),
    )
    message = f"{nonce}.{expires_at}"
    signature = hmac.new(
        settings.SECRET_KEY.get_secret_value().encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    return f"{message}.{signature}"


def verify_google_oauth_state(state: str) -> bool:
    parts = state.split(".")
    if len(parts) != 3:
        return False

    nonce, expires_at_raw, signature = parts

    try:
        expires_at = int(expires_at_raw)
    except ValueError:
        return False

    if datetime.now(UTC).timestamp() > expires_at:
        return False

    message = f"{nonce}.{expires_at}"
    expected_signature = hmac.new(
        settings.SECRET_KEY.get_secret_value().encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)


def generate_google_oauth_redirect_uri(state: str | None = None) -> str:
    state = state or create_google_oauth_state()
    query_params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }

    base_url = "https://accounts.google.com/o/oauth2/v2/auth"

    query_string = urllib.parse.urlencode(query_params, quote_via=urllib.parse.quote)

    return f"{base_url}?{query_string}"
