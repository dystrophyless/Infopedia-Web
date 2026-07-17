import asyncio
import json
import logging
import re
from collections import defaultdict
from collections.abc import Iterable
from pathlib import Path

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.terms.models import (
    Definition,
    Term,
)
from src.topics.models import (
    Book,
    BookChapterCoverage,
    Chapter,
    ChapterAlias,
    ChapterTranslation,
    Topic,
    TopicCode,
    TopicCodeTranslation,
    TopicMapping,
)
from src.topics.chapter_catalog import load_chapter_catalog, normalize_chapter

DATA_DIR = Path(__file__).resolve().parent / "data"
TOPIC_CODE_RE = re.compile(r"^\s*(\d+(?:\.\d+)+)")
logger = logging.getLogger(__name__)


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


async def load_terms_from_json(session: AsyncSession, embedder, json_path: str):
    data = await asyncio.to_thread(_load_json_file, json_path)

    for term_name, books in data.items():
        query = select(Term).where(Term.name == term_name)
        result = await session.execute(query)

        term: Term = result.scalar_one_or_none()

        if not term:
            term: Term = Term(name=term_name)
            session.add(term)
            await session.flush()

        for book_key, defs in books.items():
            book_publisher, book_grade = parse_book_key(book_key)
            query = select(Book).where(
                Book.publisher == book_publisher,
                Book.grade == book_grade,
            )
            result = await session.execute(query)

            book: Book = result.scalar_one_or_none()

            if not book:
                raise ValueError(f"Book '{book_key}' не найден в таблице books")

            for d in defs:
                query = (
                    select(Topic)
                    .where(Topic.name == d["topic"])
                    .where(Topic.book_id == book.id)
                )
                result = await session.execute(query)

                topic: Topic = result.scalar_one_or_none()

                if not topic:
                    raise ValueError(f"Topic '{d['topic']}' не найден в таблице topics")

                query = select(Definition).where(
                    Definition.term_id == term.id,
                    Definition.topic_id == topic.id,
                    Definition.text == d["definition"],
                    Definition.page == d["page"],
                )
                result = await session.execute(query)

                definition: Definition = result.scalar_one_or_none()

                if not definition:
                    emb = (
                        await asyncio.to_thread(embedder.encode, d["definition"])
                    ).tolist()

                    definition: Definition = Definition(
                        text=d["definition"],
                        page=d["page"],
                        topic=topic,
                        term=term,
                        embedding=emb,
                    )
                    session.add(definition)

    await session.commit()


async def load_chapters_and_topic_codes(
    session: AsyncSession,
    json_path: str,
) -> None:
    data = await asyncio.to_thread(_load_json_file, json_path)

    try:
        titles_by_code: dict[str, str] = {}
        catalog = load_chapter_catalog()
        chapters_by_code: dict[str, Chapter] = {}

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
            chapters_by_code[code] = chapter

            for locale, title in catalog_item.get("translations", {}).items():
                translation_query = select(ChapterTranslation).where(
                    ChapterTranslation.chapter_id == chapter.id,
                    ChapterTranslation.locale == locale,
                )
                translation = (await session.execute(translation_query)).scalar_one_or_none()
                if translation is None:
                    session.add(ChapterTranslation(
                        chapter_id=chapter.id, locale=locale, title=title,
                    ))
                elif translation.title != title:
                    translation.title = title

            for locale, aliases in catalog_item.get("aliases", {}).items():
                for alias in aliases:
                    await _upsert_chapter_alias(session, chapter, locale, alias)

        for _, chapter_items in data.items():
            for item in chapter_items:
                chapter_name: str = (item.get("title") or "").strip()

                if not chapter_name:
                    continue

                chapter = await resolve_chapter_alias(session, chapter_name)
                await _upsert_chapter_alias(session, chapter, "kk", chapter_name)

                for locale, title in (("kk", chapter_name),):
                    translation_query = select(ChapterTranslation).where(
                        ChapterTranslation.chapter_id == chapter.id,
                        ChapterTranslation.locale == locale,
                    )
                    translation_result = await session.execute(translation_query)
                    translation = translation_result.scalar_one_or_none()
                    if translation is None:
                        session.add(ChapterTranslation(
                            chapter_id=chapter.id, locale=locale, title=title,
                        ))
                    elif translation.title != title:
                        translation.title = title

                for lesson_goal in item.get("lessonGoals", []):
                    parsed_lesson_goal = parse_lesson_goal(lesson_goal)
                    if parsed_lesson_goal is None:
                        logger.warning("Пропущен malformed lessonGoal: %r", lesson_goal)
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
                        topic_code: TopicCode = TopicCode(
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

                    translation_query = select(TopicCodeTranslation).where(
                        TopicCodeTranslation.topic_code_id == topic_code.id,
                        TopicCodeTranslation.locale == "kk",
                    )
                    translation_result = await session.execute(translation_query)
                    translation = translation_result.scalar_one_or_none()
                    if translation is None:
                        session.add(
                            TopicCodeTranslation(
                                topic_code_id=topic_code.id,
                                locale="kk",
                                title=title,
                            ),
                        )
                    elif translation.title != title:
                        translation.title = title

        await session.commit()

    except Exception:
        await session.rollback()
        raise


async def load_books_topics_and_mappings(
    session: AsyncSession,
    json_path: str,
) -> None:
    data = await asyncio.to_thread(_load_json_file, json_path)

    try:
        for book_key, book_data in data.items():
            book_publisher, book_grade = parse_book_key(book_key)
            query = select(Book).where(
                Book.publisher == book_publisher,
                Book.grade == book_grade,
            )
            result = await session.execute(query)

            book: Book = result.scalar_one_or_none()

            if not book:
                book: Book = Book(publisher=book_publisher, grade=book_grade)
                session.add(book)
                await session.flush()

            for topic_item in book_data.get("topics", []):
                topic_name: str = (topic_item.get("title") or "").strip()
                page_start: int = topic_item.get("page_start")
                page_end: int = topic_item.get("page_end")

                if not topic_name:
                    continue

                query = select(Topic).where(
                    Topic.book_id == book.id,
                    Topic.name == topic_name,
                )
                result = await session.execute(query)

                topic: Topic = result.scalar_one_or_none()

                if not topic:
                    topic = Topic(
                        name=topic_name,
                        page_start=page_start,
                        page_end=page_end,
                        book_id=book.id,
                    )
                    session.add(topic)
                    await session.flush()

                code_names_raw = topic_item.get("code_name", [])
                if isinstance(code_names_raw, str):
                    code_names_raw = [code_names_raw]

                for topic_code_name_raw in code_names_raw:
                    topic_code_name = normalize_topic_code_name(topic_code_name_raw)
                    if not topic_code_name:
                        continue

                    query = select(TopicCode).where(TopicCode.name == topic_code_name)
                    result = await session.execute(query)
                    topic_code: TopicCode = result.scalar_one_or_none()

                    if not topic_code:
                        topic_code: TopicCode = TopicCode(
                            name=topic_code_name,
                            chapter_id=None,
                        )
                        session.add(topic_code)
                        await session.flush()

                    query = select(TopicMapping).where(
                        TopicMapping.topic_id == topic.id,
                        TopicMapping.topic_code_id == topic_code.id,
                    )
                    result = await session.execute(query)

                    mapping: TopicMapping = result.scalar_one_or_none()

                    if not mapping:
                        session.add(
                            TopicMapping(
                                topic_id=topic.id,
                                topic_code_id=topic_code.id,
                            ),
                        )

        await session.commit()

    except Exception:
        await session.rollback()
        raise


async def _upsert_chapter_alias(
    session: AsyncSession,
    chapter: Chapter,
    locale: str,
    alias: str,
) -> ChapterAlias:
    normalized_alias = normalize_chapter(alias)
    if not normalized_alias:
        raise ValueError("Chapter alias cannot be empty")

    query = select(ChapterAlias).where(
        ChapterAlias.chapter_id == chapter.id,
        ChapterAlias.locale == locale,
        ChapterAlias.normalized_alias == normalized_alias,
    )
    existing = (await session.execute(query)).scalar_one_or_none()
    if existing is None:
        existing = ChapterAlias(
            chapter_id=chapter.id,
            locale=locale,
            alias=alias,
            normalized_alias=normalized_alias,
        )
        session.add(existing)
    elif existing.alias != alias:
        existing.alias = alias
    return existing


async def resolve_chapter_alias(
    session: AsyncSession,
    value: str,
) -> Chapter:
    normalized = normalize_chapter(value)
    if not normalized:
        raise ValueError("Chapter title cannot be empty")

    aliases = (await session.execute(
        select(ChapterAlias, Chapter)
        .join(Chapter, Chapter.id == ChapterAlias.chapter_id)
    )).all()

    exact = {chapter.id: chapter for alias, chapter in aliases if alias.normalized_alias == normalized}
    if len(exact) == 1:
        return next(iter(exact.values()))
    if len(exact) > 1:
        raise ValueError(f"Ambiguous chapter alias {value!r}")

    separators = (".", ":", ";", ",", "(", "-", "—")
    candidates: dict[int, Chapter] = {}
    for alias, chapter in aliases:
        alias_value = alias.normalized_alias
        if (
            normalized.startswith(alias_value)
            and normalized[len(alias_value):].lstrip().startswith(separators)
        ) or (
            alias_value.startswith(normalized)
            and alias_value[len(normalized):].lstrip().startswith(separators)
        ):
            candidates[chapter.id] = chapter

    if len(candidates) == 1:
        return next(iter(candidates.values()))
    if len(candidates) > 1:
        raise ValueError(f"Ambiguous chapter alias {value!r}")
    raise ValueError(f"Unknown chapter alias {value!r}")


async def refresh_book_chapter_coverage(session: AsyncSession) -> None:
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
        await session.commit()

    except Exception:
        await session.rollback()
        raise
