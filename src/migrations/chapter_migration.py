from collections import defaultdict
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from src.topics.chapter_catalog import load_chapter_catalog, normalize_chapter


def _catalog_indexes() -> tuple[dict[str, str], dict[str, str]]:
    by_legacy: dict[str, str] = {}
    by_alias: defaultdict[str, set[str]] = defaultdict(set)
    for item in load_chapter_catalog():
        code = str(item["code"])
        for legacy_value in item.get("legacy_values", []):
            by_legacy[str(legacy_value)] = code
        for title in item.get("translations", {}).values():
            by_alias[normalize_chapter(title)].add(code)
        for aliases in item.get("aliases", {}).values():
            for alias in aliases:
                by_alias[normalize_chapter(alias)].add(code)
    ambiguous = {key for key, codes in by_alias.items() if len(codes) != 1}
    return by_legacy, {key: next(iter(codes)) for key, codes in by_alias.items() if key and key not in ambiguous}


async def _table_columns(connection: AsyncConnection, table_name: str) -> set[str]:
    result = await connection.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = :table_name
            """
        ),
        {"table_name": table_name},
    )
    return {row[0] for row in result}


async def _table_exists(connection: AsyncConnection, table_name: str) -> bool:
    result = await connection.execute(
        text(
            """
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = current_schema() AND table_name = :table_name
            )
            """
        ),
        {"table_name": table_name},
    )
    return bool(result.scalar_one())


async def _chapter_fk_constraint_name(connection: AsyncConnection) -> str | None:
    result = await connection.execute(
        text(
            """
            SELECT tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON kcu.constraint_schema = tc.constraint_schema
             AND kcu.constraint_name = tc.constraint_name
             AND kcu.table_name = tc.table_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_schema = tc.constraint_schema
             AND ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_schema = current_schema()
              AND tc.table_schema = current_schema()
              AND tc.table_name = 'analyze_result_items'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'chapter_id'
              AND ccu.table_schema = current_schema()
              AND ccu.table_name = 'chapter'
              AND ccu.column_name = 'id'
            LIMIT 1
            """
        )
    )
    return result.scalar_one_or_none()


def _quote_identifier(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _resolve_legacy_code(value: object, by_legacy: dict[str, str], by_alias: dict[str, str]) -> str:
    raw = str(value).strip()
    if raw in by_legacy:
        return by_legacy[raw]
    normalized = normalize_chapter(raw)
    if normalized in by_alias:
        return by_alias[normalized]
    raise ValueError(f"Unresolved legacy chapter value {value!r}")


async def _seed_catalog(connection: AsyncConnection) -> None:
    chapter_columns = await _table_columns(connection, "chapter")
    if "name" in chapter_columns:
        rows = await connection.execute(text('SELECT id, code, name FROM "chapter"'))
    else:
        rows = await connection.execute(text('SELECT id, code FROM "chapter"'))
    chapter_ids = {str(row[1]): row[0] for row in rows if row[1]}
    catalog = load_chapter_catalog()

    for item in catalog:
        code = str(item["code"])
        chapter_id = chapter_ids.get(code)
        if chapter_id is None:
            params = {"code": code}
            if "name" in chapter_columns:
                translations = item.get("translations", {})
                legacy_name = (
                    translations.get("kk")
                    or translations.get("ru")
                    or next(iter(item.get("legacy_values", [])), code)
                )
                await connection.execute(
                    text(
                        'INSERT INTO "chapter" (code, name) '
                        'VALUES (:code, :name) ON CONFLICT (code) DO NOTHING'
                    ),
                    {**params, "name": legacy_name},
                )
            else:
                await connection.execute(
                    text(
                        'INSERT INTO "chapter" (code) VALUES (:code) '
                        'ON CONFLICT (code) DO NOTHING'
                    ),
                    params,
                )
            row = await connection.execute(
                text('SELECT id FROM "chapter" WHERE code = :code'), {"code": code}
            )
            chapter_id = row.scalar_one()
            chapter_ids[code] = chapter_id

        for locale, title in item.get("translations", {}).items():
            await connection.execute(
                text(
                    """
                    INSERT INTO chapter_translation (chapter_id, locale, title)
                    VALUES (:chapter_id, :locale, :title)
                    ON CONFLICT (chapter_id, locale) DO UPDATE SET title = EXCLUDED.title
                    """
                ),
                {"chapter_id": chapter_id, "locale": locale, "title": title},
            )
        for locale, aliases in item.get("aliases", {}).items():
            for alias in aliases:
                await connection.execute(
                    text(
                        """
                        INSERT INTO chapter_alias
                            (chapter_id, locale, alias, normalized_alias)
                        VALUES (:chapter_id, :locale, :alias, :normalized_alias)
                        ON CONFLICT (chapter_id, locale, normalized_alias)
                        DO UPDATE SET alias = EXCLUDED.alias
                        """
                    ),
                    {
                        "chapter_id": chapter_id,
                        "locale": locale,
                        "alias": alias,
                        "normalized_alias": normalize_chapter(alias),
                    },
                )


async def migrate_chapter_schema(engine: AsyncEngine) -> None:
    """Upgrade the pre-DB-driven Chapter/Analyze schema in one transaction.

    ``prepare_app`` calls this after ``Base.metadata.create_all``.  Old
    PostgreSQL databases retain ``chapter.name`` as an ignored legacy column;
    the ORM never maps or queries it.  The old Analyze enum column is removed
    after every row has an unambiguous ``chapter_id``.
    """
    async with engine.begin() as connection:
        if not await _table_exists(connection, "chapter"):
            return

        by_legacy, by_alias = _catalog_indexes()
        chapter_columns = await _table_columns(connection, "chapter")
        if "code" not in chapter_columns:
            await connection.execute(text('ALTER TABLE "chapter" ADD COLUMN code VARCHAR(128)'))
            chapter_columns.add("code")

        if "name" in chapter_columns:
            rows = await connection.execute(text('SELECT id, code, name FROM "chapter"'))
        else:
            rows = await connection.execute(text('SELECT id, code FROM "chapter"'))
        for row in rows:
            chapter_id = row[0]
            current_code = row[1]
            if current_code:
                continue
            if "name" not in chapter_columns:
                raise ValueError(f"Chapter id={chapter_id} has no stable code")
            code = _resolve_legacy_code(row[2], by_legacy, by_alias)
            await connection.execute(
                text('UPDATE "chapter" SET code = :code WHERE id = :chapter_id'),
                {"code": code, "chapter_id": chapter_id},
            )

        await connection.execute(text('ALTER TABLE "chapter" ALTER COLUMN code SET NOT NULL'))
        await connection.execute(
            text('CREATE UNIQUE INDEX IF NOT EXISTS uq_chapter_code ON "chapter" (code)')
        )
        await _seed_catalog(connection)

        if not await _table_exists(connection, "analyze_result_items"):
            return

        item_columns = await _table_columns(connection, "analyze_result_items")
        if "chapter_id" not in item_columns:
            await connection.execute(
                text('ALTER TABLE analyze_result_items ADD COLUMN chapter_id INTEGER')
            )
            item_columns.add("chapter_id")

        if "chapter" in item_columns:
            rows = await connection.execute(
                text(
                    "SELECT id, chapter FROM analyze_result_items "
                    "WHERE chapter_id IS NULL ORDER BY id"
                )
            )
            chapter_ids = {
                str(code): chapter_id
                for chapter_id, code in (
                    await connection.execute(text('SELECT id, code FROM "chapter"'))
                )
            }
            for item_id, legacy_value in rows:
                code = _resolve_legacy_code(legacy_value, by_legacy, by_alias)
                chapter_id = chapter_ids.get(code)
                if chapter_id is None:
                    raise ValueError(
                        f"Legacy Analyze item id={item_id} resolved to missing chapter code {code!r}"
                    )
                await connection.execute(
                    text(
                        "UPDATE analyze_result_items SET chapter_id = :chapter_id "
                        "WHERE id = :item_id"
                    ),
                    {"chapter_id": chapter_id, "item_id": item_id},
                )

            unresolved = await connection.execute(
                text("SELECT count(*) FROM analyze_result_items WHERE chapter_id IS NULL")
            )
            if unresolved.scalar_one() != 0:
                raise ValueError("Analyze result backfill left unresolved chapter_id rows")
            await connection.execute(
                text("ALTER TABLE analyze_result_items DROP COLUMN IF EXISTS chapter")
            )

        unresolved = await connection.execute(
            text("SELECT count(*) FROM analyze_result_items WHERE chapter_id IS NULL")
        )
        if unresolved.scalar_one() != 0:
            raise ValueError("Analyze result backfill left unresolved chapter_id rows")

        orphaned = await connection.execute(
            text(
                "SELECT count(*) FROM analyze_result_items AS item "
                "LEFT JOIN chapter AS chapter ON chapter.id = item.chapter_id "
                "WHERE item.chapter_id IS NOT NULL AND chapter.id IS NULL"
            )
        )
        if orphaned.scalar_one() != 0:
            raise ValueError("Analyze result backfill found orphaned chapter_id rows")

        existing_fk_name = await _chapter_fk_constraint_name(connection)
        fk_name = "fk_analyze_result_items_chapter_id"
        if existing_fk_name is None:
            await connection.execute(
                text(
                    f"ALTER TABLE analyze_result_items ADD CONSTRAINT {fk_name} "
                    "FOREIGN KEY (chapter_id) REFERENCES chapter(id)"
                )
            )
        elif existing_fk_name != fk_name:
            await connection.execute(
                text(
                    "ALTER TABLE analyze_result_items RENAME CONSTRAINT "
                    f"{_quote_identifier(existing_fk_name)} TO {fk_name}"
                )
            )

        await connection.execute(
            text("ALTER TABLE analyze_result_items ALTER COLUMN chapter_id SET NOT NULL")
        )
