from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

from src.security.anti_scrape import RateLimitExceededError
from src.security.password_attempts import (
    build_password_attempt_key,
    enforce_password_attempt_limit,
)


class FakeRedis:
    def __init__(self) -> None:
        self.aclose = AsyncMock()


@pytest.mark.asyncio
async def test_password_attempt_key_is_user_scoped_only() -> None:
    assert build_password_attempt_key(42) == "auth:password-attempts:user:42"


@pytest.mark.asyncio
async def test_limit_uses_configured_window_and_closes_client() -> None:
    redis = FakeRedis()
    with (
        patch("src.security.password_attempts.get_async_redis_client", return_value=redis),
        patch("src.security.password_attempts.consume_rate_limit", new_callable=AsyncMock) as consume,
    ):
        await enforce_password_attempt_limit(42)

    consume.assert_awaited_once()
    kwargs = consume.await_args.kwargs
    assert kwargs["key"] == "auth:password-attempts:user:42"
    assert kwargs["limit"] == 10
    assert kwargs["window_seconds"] == 60
    redis.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_rate_limit_maps_to_429_retry_after_and_closes() -> None:
    redis = FakeRedis()
    with (
        patch("src.security.password_attempts.get_async_redis_client", return_value=redis),
        patch(
            "src.security.password_attempts.consume_rate_limit",
            new=AsyncMock(side_effect=RateLimitExceededError(17)),
        ),
    ):
        with pytest.raises(HTTPException) as raised:
            await enforce_password_attempt_limit(7)

    assert raised.value.status_code == 429
    assert raised.value.headers == {"Retry-After": "17"}
    assert raised.value.detail == {"code": "password_attempt_rate_limited", "retry_after_seconds": 17}
    redis.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_redis_failure_fails_closed_and_closes() -> None:
    redis = FakeRedis()
    with (
        patch("src.security.password_attempts.get_async_redis_client", return_value=redis),
        patch(
            "src.security.password_attempts.consume_rate_limit",
            new=AsyncMock(side_effect=RuntimeError("redis unavailable")),
        ),
    ):
        with pytest.raises(HTTPException) as raised:
            await enforce_password_attempt_limit(7)

    assert raised.value.status_code == 503
    assert raised.value.detail == {"code": "password_attempt_limiter_unavailable"}
    redis.aclose.assert_awaited_once()
