from fastapi import HTTPException, status

from src.config import settings
from src.redis_client import get_async_redis_client
from src.security.anti_scrape import RateLimitExceededError, consume_rate_limit


def build_password_attempt_key(user_id: int) -> str:
    return f"auth:password-attempts:user:{user_id}"


async def enforce_password_attempt_limit(user_id: int) -> None:
    redis = get_async_redis_client()
    try:
        try:
            await consume_rate_limit(
                redis,
                key=build_password_attempt_key(user_id),
                limit=settings.PASSWORD_ATTEMPT_LIMIT,
                window_seconds=settings.PASSWORD_ATTEMPT_WINDOW_SECONDS,
            )
        except RateLimitExceededError as exc:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "code": "password_attempt_rate_limited",
                    "retry_after_seconds": exc.retry_after_seconds,
                },
                headers={"Retry-After": str(exc.retry_after_seconds)},
            ) from exc
        except Exception as exc:
            # Password checks fail closed when the limiter backend is unavailable.
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail={"code": "password_attempt_limiter_unavailable"},
            ) from exc
    finally:
        await redis.aclose()
