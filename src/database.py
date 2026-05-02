import logging
from urllib.parse import quote
from sqlalchemy import text
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine, async_sessionmaker

from src.config import settings


logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


def build_pg_conninfo(
    db_name: str,
    host: str,
    port: int,
    user: str,
    password: str,
) -> str:
    conninfo = (
        f"postgresql+psycopg://{quote(user, safe='')}:{quote(password, safe='')}"
        f"@{host}:{port}/{db_name}"
    )
    logger.debug(
        "Строка для подключения PostgreSQL была создана (пароль скрыт): "
        f"postgresql+psycopg://{quote(user, safe='')}@{host}:{port}/{db_name}",
    )
    return conninfo


async def log_db_version(engine: AsyncEngine) -> None:
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            db_version = result.scalar_one()
            logger.debug(f"Версия PostgreSQL: {db_version}")
    except Exception as e:
        logger.exception("Не удалось получить версию PostgreSQL: %s", e)


def get_async_engine(
    db_name: str,
    host: str,
    port: int,
    user: str,
    password: str,
    echo: bool = False,
    pool_size: int = 5,
    max_overflow: int = 10,
) -> AsyncEngine:
    conninfo = build_pg_conninfo(db_name, host, port, user, password)
    engine = create_async_engine(
        conninfo,
        echo=echo,
        pool_size=pool_size,
        max_overflow=max_overflow,
    )
    return engine


async_engine = get_async_engine(
    db_name=settings.postgres_db,
    host=settings.postgres_host,
    port=settings.postgres_port,
    user=settings.postgres_user,
    password=settings.postgres_password,
)

AsyncSessionMaker = async_sessionmaker(async_engine)


async def get_async_session():
    async with AsyncSessionMaker() as session:
        yield session
