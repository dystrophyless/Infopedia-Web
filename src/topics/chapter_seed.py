"""Idempotent bootstrap seed for the canonical chapter catalog."""

# ruff: noqa: D202, D213

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.topics.chapter_catalog import load_chapter_catalog
from src.topics.models import Chapter, ChapterTranslation


@dataclass(frozen=True, slots=True)
class ChapterSeedResult:
    inserted_chapters: int
    updated_translations: int
    inserted_translations: int


async def seed_chapter_catalog(session: AsyncSession) -> ChapterSeedResult:
    """Insert missing catalog rows and update only catalog-owned translations.

    Existing chapters outside the catalog and translations for other locales
    are intentionally preserved.  Repeating the seed is a no-op once the
    catalog values match.
    """

    catalog = load_chapter_catalog()
    codes = [str(item["code"]).strip() for item in catalog]
    if not codes or any(not code for code in codes) or len(set(codes)) != len(codes):
        raise ValueError("chapter catalog contains missing or duplicate codes")

    existing = {
        chapter.code: chapter
        for chapter in (
            await session.scalars(select(Chapter).where(Chapter.code.in_(codes)))
        ).all()
    }
    inserted_chapters = 0
    for code in codes:
        if code in existing:
            continue
        chapter = Chapter(code=code)
        session.add(chapter)
        existing[code] = chapter
        inserted_chapters += 1
    if inserted_chapters:
        await session.flush()

    chapter_ids = [chapter.id for chapter in existing.values()]
    translations = {
        (translation.chapter_id, translation.locale): translation
        for translation in (
            await session.scalars(
                select(ChapterTranslation).where(
                    ChapterTranslation.chapter_id.in_(chapter_ids),
                ),
            )
        ).all()
    }
    updated_translations = 0
    inserted_translations = 0
    for item in catalog:
        chapter = existing[str(item["code"]).strip()]
        for locale, title in dict(item.get("translations", {})).items():
            key = (chapter.id, str(locale))
            translation = translations.get(key)
            if translation is None:
                session.add(
                    ChapterTranslation(
                        chapter_id=chapter.id,
                        locale=key[1],
                        title=str(title),
                    ),
                )
                inserted_translations += 1
            elif translation.title != str(title):
                translation.title = str(title)
                updated_translations += 1

    return ChapterSeedResult(
        inserted_chapters=inserted_chapters,
        updated_translations=updated_translations,
        inserted_translations=inserted_translations,
    )
