import asyncio
import logging
import sys

from connection import init_similarity_extension_async
from create_tables import create_tables
from database import AsyncSessionMaker, async_engine
from loader import (
    load_books_topics_and_mappings,
    load_chapters_and_topic_codes,
    load_terms_from_json,
)
from nlp import get_embedder

logger = logging.getLogger(__name__)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def main() -> None:
    try:
        embedder = get_embedder()

        await create_tables(async_engine)

        async with AsyncSessionMaker() as session:
            await load_chapters_and_topic_codes(session, "mappingStructure.json")
            logger.debug("Главы и коды тем успешно загружены в БД")

            await load_books_topics_and_mappings(session, "newStructure.json")
            logger.debug("Книги, темы и их связи успешно загружены в БД")

            await load_terms_from_json(session, embedder, "terms.json")
            logger.debug("Термины успешно загружены")

        await init_similarity_extension_async(async_engine)
    finally:
        await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
