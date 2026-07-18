import asyncio
import json
import unittest
from pathlib import Path

import src.models  # noqa: F401 - register all SQLAlchemy relationships for model construction
from src.analyze.models import AnalyzeResultItem  # noqa: F401
from src.database import Base
from src.topics.chapter_catalog import load_chapter_catalog, normalize_chapter
from src.topics.models import Chapter, ChapterTranslation
from src.topics.repository import resolve_chapter_by_title, resolve_chapter_title
from src.topics.schemas import ChapterResponse


ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "src/data/chapterCatalog.json"
MAPPING_PATH = ROOT / "src/data/mappingStructure.json"


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows


class _FakeSession:
    def __init__(self, rows):
        self._rows = rows

    async def execute(self, _query):
        return _FakeResult(self._rows)


def _chapter_with_translations(
    chapter_id: int,
    code: str,
    *,
    kk: str,
    ru: str,
) -> tuple[Chapter, list[tuple[ChapterTranslation, Chapter]]]:
    chapter = Chapter(id=chapter_id, code=code)
    translations = [
        ChapterTranslation(chapter_id=chapter_id, locale="kk", title=kk),
        ChapterTranslation(chapter_id=chapter_id, locale="ru", title=ru),
    ]
    return chapter, [(translation, chapter) for translation in translations]


class ChapterCatalogTests(unittest.TestCase):
    def test_catalog_has_13_unique_codes_and_only_kk_ru_translations(self):
        catalog = load_chapter_catalog()

        self.assertEqual(len(catalog), 13)
        codes = [item["code"] for item in catalog]
        self.assertEqual(len(set(codes)), 13)

        for item in catalog:
            self.assertRegex(item["code"], r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            self.assertNotIn("aliases", item)
            self.assertFalse(any("alias" in key.casefold() for key in item))
            self.assertEqual(set(item["translations"]), {"kk", "ru"})
            self.assertTrue(all(item["translations"].values()))

    def test_mapping_titles_are_exact_kk_translation_values(self):
        catalog = load_chapter_catalog(CATALOG_PATH)
        data = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
        titles = [
            item["title"]
            for items in data.values()
            for item in items
            if item.get("title")
        ]
        kk_titles = {item["translations"]["kk"] for item in catalog}
        all_translation_titles = {
            title
            for item in catalog
            for title in item["translations"].values()
        }

        self.assertEqual(len(titles), 13)
        self.assertEqual(len(set(titles)), 13)
        self.assertEqual(set(titles), kk_titles)
        self.assertTrue(set(titles).issubset(all_translation_titles))

    def test_metadata_has_no_chapter_alias_and_chapter_is_id_code_only(self):
        chapter_table = Base.metadata.tables["chapter"]
        self.assertEqual({column.name for column in chapter_table.columns}, {"id", "code"})
        self.assertNotIn("chapter_alias", Base.metadata.tables)
        self.assertFalse(any("alias" in name.casefold() for name in Base.metadata.tables))

        chapter_model_source = (ROOT / "src/topics/models.py").read_text(encoding="utf-8")
        self.assertNotIn("ChapterAlias", chapter_model_source)
        self.assertEqual(
            {column.name for column in Base.metadata.tables["chapter_translation"].columns},
            {"id", "chapter_id", "locale", "title"},
        )
        self.assertEqual(
            {column.name for column in Base.metadata.tables["analyze_result_items"].columns}
            & {"chapter_id", "chapter", "chapter_code", "chapter_title", "chapter_name"},
            {"chapter_id"},
        )

    def test_resolver_matches_exact_kk_and_ru_titles_after_normalization(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-devices",
            kk="Компьютердің құрылғылары",
            ru="Устройства компьютера",
        )
        session = _FakeSession(rows)

        kk_match = asyncio.run(
            resolve_chapter_by_title(session, "  Компьютердің   құрылғылары  ")
        )
        ru_match = asyncio.run(
            resolve_chapter_by_title(session, " УСТРОЙСТВА КОМПЬЮТЕРА ")
        )

        self.assertIs(kk_match, chapter)
        self.assertIs(ru_match, chapter)
        self.assertEqual(normalize_chapter("  A   B "), "a b")

    def test_resolver_extension_is_opt_in(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-devices",
            kk="Компьютердің құрылғылары",
            ru="Устройства компьютера",
        )
        session = _FakeSession(rows)
        extended_title = "Устройства компьютера: дополнительный раздел"

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(resolve_chapter_by_title(session, extended_title))

        match = asyncio.run(
            resolve_chapter_by_title(session, extended_title, allow_extensions=True)
        )
        self.assertIs(match, chapter)

    def test_resolver_rejects_unknown_and_ambiguous_titles(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-devices",
            kk="Компьютердің құрылғылары",
            ru="Устройства компьютера",
        )
        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(resolve_chapter_by_title(_FakeSession(rows), "Неизвестная глава"))

        other_chapter, other_rows = _chapter_with_translations(
            2,
            "other",
            kk="Компьютердің құрылғылары",
            ru="Другая глава",
        )
        with self.assertRaisesRegex(ValueError, "Ambiguous chapter title"):
            asyncio.run(
                resolve_chapter_by_title(
                    _FakeSession(rows + other_rows),
                    "Компьютердің құрылғылары",
                )
            )
        self.assertIsNotNone(other_chapter)

    def test_analyze_result_item_persists_chapter_id_not_legacy_chapter_fields(self):
        columns = {column.name for column in AnalyzeResultItem.__table__.columns}
        self.assertIn("chapter_id", columns)
        self.assertNotIn("chapter", columns)
        self.assertNotIn("chapter_code", columns)
        self.assertNotIn("chapter_title", columns)
        self.assertNotIn("chapter_name", columns)

        analyze_model_source = (ROOT / "src/analyze/models.py").read_text(encoding="utf-8")
        self.assertIn("chapter_id", analyze_model_source)
        self.assertNotIn("analyze_chapter", analyze_model_source)

    def test_localized_title_falls_back_to_kk_and_response_keeps_code(self):
        chapter = Chapter(id=1, code="computer-devices")
        chapter.translations = [ChapterTranslation(locale="kk", title="Қазақша")]
        self.assertEqual(resolve_chapter_title(chapter, "ru"), "Қазақша")
        self.assertEqual(ChapterResponse.model_validate(chapter).code, "computer-devices")


if __name__ == "__main__":
    unittest.main()
