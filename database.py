from config import settings
from connection import (
    get_async_engine,
    get_async_sessionmaker,
)

async_engine = get_async_engine(
    db_name=settings.postgres_db,
    host=settings.postgres_host,
    port=settings.postgres_port,
    user=settings.postgres_user,
    password=settings.postgres_password,
)

AsyncSessionMaker = get_async_sessionmaker(async_engine)


async def get_async_session():
    async with AsyncSessionMaker() as session:
        yield session
