import asyncio
import logging
import logging.config

from sqlalchemy.exc import SQLAlchemyError

import src.favorites.models
import src.tests.models  # noqa: F401 - register model before create_all
from src.database import (
    AsyncSessionMaker,
    async_engine,
    init_similarity_extension,
    init_vector_extension,
)
from src.loader import (
    get_data_file_path,
    load_books_topics_and_mappings_core,
    load_chapters_and_topic_codes_core,
    load_terms_from_json_core,
    refresh_book_chapter_coverage_core,
)
from src.logging_settings import logging_config
from src.migrations.chapter_migration import migrate_chapter_schema
from src.migrations.favorites_migration import migrate_favorites_schema
from src.migrations.tests_migration import migrate_tests_schema
from src.models import Base
from src.terms.service import get_embedder
from src.tests.catalog_stats import publish_test_catalog_generation
from src.tests.question_loader import load_test_questions_core

logger = logging.getLogger(__name__)
logging.config.dictConfig(logging_config)


async def create_tables() -> None:
    try:
        await init_vector_extension(async_engine)

        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        await migrate_chapter_schema(async_engine)
        await migrate_favorites_schema(async_engine)
        await migrate_tests_schema(async_engine)

        logger.debug("Схема базы данных успешно инициализирована.")
    except SQLAlchemyError:
        logger.exception("Не удалось инициализировать схему базы данных.")  # noqa: RUF001
        raise
    except Exception:
        logger.exception("Непредвиденная ошибка при подготовке приложения.")
        raise


async def main() -> None:
    try:
        embedder = get_embedder()
        await create_tables()

        async with AsyncSessionMaker() as session:
            async def load_all() -> None:
                await load_chapters_and_topic_codes_core(
                    session,
                    get_data_file_path("mappingStructure.json"),
                    get_data_file_path("topicCodeTranslations.json"),
                )
                await load_books_topics_and_mappings_core(session, get_data_file_path("newStructure.json"))
                await load_test_questions_core(session, get_data_file_path("questions.json"))
                await refresh_book_chapter_coverage_core(session)
                await load_terms_from_json_core(session, embedder, get_data_file_path("terms.json"))
                await publish_test_catalog_generation(session)

            if hasattr(session, "begin"):
                async with session.begin():
                    await load_all()
            else:
                await load_all()

        await init_similarity_extension(async_engine)
    finally:
        await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
