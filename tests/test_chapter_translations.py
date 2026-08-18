import asyncio
import json
import unittest
from pathlib import Path

import src.models  # noqa: F401 - register all SQLAlchemy relationships for model construction
from src.analyze.models import AnalyzeResultItem  # noqa: F401
from src.database import Base
from src.analyze.repository import get_chapter_model_by_title
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
            resolve_chapter_by_title(
                session,
                extended_title,
                allow_extensions=True,
            )
        )
        self.assertIs(match, chapter)

    def test_resolver_matches_dot_prefix_with_opt_in_flag(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-networks",
            kk=(
                "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру. "
                "Ақпараттық қауіпсіздік"
            ),
            ru="Компьютерные сети. Организация компьютерных сетей. Информационная безопасность",
        )
        session = _FakeSession(rows)
        input_title = "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру"

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(resolve_chapter_by_title(session, input_title))

        match = asyncio.run(
            resolve_chapter_by_title(
                session,
                input_title,
                allow_extensions=True,
            )
        )
        self.assertIs(match, chapter)

    def test_resolver_allow_extensions_false_rejects_extended_title(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-devices",
            kk="Компьютердің құрылғылары",
            ru="Устройства компьютера",
        )

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(
                resolve_chapter_by_title(
                    _FakeSession(rows),
                    "Устройства компьютера: дополнительный раздел",
                    allow_extensions=False,
                )
            )
        self.assertIsNotNone(chapter)

    def test_resolver_extension_normalizes_case_and_spaces(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-networks",
            kk=(
                "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру. "
                "Ақпараттық қауіпсіздік"
            ),
            ru="Компьютерные сети",
        )

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(
                resolve_chapter_by_title(
                    _FakeSession(rows),
                    "  КОМПЬЮТЕРЛІК   ЖЕЛІЛЕР . компьютерлік   желілерді ұйымдастыру ",
                )
            )

        match = asyncio.run(
            resolve_chapter_by_title(
                _FakeSession(rows),
                "  КОМПЬЮТЕРЛІК   ЖЕЛІЛЕР . компьютерлік   желілерді ұйымдастыру ",
                allow_extensions=True,
            )
        )
        self.assertIs(match, chapter)

    def test_resolver_boundary_aware_substring_fallback(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-networks",
            kk="Компьютерлік желілер",
            ru="Компьютерные сети",
        )

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(
                resolve_chapter_by_title(
                    _FakeSession(rows),
                    "Бөлім: компьютерлік желілер (9 сынып)",
                )
            )

        match = asyncio.run(
            resolve_chapter_by_title(
                _FakeSession(rows),
                "Бөлім: компьютерлік желілер (9 сынып)",
                allow_extensions=True,
            )
        )
        self.assertIs(match, chapter)

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(
                resolve_chapter_by_title(
                    _FakeSession(rows),
                    "Компьютерлік желілерді",
                )
            )

    def test_analyze_lookup_fuzzy_matches_one_kazakh_letter_difference(self):
        chapter, rows = _chapter_with_translations(
            1,
            "databases-and-queries",
            kk="Мәліметтер қорын жасау. Құрылымдалған сұраныстар.",
            ru="Создание баз данных. Структурированные запросы.",
        )
        document_title = "Мәліметтер қорын жасау. Құрылымданған сұраныстар."

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(resolve_chapter_by_title(_FakeSession(rows), document_title))

        match = asyncio.run(
            get_chapter_model_by_title(_FakeSession(rows), value=document_title)
        )
        self.assertIs(match, chapter)

    def test_analyze_fuzzy_lookup_rejects_no_match_with_reason(self):
        _, rows = _chapter_with_translations(
            1,
            "databases-and-queries",
            kk="Мәліметтер қорын жасау. Құрылымдалған сұраныстар.",
            ru="Создание баз данных. Структурированные запросы.",
        )

        with self.assertRaisesRegex(
            ValueError,
            r"Unknown chapter title.*lookup_reason=no_fuzzy_candidate.*fuzzy_threshold=0\.92.*candidates=0",
        ):
            asyncio.run(
                get_chapter_model_by_title(
                    _FakeSession(rows),
                    value="Мүлдем басқа тақырып",
                )
            )

    def test_analyze_fuzzy_lookup_rejects_ambiguous_top_score(self):
        _, first_rows = _chapter_with_translations(
            1,
            "database-a",
            kk="Мәліметтер қорын жасау A",
            ru="Первая глава",
        )
        _, second_rows = _chapter_with_translations(
            2,
            "database-b",
            kk="Мәліметтер қорын жасау B",
            ru="Вторая глава",
        )

        with self.assertRaisesRegex(
            ValueError,
            r"Ambiguous chapter title.*lookup_reason=ambiguous_fuzzy_top_score.*fuzzy_threshold=0\.92",
        ):
            asyncio.run(
                get_chapter_model_by_title(
                    _FakeSession(first_rows + second_rows),
                    value="Мәліметтер қорын жасау C",
                )
            )

    def test_resolver_substring_rejects_combining_mark_but_accepts_separator(self):
        chapter, rows = _chapter_with_translations(
            1,
            "cafe",
            kk="cafe",
            ru="coffee",
        )
        session = _FakeSession(rows)

        with self.assertRaisesRegex(ValueError, "Unknown chapter title"):
            asyncio.run(
                resolve_chapter_by_title(
                    session,
                    "cafe\u0301",
                )
            )

        match = asyncio.run(
            resolve_chapter_by_title(
                session,
                "cafe: extra",
                allow_extensions=True,
            )
        )
        self.assertIs(match, chapter)

    def test_resolver_fallback_deduplicates_translations_by_chapter_id(self):
        chapter, rows = _chapter_with_translations(
            1,
            "computer-networks",
            kk="Компьютерлік желілер. Ақпараттық қауіпсіздік",
            ru="Компьютерлік желілер: Ақпараттық қауіпсіздік",
        )

        match = asyncio.run(
            resolve_chapter_by_title(
                _FakeSession(rows),
                "Компьютерлік желілер",
                allow_extensions=True,
            )
        )
        self.assertIs(match, chapter)

    def test_resolver_fallback_is_ambiguous_for_two_dot_prefix_chapters(self):
        first_chapter, first_rows = _chapter_with_translations(
            1,
            "computer-networks-security",
            kk=(
                "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру. "
                "Ақпараттық қауіпсіздік"
            ),
            ru="Компьютерные сети: Информационная безопасность",
        )
        second_chapter, second_rows = _chapter_with_translations(
            2,
            "computer-networks-management",
            kk=(
                "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру. "
                "Желілерді басқару"
            ),
            ru="Компьютерные сети: Управление сетями",
        )

        with self.assertRaisesRegex(
            ValueError,
            r"Ambiguous chapter title.*lookup_reason=ambiguous_fallback_match",
        ):
            asyncio.run(
                resolve_chapter_by_title(
                    _FakeSession(first_rows + second_rows),
                    "Компьютерлік желілер. Компьютерлік желілерді ұйымдастыру",
                    allow_extensions=True,
                )
            )
        self.assertIsNot(first_chapter, second_chapter)

    def test_resolver_fallback_contracts_are_explicit_at_boundaries(self):
        repository_source = (ROOT / "src/topics/repository.py").read_text(encoding="utf-8")
        analyze_source = (ROOT / "src/analyze/repository.py").read_text(encoding="utf-8")
        loader_source = (ROOT / "src/loader.py").read_text(encoding="utf-8")

        self.assertIn("allow_extensions: bool = False", repository_source)
        self.assertIn(
            "allow_extensions=True,",
            analyze_source,
        )
        self.assertIn("allow_fuzzy=True", analyze_source)
        self.assertIn("resolve_chapter_by_title(session, chapter_name)", loader_source)

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
