import asyncio
import logging
import logging.config

from sqlalchemy.exc import SQLAlchemyError

from src.database import async_engine
from src.logging_settings import logging_config
from src.models import Base

logger = logging.getLogger(__name__)
logging.config.dictConfig(logging_config)


async def create_tables() -> None:
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.debug("Схема базы данных успешно инициализирована.")
    except SQLAlchemyError:
        logger.exception("Не удалось инициализировать схему базы данных.")
        raise
    except Exception:
        logger.exception("Непредвиденная ошибка при подготовке приложения.")
        raise


async def main() -> None:
    try:
        await create_tables()
    finally:
        await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
