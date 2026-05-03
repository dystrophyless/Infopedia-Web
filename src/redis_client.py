from redis import Redis
from redis.asyncio import Redis as AsyncRedis

from src.config import settings


def build_redis_url() -> str:
    auth = ""
    if settings.redis_username and settings.redis_password:
        auth = f"{settings.redis_username}:{settings.redis_password}@"
    elif settings.redis_password:
        auth = f":{settings.redis_password}@"

    return (
        f"redis://{auth}{settings.redis_host}:{settings.redis_port}/{settings.redis_db}"
    )


def get_sync_redis_client() -> Redis:
    return Redis.from_url(build_redis_url(), decode_responses=True)


def get_async_redis_client() -> AsyncRedis:
    return AsyncRedis.from_url(build_redis_url(), decode_responses=True)


def build_search_task_channel(task_id: str) -> str:
    return f"search-task:{task_id}"


def build_search_task_owner_key(task_id: str) -> str:
    return f"search-task-owner:{task_id}"
