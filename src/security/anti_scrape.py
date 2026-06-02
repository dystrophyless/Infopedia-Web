from __future__ import annotations

import hashlib
from dataclasses import dataclass

from fastapi import HTTPException, Request, status

from src.config import settings
from src.redis_client import get_async_redis_client

_AUTOMATION_USER_AGENT_MARKERS = (
    "aiohttp",
    "curl/",
    "go-http-client",
    "headlesschrome",
    "httpclient",
    "httpx",
    "java/",
    "libwww-perl",
    "okhttp",
    "playwright",
    "puppeteer",
    "python-requests",
    "scrapy",
    "wget/",
)


@dataclass(frozen=True)
class RateLimitResult:
    remaining: int
    retry_after_seconds: int


class RateLimitExceededError(Exception):
    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Rate limit exceeded. Retry after {retry_after_seconds}s.")


RateLimitExceeded = RateLimitExceededError


def classify_user_agent(user_agent: str | None) -> str | None:
    normalized = (user_agent or "").strip().lower()
    if not normalized:
        return "missing_user_agent"

    if any(marker in normalized for marker in _AUTOMATION_USER_AGENT_MARKERS):
        return "automation_user_agent"

    return None


async def consume_rate_limit(
    redis,
    *,
    key: str,
    limit: int,
    window_seconds: int,
) -> RateLimitResult:
    current = await redis.incr(key)
    if current == 1:
        await redis.expire(key, window_seconds)

    if current > limit:
        ttl = await redis.ttl(key)
        retry_after = ttl if ttl and ttl > 0 else window_seconds
        raise RateLimitExceeded(retry_after)

    return RateLimitResult(
        remaining=max(limit - current, 0),
        retry_after_seconds=window_seconds,
    )


def build_rate_limit_key(
    *,
    scope: str,
    user_id: int | None,
    client_host: str,
    user_agent: str | None,
) -> str:
    identity = f"user:{user_id}" if user_id is not None else f"ip:{client_host}"
    fingerprint = hashlib.sha256(
        f"{identity}:{user_agent or ''}".encode(),
    ).hexdigest()[:24]
    return f"anti-scrape:{scope}:{fingerprint}"


async def enforce_anti_scrape(
    request: Request,
    *,
    scope: str,
    user_id: int | None = None,
    limit: int | None = None,
) -> None:
    if not settings.ANTI_SCRAPE_ENABLED:
        return

    user_agent = request.headers.get("user-agent")
    if settings.ANTI_SCRAPE_BLOCK_AUTOMATION_USER_AGENTS:
        reason = classify_user_agent(user_agent)
        if reason is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "anti_scrape_blocked",
                    "reason": reason,
                },
            )

    client_host = request.client.host if request.client else "unknown"
    redis = get_async_redis_client()
    try:
        await consume_rate_limit(
            redis,
            key=build_rate_limit_key(
                scope=scope,
                user_id=user_id,
                client_host=client_host,
                user_agent=user_agent,
            ),
            limit=limit or settings.ANTI_SCRAPE_AUTHENTICATED_LIMIT,
            window_seconds=settings.ANTI_SCRAPE_WINDOW_SECONDS,
        )
    except RateLimitExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "anti_scrape_rate_limited",
                "retry_after_seconds": exc.retry_after_seconds,
            },
            headers={"Retry-After": str(exc.retry_after_seconds)},
        ) from exc
    finally:
        await redis.aclose()
