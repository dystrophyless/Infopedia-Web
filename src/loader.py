import asyncio
import json
import logging
import re
from collections import defaultdict
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import bindparam, delete, func, insert, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.terms.catalog import TermsCatalogV2, parse_terms_catalog_v2
from src.terms.models import (
    Definition,
    Term,
)
from src.tests.catalog_stats import publish_test_catalog_generation
from src.topics.chapter_catalog import load_chapter_catalog
from src.topics.models import (
    Book,
    BookChapterCoverage,
    Chapter,
    ChapterTranslation,
    Topic,
    TopicCode,
    TopicCodeTranslation,
    TopicMapping,
)
from src.topics.repository import resolve_chapter_by_title

DATA_DIR = Path(__file__).resolve().parent / "data"
TOPIC_CODE_RE = re.compile(r"^\s*(\d+(?:\.\d+)+)")
logger = logging.getLogger(__name__)

# SentenceTransformer receives a window of texts at once, then performs model
# forward passes internally using EMBEDDING_BATCH_SIZE. Keeping the two values
# separate gives us good GPU utilisation without retaining embeddings for the
# entire terms catalogue in memory.
EMBEDDING_BATCH_SIZE = 32
EMBEDDING_WINDOW_SIZE = 512
DEFINITION_EMBEDDING_DIMENSION = 1024


@dataclass(frozen=True, slots=True)
class _PendingDefinition:
    term_id: int
    name: str
    topic_id: int
    text: str
    page: int
    existing_definition_id: int | None = None


def _in_outer_transaction(session: AsyncSession) -> bool:
    """Avoid committing/rolling back when a caller owns an active transaction."""
    try:
        return bool(session.in_transaction())
    except (AttributeError, TypeError):
        return False


async def _publish_owned_catalog_generation(
    session: AsyncSession,
    *,
    owns_transaction: bool,
) -> None:
    if owns_transaction and hasattr(session, "get_bind"):
        await publish_test_catalog_generation(session)


def parse_book_key(book_key: str) -> tuple[str, int]:
    try:
        book_publisher, book_grade_str = book_key.split(": ", 1)
    except ValueError as exc:
        raise ValueError(f"Неверный формат ключа книги: {book_key!r}") from exc

    book_publisher = book_publisher.strip()
    if not book_publisher:
        raise ValueError(f"Неверный формат ключа книги: {book_key!r}")

    match = re.search(r"\d+", book_grade_str)
    if not match:
        raise ValueError(f"Не удалось извлечь класс из ключа книги: {book_key!r}")

    return book_publisher, int(match.group(0))


def normalize_topic_code_name(topic_code_name: str | None) -> str:
    topic_code_name = (topic_code_name or "").strip()
    match = TOPIC_CODE_RE.match(topic_code_name)

    if match:
        return match.group(1)

    return topic_code_name


def parse_lesson_goal(lesson_goal: str | None) -> tuple[str, str] | None:
    """Extract the stable topic code and its localized lesson-goal title."""
    if not isinstance(lesson_goal, str):
        return None

    value = lesson_goal.strip()
    match = TOPIC_CODE_RE.match(value)
    if not match:
        return None

    code = normalize_topic_code_name(match.group(1))
    title = value[match.end() :].strip()
    if not code or not title:
        return None
    return code, title


def validate_topic_code_translations(
    mapping_data: dict,
    translation_catalog: dict,
) -> dict[str, dict[str, str]]:
    """Validate topic-code translations against lesson goals without ORM access."""
    expected_titles_by_code: dict[str, str] = {}

    for chapter_items in mapping_data.values():
        for item in chapter_items:
            for lesson_goal in item.get("lessonGoals", []):
                parsed_lesson_goal = parse_lesson_goal(lesson_goal)
                if parsed_lesson_goal is None:
                    logger.warning(
                        "Пропущен некорректный lessonGoal: %r",
                        lesson_goal,
                    )
                    continue

                code, title = parsed_lesson_goal
                previous_title = expected_titles_by_code.get(code)
                if previous_title is not None and previous_title != title:
                    raise ValueError(
                        f"Конфликтующие kk titles для TopicCode '{code}': "
                        f"{previous_title!r} и {title!r}",
                    )
                expected_titles_by_code[code] = title

    if not isinstance(translation_catalog, dict):
        raise ValueError("TopicCodeTranslations catalog must be a dict")

    expected_codes = set(expected_titles_by_code)
    catalog_codes = set(translation_catalog)
    missing_codes = sorted(expected_codes - catalog_codes)
    extra_codes = sorted(catalog_codes - expected_codes)
    if missing_codes or extra_codes:
        raise ValueError(
            "TopicCodeTranslations codes do not match mapping: "
            f"missing={missing_codes}, extra={extra_codes}",
        )

    for code, translations in translation_catalog.items():
        if not isinstance(translations, dict) or set(translations) != {"kk", "ru"}:
            raise ValueError(
                f"TopicCodeTranslations[{code!r}] must contain exactly kk and ru",
            )

        kk = translations["kk"]
        ru = translations["ru"]
        if not isinstance(kk, str) or not kk.strip():
            raise ValueError(
                f"TopicCodeTranslations[{code!r}].kk must be a non-empty string",
            )
        if not isinstance(ru, str) or not ru.strip():
            raise ValueError(
                f"TopicCodeTranslations[{code!r}].ru must be a non-empty string",
            )
        if kk != expected_titles_by_code[code]:
            raise ValueError(
                f"TopicCodeTranslations[{code!r}].kk does not match mapping title",
            )

    return translation_catalog


def build_topic_code_translation_payload(
    topic_code_id: int,
    code: str,
    validated_catalog: dict[str, dict[str, str]],
) -> list[dict[str, int | str]]:
    """Build the two locale rows for an already validated topic-code catalog."""
    translations = validated_catalog[code]
    return [
        {
            "topic_code_id": topic_code_id,
            "locale": locale,
            "title": translations[locale],
        }
        for locale in ("kk", "ru")
    ]


def calculate_book_chapter_coverage_rows(
    rows: Iterable[tuple[int, int, int]],
) -> list[dict[str, int]]:
    normalized_rows: list[tuple[int, int, int]] = []
    total_topic_count_by_chapter: dict[int, int] = defaultdict(int)

    for chapter_id, book_id, topic_count in rows:
        normalized_topic_count = int(topic_count)
        if normalized_topic_count <= 0:
            continue

        normalized_chapter_id = int(chapter_id)
        normalized_book_id = int(book_id)
        normalized_rows.append(
            (normalized_chapter_id, normalized_book_id, normalized_topic_count),
        )
        total_topic_count_by_chapter[normalized_chapter_id] += normalized_topic_count

    coverage_rows: list[dict[str, int]] = []
    for chapter_id, book_id, topic_count in normalized_rows:
        total_topic_count = total_topic_count_by_chapter[chapter_id]
        if total_topic_count <= 0:
            continue

        coverage_rows.append(
            {
                "chapter_id": chapter_id,
                "book_id": book_id,
                "topic_count": topic_count,
                "percentage": round((topic_count / total_topic_count) * 100),
            },
        )

    return coverage_rows


def get_data_file_path(file_name: str) -> Path:
    return DATA_DIR / file_name


def _load_json_file(json_path: str | Path):
    with open(json_path, encoding="utf-8") as file:
        return json.load(file)


def _windowed[T](items: Sequence[T], size: int) -> Iterable[Sequence[T]]:
    if size <= 0:
        raise ValueError("Batch/window size must be positive")
    for start in range(0, len(items), size):
        yield items[start : start + size]


async def _encode_definition_window(
    embedder,
    texts: Sequence[str],
) -> list[list[float]]:
    """Encode many definition texts in one SentenceTransformer call."""
    if not texts:
        return []

    text_batch = list(texts)

    def encode_sync():
        return embedder.encode(
            text_batch,
            batch_size=EMBEDDING_BATCH_SIZE,
            convert_to_numpy=True,
            normalize_embeddings=False,
            show_progress_bar=False,
        )

    raw_embeddings = await asyncio.to_thread(encode_sync)

    if len(raw_embeddings) != len(text_batch):
        raise RuntimeError(
            "Embedder вернул неожиданное количество векторов: "
            f"expected={len(text_batch)}, actual={len(raw_embeddings)}",
        )

    embeddings: list[list[float]] = []
    for index, raw_embedding in enumerate(raw_embeddings):
        if hasattr(raw_embedding, "tolist"):
            embedding = raw_embedding.tolist()
        else:
            embedding = list(raw_embedding)

        if len(embedding) != DEFINITION_EMBEDDING_DIMENSION:
            raise ValueError(
                "Неверная размерность embedding для definition "
                f"#{index}: expected={DEFINITION_EMBEDDING_DIMENSION}, "
                f"actual={len(embedding)}",
            )

        embeddings.append(embedding)

    return embeddings


async def _persist_definition_window(
    session: AsyncSession,
    pending: Sequence[_PendingDefinition],
    embeddings: Sequence[list[float]],
) -> tuple[int, int]:
    """Bulk-insert new definitions and bulk-backfill missing embeddings."""
    if len(pending) != len(embeddings):
        raise RuntimeError("Definition metadata/embedding count mismatch")

    insert_rows: list[dict] = []
    update_rows: list[dict] = []

    for definition, embedding in zip(pending, embeddings, strict=True):
        if definition.existing_definition_id is None:
            insert_rows.append(
                {
                    "term_id": definition.term_id,
                    "name": definition.name,
                    "topic_id": definition.topic_id,
                    "text": definition.text,
                    "page": definition.page,
                    "embedding": embedding,
                },
            )
        else:
            update_rows.append(
                {
                    "_definition_id": definition.existing_definition_id,
                    "_embedding": embedding,
                },
            )

    if insert_rows:
        await session.execute(insert(Definition), insert_rows)

    if update_rows:
        definition_table = Definition.__table__
        statement = (
            update(definition_table)
            .where(definition_table.c.id == bindparam("_definition_id"))
            .values(embedding=bindparam("_embedding"))
        )
        await session.execute(statement, update_rows)

    return len(insert_rows), len(update_rows)


def _collect_term_requirements(
    catalog: TermsCatalogV2,
) -> tuple[dict[str, tuple[str, int]], set[tuple[str, int, str]]]:
    parsed_book_keys: dict[str, tuple[str, int]] = {}
    required_topic_specs: set[tuple[str, int, str]] = set()

    for item in catalog.definitions:
        book_spec = parsed_book_keys.setdefault(
            item.book_key,
            parse_book_key(item.book_key),
        )
        publisher, grade = book_spec
        required_topic_specs.add((publisher, grade, item.topic_name))

    return parsed_book_keys, required_topic_specs


async def _resolve_term_books_and_topics(
    session: AsyncSession,
    parsed_book_keys: dict[str, tuple[str, int]],
    required_topic_specs: set[tuple[str, int, str]],
) -> tuple[dict[str, Book], dict[tuple[int, str], Topic]]:
    publishers = {publisher for publisher, _ in parsed_book_keys.values()}
    grades = {grade for _, grade in parsed_book_keys.values()}

    book_result = await session.execute(
        select(Book).where(
            Book.publisher.in_(publishers),
            Book.grade.in_(grades),
        ),
    )
    books_by_spec = {
        (book.publisher, book.grade): book
        for book in book_result.scalars().all()
    }

    books_by_source_key: dict[str, Book] = {}
    for source_key, book_spec in parsed_book_keys.items():
        book = books_by_spec.get(book_spec)
        if book is None:
            raise ValueError(f"Book '{source_key}' не найден в таблице books")
        books_by_source_key[source_key] = book

    requested_book_ids = {book.id for book in books_by_source_key.values()}
    requested_topic_names = {
        topic_name
        for _, _, topic_name in required_topic_specs
    }

    if not requested_topic_names:
        return books_by_source_key, {}

    topic_result = await session.execute(
        select(Topic).where(
            Topic.book_id.in_(requested_book_ids),
            Topic.name.in_(requested_topic_names),
        ),
    )
    topics_by_key = {
        (topic.book_id, topic.name): topic
        for topic in topic_result.scalars().all()
    }

    for publisher, grade, topic_name in required_topic_specs:
        book = books_by_spec[(publisher, grade)]
        if (book.id, topic_name) not in topics_by_key:
            raise ValueError(
                f"Topic '{topic_name}' не найден в таблице topics "
                f"для книги '{publisher}: {grade}'",
            )

    return books_by_source_key, topics_by_key


async def _resolve_terms_by_name(
    session: AsyncSession,
    term_names: Sequence[str],
) -> dict[str, Term]:
    term_result = await session.execute(
        select(Term).where(Term.name.in_(term_names)),
    )
    terms_by_name = {term.name: term for term in term_result.scalars().all()}

    missing_terms = [
        Term(name=term_name)
        for term_name in term_names
        if term_name not in terms_by_name
    ]
    if missing_terms:
        session.add_all(missing_terms)
        await session.flush()
        terms_by_name.update({term.name: term for term in missing_terms})

    return terms_by_name


async def _load_existing_definition_states(
    session: AsyncSession,
    term_ids: set[int],
    topic_ids: set[int],
) -> dict[tuple[int, str, int, str, int], tuple[int, bool]]:
    if not term_ids or not topic_ids:
        return {}

    # Do not SELECT Definition itself: that would transfer every 1024-float
    # vector from PostgreSQL just to decide whether a row already exists.
    result = await session.execute(
        select(
            Definition.id,
            Definition.term_id,
            Definition.name,
            Definition.topic_id,
            Definition.text,
            Definition.page,
            Definition.embedding.is_not(None).label("has_embedding"),
        ).where(
            Definition.term_id.in_(term_ids),
            Definition.topic_id.in_(topic_ids),
        ),
    )
    return {
        (row.term_id, row.name, row.topic_id, row.text, row.page): (
            row.id,
            bool(row.has_embedding),
        )
        for row in result.all()
    }


def _build_pending_definitions(
    catalog: TermsCatalogV2,
    terms_by_name: dict[str, Term],
    books_by_source_key: dict[str, Book],
    topics_by_key: dict[tuple[int, str], Topic],
    existing_definitions: dict[tuple[int, str, int, str, int], tuple[int, bool]],
) -> tuple[list[_PendingDefinition], int, int, int]:
    pending: list[_PendingDefinition] = []
    seen_keys = set(existing_definitions)
    scheduled_embedding_keys: set[tuple[int, str, int, str, int]] = set()
    skipped_existing = 0
    backfill_count = 0
    new_count = 0

    for item in catalog.definitions:
        term = terms_by_name[item.canonical_name]
        book = books_by_source_key[item.book_key]
        topic = topics_by_key[(book.id, item.topic_name)]
        definition_key = (term.id, item.source_name, topic.id, item.text, item.page)
        existing = existing_definitions.get(definition_key)

        if existing is not None:
            definition_id, has_embedding = existing
            if has_embedding or definition_key in scheduled_embedding_keys:
                skipped_existing += 1
                continue

            scheduled_embedding_keys.add(definition_key)
            pending.append(
                _PendingDefinition(
                    term_id=term.id,
                    name=item.source_name,
                    topic_id=topic.id,
                    text=item.text,
                    page=item.page,
                    existing_definition_id=definition_id,
                ),
            )
            backfill_count += 1
            continue

        if definition_key in seen_keys:
            skipped_existing += 1
            continue

        seen_keys.add(definition_key)
        scheduled_embedding_keys.add(definition_key)
        pending.append(
            _PendingDefinition(
                term_id=term.id,
                name=item.source_name,
                topic_id=topic.id,
                text=item.text,
                page=item.page,
            ),
        )
        new_count += 1

    return pending, new_count, backfill_count, skipped_existing


async def _embed_and_persist_definitions(
    session: AsyncSession,
    embedder,
    pending: Sequence[_PendingDefinition],
) -> tuple[int, int]:
    inserted_total = 0
    updated_total = 0
    processed_total = 0

    for window in _windowed(pending, EMBEDDING_WINDOW_SIZE):
        embeddings = await _encode_definition_window(
            embedder,
            [definition.text for definition in window],
        )
        inserted, updated = await _persist_definition_window(
            session,
            window,
            embeddings,
        )
        inserted_total += inserted
        updated_total += updated
        processed_total += len(window)

        logger.info(
            "Embeddings обработаны: %d/%d definitions",
            processed_total,
            len(pending),
        )

    return inserted_total, updated_total


async def _load_terms_from_json_impl(
    session: AsyncSession,
    embedder,
    json_path: str | Path,
) -> None:
    """Load terms using bulk lookups, batched inference and bulk writes."""
    raw_data = await asyncio.to_thread(_load_json_file, json_path)
    catalog = parse_terms_catalog_v2(raw_data)
    if not catalog.canonical_names:
        logger.info("Файл терминов пуст: %s", json_path)
        return

    parsed_book_keys, required_topic_specs = _collect_term_requirements(catalog)
    books_by_source_key, topics_by_key = await _resolve_term_books_and_topics(
        session,
        parsed_book_keys,
        required_topic_specs,
    )
    terms_by_name = await _resolve_terms_by_name(session, catalog.canonical_names)
    existing_definitions = await _load_existing_definition_states(
        session,
        {term.id for term in terms_by_name.values()},
        {topic.id for topic in topics_by_key.values()},
    )
    pending, new_count, backfill_count, skipped_existing = (
        _build_pending_definitions(
            catalog,
            terms_by_name,
            books_by_source_key,
            topics_by_key,
            existing_definitions,
        )
    )

    if not pending:
        logger.info(
            "Термины уже актуальны: %d definition пропущено, embeddings не требуются",
            skipped_existing,
        )
        return

    logger.info(
        "Подготовка embeddings: всего=%d, новых=%d, backfill=%d, уже существуют=%d, "
        "model_batch=%d, window=%d",
        len(pending),
        new_count,
        backfill_count,
        skipped_existing,
        EMBEDDING_BATCH_SIZE,
        EMBEDDING_WINDOW_SIZE,
    )

    inserted_total, updated_total = await _embed_and_persist_definitions(
        session,
        embedder,
        pending,
    )
    logger.info(
        "Загрузка терминов завершена: inserted=%d, embeddings_backfilled=%d, skipped=%d",
        inserted_total,
        updated_total,
        skipped_existing,
    )


async def load_terms_from_json(
    session: AsyncSession,
    embedder,
    json_path: str | Path,
    *,
    manage_transaction: bool = True,
) -> None:
    owns_transaction = manage_transaction and not _in_outer_transaction(session)
    try:
        await _load_terms_from_json_impl(session, embedder, json_path)
        if owns_transaction:
            await _publish_owned_catalog_generation(session, owns_transaction=True)
            await session.commit()
    except Exception:
        if owns_transaction:
            await session.rollback()
        raise


async def _load_chapters_and_topic_codes_impl(
    session: AsyncSession,
    data: dict,
    validated_catalog: dict[str, dict[str, str]],
) -> None:
    # This path is intentionally conservative because chapter resolution has
    # ambiguity semantics covered by repository-level tests. The expensive
    # 5000+ row hot path is the terms loader above.
    titles_by_code: dict[str, str] = {}
    processed_codes: set[str] = set()
    catalog = load_chapter_catalog()
    for catalog_item in catalog:
        code = str(catalog_item["code"]).strip()
        if not code:
            raise ValueError("Chapter catalog contains an empty code")

        result = await session.execute(select(Chapter).where(Chapter.code == code))
        chapter = result.scalar_one_or_none()
        if chapter is None:
            chapter = Chapter(code=code)
            session.add(chapter)
            await session.flush()
        for locale, title in catalog_item.get("translations", {}).items():
            translation_query = select(ChapterTranslation).where(
                ChapterTranslation.chapter_id == chapter.id,
                ChapterTranslation.locale == locale,
            )
            translation = (
                await session.execute(translation_query)
            ).scalar_one_or_none()
            if translation is None:
                session.add(
                    ChapterTranslation(
                        chapter_id=chapter.id,
                        locale=locale,
                        title=title,
                    ),
                )
            elif translation.title != title:
                translation.title = title

    for _, chapter_items in data.items():
        for item in chapter_items:
            chapter_name: str = (item.get("title") or "").strip()

            if not chapter_name:
                continue

            chapter = await resolve_chapter_by_title(session, chapter_name)

            for lesson_goal in item.get("lessonGoals", []):
                parsed_lesson_goal = parse_lesson_goal(lesson_goal)
                if parsed_lesson_goal is None:
                    logger.warning(
                        "Пропущен некорректный lessonGoal: %r",
                        lesson_goal,
                    )
                    continue

                topic_code_name, title = parsed_lesson_goal

                previous_title = titles_by_code.get(topic_code_name)
                if previous_title is not None and previous_title != title:
                    raise ValueError(
                        f"Конфликтующие kk titles для TopicCode '{topic_code_name}': "
                        f"{previous_title!r} и {title!r}",
                    )
                titles_by_code[topic_code_name] = title

                if not topic_code_name:
                    continue

                query = select(TopicCode).where(TopicCode.name == topic_code_name)
                result = await session.execute(query)

                topic_code: TopicCode = result.scalar_one_or_none()

                if not topic_code:
                    topic_code = TopicCode(
                        name=topic_code_name,
                        chapter_id=chapter.id,
                    )
                    session.add(topic_code)
                    await session.flush()
                elif topic_code.chapter_id is None:
                    topic_code.chapter_id = chapter.id
                elif topic_code.chapter_id != chapter.id:
                    raise ValueError(
                        f"TopicCode '{topic_code_name}' уже связан с другим chapter_id="
                        f"{topic_code.chapter_id}, но в JSON встретился в chapter "
                        f"'{chapter_name}' (id={chapter.id})",
                    )

                if topic_code_name in processed_codes:
                    continue

                for translation_payload in build_topic_code_translation_payload(
                    topic_code.id,
                    topic_code_name,
                    validated_catalog,
                ):
                    translation_query = select(TopicCodeTranslation).where(
                        TopicCodeTranslation.topic_code_id == topic_code.id,
                        TopicCodeTranslation.locale == translation_payload["locale"],
                    )
                    translation_result = await session.execute(translation_query)
                    translation = translation_result.scalar_one_or_none()
                    if translation is None:
                        session.add(TopicCodeTranslation(**translation_payload))
                    elif translation.title != translation_payload["title"]:
                        translation.title = translation_payload["title"]

                processed_codes.add(topic_code_name)


async def load_chapters_and_topic_codes(
    session: AsyncSession,
    json_path: str | Path,
    translations_json_path: str | Path,
    *,
    manage_transaction: bool = True,
) -> None:
    owns_transaction = manage_transaction and not _in_outer_transaction(session)
    data = await asyncio.to_thread(_load_json_file, json_path)
    translation_catalog = await asyncio.to_thread(
        _load_json_file,
        translations_json_path,
    )
    validated_catalog = validate_topic_code_translations(data, translation_catalog)

    try:
        await _load_chapters_and_topic_codes_impl(
            session,
            data,
            validated_catalog,
        )
        if owns_transaction:
            await _publish_owned_catalog_generation(session, owns_transaction=True)
            await session.commit()

    except Exception:
        if owns_transaction:
            await session.rollback()
        raise


async def _load_books_topics_and_mappings_impl(
    session: AsyncSession,
    data: dict,
) -> None:
    """Bulk-resolve books/topics/topic-codes and create only missing mappings."""
    parsed_books: dict[str, tuple[str, int]] = {
        book_key: parse_book_key(book_key)
        for book_key in data
    }

    if not parsed_books:
        return

    publishers = {publisher for publisher, _ in parsed_books.values()}
    grades = {grade for _, grade in parsed_books.values()}
    book_result = await session.execute(
        select(Book).where(
            Book.publisher.in_(publishers),
            Book.grade.in_(grades),
        ),
    )
    books_by_spec = {
        (book.publisher, book.grade): book
        for book in book_result.scalars().all()
    }

    requested_book_specs = set(parsed_books.values())
    missing_books = [
        Book(publisher=publisher, grade=grade)
        for publisher, grade in requested_book_specs
        if (publisher, grade) not in books_by_spec
    ]
    if missing_books:
        session.add_all(missing_books)
        await session.flush()
        books_by_spec.update(
            {(book.publisher, book.grade): book for book in missing_books},
        )

    books_by_source_key = {
        source_key: books_by_spec[book_spec]
        for source_key, book_spec in parsed_books.items()
    }

    desired_topics: dict[tuple[int, str], dict] = {}
    desired_code_names: set[str] = set()

    for book_key, book_data in data.items():
        book = books_by_source_key[book_key]
        for topic_item in book_data.get("topics", []):
            topic_name = (topic_item.get("title") or "").strip()
            if not topic_name:
                continue

            desired_topics.setdefault(
                (book.id, topic_name),
                {
                    "book": book,
                    "name": topic_name,
                    "page_start": topic_item.get("page_start"),
                    "page_end": topic_item.get("page_end"),
                    "code_names": [],
                },
            )

            code_names_raw = topic_item.get("code_name", [])
            if isinstance(code_names_raw, str):
                code_names_raw = [code_names_raw]

            normalized_codes = [
                code
                for raw_code in code_names_raw
                if (code := normalize_topic_code_name(raw_code))
            ]
            desired_topics[(book.id, topic_name)]["code_names"].extend(
                normalized_codes,
            )
            desired_code_names.update(normalized_codes)

    book_ids = {book.id for book in books_by_source_key.values()}
    topic_names = {name for _, name in desired_topics}
    if topic_names:
        topic_result = await session.execute(
            select(Topic).where(
                Topic.book_id.in_(book_ids),
                Topic.name.in_(topic_names),
            ),
        )
        topics_by_key = {
            (topic.book_id, topic.name): topic
            for topic in topic_result.scalars().all()
        }
    else:
        topics_by_key = {}

    missing_topics = [
        Topic(
            name=payload["name"],
            page_start=payload["page_start"],
            page_end=payload["page_end"],
            book_id=payload["book"].id,
        )
        for key, payload in desired_topics.items()
        if key not in topics_by_key
    ]
    if missing_topics:
        session.add_all(missing_topics)
        await session.flush()
        topics_by_key.update(
            {(topic.book_id, topic.name): topic for topic in missing_topics},
        )

    if desired_code_names:
        topic_code_result = await session.execute(
            select(TopicCode).where(TopicCode.name.in_(desired_code_names)),
        )
        topic_codes_by_name = {
            topic_code.name: topic_code
            for topic_code in topic_code_result.scalars().all()
        }
    else:
        topic_codes_by_name = {}

    missing_topic_codes = [
        TopicCode(name=code_name, chapter_id=None)
        for code_name in desired_code_names
        if code_name not in topic_codes_by_name
    ]
    if missing_topic_codes:
        session.add_all(missing_topic_codes)
        await session.flush()
        topic_codes_by_name.update(
            {topic_code.name: topic_code for topic_code in missing_topic_codes},
        )

    relevant_topic_ids = {topic.id for topic in topics_by_key.values()}
    relevant_topic_code_ids = {
        topic_code.id for topic_code in topic_codes_by_name.values()
    }

    if relevant_topic_ids and relevant_topic_code_ids:
        mapping_result = await session.execute(
            select(
                TopicMapping.topic_id,
                TopicMapping.topic_code_id,
            ).where(
                TopicMapping.topic_id.in_(relevant_topic_ids),
                TopicMapping.topic_code_id.in_(relevant_topic_code_ids),
            ),
        )
        existing_mapping_keys = {
            (row.topic_id, row.topic_code_id)
            for row in mapping_result.all()
        }
    else:
        existing_mapping_keys = set()

    new_mappings: list[TopicMapping] = []
    for topic_key, payload in desired_topics.items():
        topic = topics_by_key[topic_key]
        for code_name in dict.fromkeys(payload["code_names"]):
            topic_code = topic_codes_by_name[code_name]
            mapping_key = (topic.id, topic_code.id)
            if mapping_key in existing_mapping_keys:
                continue
            existing_mapping_keys.add(mapping_key)
            new_mappings.append(
                TopicMapping(
                    topic_id=topic.id,
                    topic_code_id=topic_code.id,
                ),
            )

    if new_mappings:
        session.add_all(new_mappings)

    logger.info(
        "Books/topics/mappings актуализированы: books_created=%d, topics_created=%d, "
        "topic_codes_created=%d, mappings_created=%d",
        len(missing_books),
        len(missing_topics),
        len(missing_topic_codes),
        len(new_mappings),
    )


async def load_books_topics_and_mappings(
    session: AsyncSession,
    json_path: str | Path,
    *,
    manage_transaction: bool = True,
) -> None:
    owns_transaction = manage_transaction and not _in_outer_transaction(session)
    data = await asyncio.to_thread(_load_json_file, json_path)

    try:
        await _load_books_topics_and_mappings_impl(session, data)
        if owns_transaction:
            await _publish_owned_catalog_generation(session, owns_transaction=True)
            await session.commit()

    except Exception:
        if owns_transaction:
            await session.rollback()
        raise


async def refresh_book_chapter_coverage(
    session: AsyncSession,
    *,
    manage_transaction: bool = True,
) -> None:
    owns_transaction = manage_transaction and not _in_outer_transaction(session)
    matching_topics = (
        select(
            TopicCode.chapter_id.label("chapter_id"),
            Topic.id.label("topic_id"),
            Topic.book_id.label("book_id"),
        )
        .select_from(Topic)
        .join(TopicMapping, TopicMapping.topic_id == Topic.id)
        .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
        .where(TopicCode.chapter_id.is_not(None))
        .distinct()
        .subquery()
    )

    coverage_query = (
        select(
            matching_topics.c.chapter_id,
            matching_topics.c.book_id,
            func.count(matching_topics.c.topic_id).label("topic_count"),
        )
        .group_by(matching_topics.c.chapter_id, matching_topics.c.book_id)
        .order_by(
            matching_topics.c.chapter_id.asc(),
            func.count(matching_topics.c.topic_id).desc(),
            matching_topics.c.book_id.asc(),
        )
    )

    try:
        result = await session.execute(coverage_query)
        coverage_rows = calculate_book_chapter_coverage_rows(
            (chapter_id, book_id, topic_count)
            for chapter_id, book_id, topic_count in result.all()
        )

        await session.execute(delete(BookChapterCoverage))
        session.add_all(
            BookChapterCoverage(**coverage_row)
            for coverage_row in coverage_rows
        )
        if owns_transaction:
            await session.commit()

    except Exception:
        if owns_transaction:
            await session.rollback()
        raise


async def load_chapters_and_topic_codes_core(
    session: AsyncSession,
    json_path: str | Path,
    translations_json_path: str | Path,
) -> None:
    await load_chapters_and_topic_codes(
        session,
        json_path,
        translations_json_path,
        manage_transaction=False,
    )


async def load_books_topics_and_mappings_core(
    session: AsyncSession,
    json_path: str | Path,
) -> None:
    await load_books_topics_and_mappings(
        session,
        json_path,
        manage_transaction=False,
    )


async def refresh_book_chapter_coverage_core(session: AsyncSession) -> None:
    await refresh_book_chapter_coverage(session, manage_transaction=False)


async def load_terms_from_json_core(
    session: AsyncSession,
    embedder,
    json_path: str | Path,
) -> None:
    await load_terms_from_json(
        session,
        embedder,
        json_path,
        manage_transaction=False,
    )
