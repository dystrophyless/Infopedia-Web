import asyncio
import logging
import logging.config

from sqlalchemy.exc import SQLAlchemyError

from src.database import (
    AsyncSessionMaker,
    async_engine,
)
from src.loader import (
    get_data_file_path,
    load_books_topics_and_mappings_core,
    load_chapters_and_topic_codes_core,
    load_terms_from_json_core,
    refresh_book_chapter_coverage_core,
)
from src.logging_settings import logging_config
from src.schema import initialize_schema
from src.terms.service import get_embedder
from src.tests.catalog_stats import publish_test_catalog_generation
from src.tests.question_loader import load_test_questions_core
from src.topics.chapter_seed import seed_chapter_catalog

logger = logging.getLogger(__name__)
logging.config.dictConfig(logging_config)


async def create_tables() -> None:
    try:
        await initialize_schema(async_engine)

        logger.debug("Схема базы данных успешно инициализирована.")
    except SQLAlchemyError:
        logger.exception("Не удалось инициализировать схему базы данных.")  # noqa: RUF001
        raise
    except Exception:
        logger.exception("Непредвиденная ошибка при подготовке приложения.")
        raise


async def main() -> None:
    try:
        await create_tables()

        async with AsyncSessionMaker() as session:
            await seed_chapter_catalog(session)
            await session.commit()
            embedder = get_embedder()

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
    finally:
        await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
