import asyncio
import logging
import logging.config

from sqlalchemy.exc import SQLAlchemyError

from src.database import (
    AsyncSessionMaker,
    async_engine,
    init_similarity_extension,
    init_vector_extension,
)
from src.loader import (
    get_data_file_path,
    load_books_topics_and_mappings,
    load_chapters_and_topic_codes,
    load_terms_from_json,
)
from src.logging_settings import logging_config
from src.models import Base
from src.terms.service import get_embedder

logger = logging.getLogger(__name__)
logging.config.dictConfig(logging_config)


async def create_tables() -> None:
    try:
        await init_vector_extension(async_engine)

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
        embedder = get_embedder()

        await create_tables()

        async with AsyncSessionMaker() as session:
            await load_chapters_and_topic_codes(
                session,
                get_data_file_path("mappingStructure.json"),
            )
            logger.debug("Главы и коды тем успешно загружены в БД")

            await load_books_topics_and_mappings(
                session,
                get_data_file_path("newStructure.json"),
            )
            logger.debug("Книги, темы и их связи успешно загружены в БД")

            await load_terms_from_json(
                session,
                embedder,
                get_data_file_path("terms.json"),
            )
            logger.debug("Термины успешно загружены")

        await init_similarity_extension(async_engine)
    finally:
        await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
