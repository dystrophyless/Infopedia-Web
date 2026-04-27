import logging.config

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine

from connection import init_vector_extension_async
from logging_settings import logging_config
from models import Base

logger = logging.getLogger(__name__)
logging.config.dictConfig(logging_config)


async def create_tables(engine: AsyncEngine) -> None:
    try:
        await init_vector_extension_async(engine)

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        logger.debug(
            "Таблицы `users`, `user_feedback`, `activity`, `books`, `chapters`, "
            "`topic_codes`, `topics`, `terms`, `definitions`, `feature_usage` "
            "были успешно созданы",
        )

    except SQLAlchemyError:
        logger.exception("Ошибка связанная с базой данных")
        raise
    except Exception:
        logger.exception("Необработанная ошибка")
        raise
