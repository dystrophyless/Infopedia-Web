import asyncio
import logging
import logging.config

from sqlalchemy import text
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
            await conn.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_schema = current_schema()
                              AND table_name = 'user'
                              AND column_name = 'password_hash'
                        ) THEN
                            INSERT INTO auth_identity (
                                user_id,
                                provider,
                                provider_subject,
                                email,
                                password_hash
                            )
                            SELECT
                                "user".id,
                                'password',
                                lower("user".email),
                                lower("user".email),
                                "user".password_hash
                            FROM "user"
                            WHERE "user".password_hash IS NOT NULL
                            ON CONFLICT (provider, provider_subject)
                            DO UPDATE SET
                                email = EXCLUDED.email,
                                password_hash = EXCLUDED.password_hash;

                            ALTER TABLE "user" DROP COLUMN password_hash;
                        END IF;
                    END $$;
                    """
                ),
            )

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
