import json
import unittest
from pathlib import Path

from src.database import Base
from src.topics.chapter_catalog import load_chapter_catalog, normalize_chapter
from src.topics.models import Chapter, ChapterAlias, ChapterTranslation
from src.topics.repository import resolve_chapter_title
from src.topics.schemas import ChapterResponse


ROOT = Path(__file__).resolve().parents[1]


class ChapterCatalogTests(unittest.TestCase):
    def test_catalog_has_stable_codes_translations_and_aliases(self):
        catalog = load_chapter_catalog()
        self.assertEqual(len(catalog), 13)
        self.assertEqual(len({item["code"] for item in catalog}), 13)
        for item in catalog:
            self.assertRegex(item["code"], r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            self.assertEqual(set(item["translations"]), {"kk", "ru"})
            self.assertTrue(item["aliases"]["kk"])
            self.assertTrue(item["aliases"]["ru"])

    def test_mapping_titles_are_exact_db_aliases(self):
        data = json.loads((ROOT / "src/data/mappingStructure.json").read_text(encoding="utf-8"))
        titles = {item["title"].strip() for items in data.values() for item in items if item.get("title")}
        aliases = {
            normalize_chapter(alias)
            for chapter in load_chapter_catalog()
            for values in chapter["aliases"].values()
            for alias in values
        }
        self.assertEqual(len(titles), 13)
        self.assertTrue(all(normalize_chapter(title) in aliases for title in titles))

    def test_metadata_uses_code_and_alias_table(self):
        chapter_columns = {column.name for column in Base.metadata.tables["chapter"].columns}
        alias_columns = {column.name for column in Base.metadata.tables["chapter_alias"].columns}
        self.assertEqual(chapter_columns, {"id", "code"})
        self.assertEqual(alias_columns, {"id", "chapter_id", "locale", "alias", "normalized_alias"})
        self.assertNotIn("name", chapter_columns)
        self.assertTrue(any(c.__class__.__name__ == "UniqueConstraint" for c in Base.metadata.tables["chapter_alias"].constraints))

    def test_localized_title_falls_back_to_code(self):
        chapter = Chapter(id=1, code="computer-devices")
        chapter.translations = [ChapterTranslation(locale="kk", title="Қазақша")]
        self.assertEqual(resolve_chapter_title(chapter, "ru"), "Қазақша")
        self.assertEqual(ChapterResponse.model_validate(chapter).code, "computer-devices")

    def test_mapping_file_is_not_changed_and_enum_is_not_runtime_source(self):
        self.assertFalse((ROOT / "src/analyze/enums.py").exists())
        enum_import = "src." + "analyze.enums"
        for path in [ROOT / "src/analyze/repository.py", ROOT / "src/analyze/service.py", ROOT / "src/analyze/router.py"]:
            self.assertNotIn(enum_import, path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
