from collections import defaultdict

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from src.topics.chapter_catalog import load_chapter_catalog, normalize_chapter


def _catalog_indexes() -> tuple[dict[str, str], dict[str, str]]:
    """Build migration-only indexes from the current chapter catalog.

    ``legacy_values`` and translations are intentionally kept as in-memory
    migration data.  The catalog no longer contains aliases and this module
    never creates or updates the old ``chapter_alias`` table.
    """
    by_legacy_candidates: defaultdict[str, set[str]] = defaultdict(set)
    by_translation_candidates: defaultdict[str, set[str]] = defaultdict(set)

    for item in load_chapter_catalog():
        code = str(item["code"]).strip()
        if not code:
            raise ValueError("Chapter catalog contains an empty code")

        for legacy_value in item.get("legacy_values", []):
            raw_value = str(legacy_value).strip()
            if raw_value:
                by_legacy_candidates[raw_value].add(code)

        for title in item.get("translations", {}).values():
            normalized_title = normalize_chapter(title)
            if normalized_title:
                by_translation_candidates[normalized_title].add(code)

    by_legacy = {
        value: next(iter(codes))
        for value, codes in by_legacy_candidates.items()
        if len(codes) == 1
    }
    by_translation = {
        value: next(iter(codes))
        for value, codes in by_translation_candidates.items()
        if len(codes) == 1
    }
    return by_legacy, by_translation


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


async def _load_legacy_aliases(
    connection: AsyncConnection,
) -> tuple[dict[str, set[int]], set[int]]:
    """Read the old alias table into memory before it can be dropped.

    The returned lookup is deliberately detached from SQLAlchemy models.  It
    is used only as the final migration fallback for legacy text columns.
    """
    if not await _table_exists(connection, "chapter_alias"):
        return {}, set()

    columns = await _table_columns(connection, "chapter_alias")
    if "chapter_id" not in columns:
        raise ValueError("chapter_alias is missing required chapter_id column")

    alias_columns = [
        column for column in ("alias", "normalized_alias") if column in columns
    ]
    if not alias_columns:
        raise ValueError("chapter_alias is missing alias data columns")

    selected_columns = ", ".join(
        _quote_identifier(column) for column in ("chapter_id", *alias_columns)
    )
    result = await connection.execute(
        text(f'SELECT {selected_columns} FROM "chapter_alias"')
    )

    aliases_by_value: defaultdict[str, set[int]] = defaultdict(set)
    alias_chapter_ids: set[int] = set()
    for row in result:
        chapter_id = row[0]
        if chapter_id is None:
            raise ValueError("chapter_alias contains a row with NULL chapter_id")
        alias_chapter_ids.add(chapter_id)

        normalized_values = {
            normalize_chapter(value)
            for value in row[1:]
            if value is not None and normalize_chapter(value)
        }
        if not normalized_values:
            raise ValueError(
                f"chapter_alias contains empty alias data for chapter_id={chapter_id}"
            )
        for normalized_value in normalized_values:
            aliases_by_value[normalized_value].add(chapter_id)

    return dict(aliases_by_value), alias_chapter_ids


def _catalog_code(
    value: object,
    by_legacy: dict[str, str],
    by_translation: dict[str, str],
) -> str | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    if raw in by_legacy:
        return by_legacy[raw]
    return by_translation.get(normalize_chapter(raw))


def _resolve_chapter_code(
    value: object,
    *,
    chapter_id: int,
    by_legacy: dict[str, str],
    by_translation: dict[str, str],
    aliases_by_value: dict[str, set[int]],
    chapter_codes_by_id: dict[int, str],
) -> str:
    code = _catalog_code(value, by_legacy, by_translation)
    if code is not None:
        return code

    normalized = normalize_chapter(value) if value is not None else ""
    alias_chapter_ids = aliases_by_value.get(normalized, set())
    if len(alias_chapter_ids) == 1 and chapter_id in alias_chapter_ids:
        code = chapter_codes_by_id.get(chapter_id)
        if code is not None:
            return code
    if len(alias_chapter_ids) > 1:
        raise ValueError(f"Ambiguous legacy chapter alias {value!r}")
    raise ValueError(f"Unresolved legacy chapter value {value!r}")


def _resolve_analyze_chapter_id(
    value: object,
    *,
    item_id: int,
    by_legacy: dict[str, str],
    by_translation: dict[str, str],
    aliases_by_value: dict[str, set[int]],
    chapter_ids_by_code: dict[str, int],
    chapter_codes_by_id: dict[int, str],
) -> int:
    code = _catalog_code(value, by_legacy, by_translation)
    if code is not None:
        chapter_id = chapter_ids_by_code.get(code)
        if chapter_id is None:
            raise ValueError(
                f"Legacy Analyze item id={item_id} resolved to missing chapter code {code!r}"
            )
        return chapter_id

    normalized = normalize_chapter(value) if value is not None else ""
    alias_chapter_ids = aliases_by_value.get(normalized, set())
    if len(alias_chapter_ids) == 1:
        chapter_id = next(iter(alias_chapter_ids))
        if chapter_id in chapter_codes_by_id:
            return chapter_id
    if len(alias_chapter_ids) > 1:
        raise ValueError(f"Ambiguous legacy chapter alias {value!r}")
    raise ValueError(
        f"Unresolved legacy chapter value {value!r} in Analyze item id={item_id}"
    )


async def _seed_catalog(connection: AsyncConnection) -> None:
    chapter_columns = await _table_columns(connection, "chapter")
    if "name" in chapter_columns:
        rows = await connection.execute(text('SELECT id, code, name FROM "chapter"'))
    else:
        rows = await connection.execute(text('SELECT id, code FROM "chapter"'))
    chapter_ids = {str(row[1]): row[0] for row in rows if row[1]}
    catalog = load_chapter_catalog()

    for item in catalog:
        code = str(item["code"]).strip()
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


async def migrate_chapter_schema(engine: AsyncEngine) -> None:
    """Migrate legacy chapter text columns to the canonical code/id schema.

    ``prepare_app`` invokes this after ``Base.metadata.create_all``.  The
    migration is safe for fresh databases, old databases, and databases that
    already completed part of the migration.  Legacy catalog values and old
    alias rows are read only while this transaction is running; the final
    schema has no ``chapter_alias`` table or legacy text columns.
    """
    async with engine.begin() as connection:
        if not await _table_exists(connection, "chapter"):
            return

        by_legacy, by_translation = _catalog_indexes()
        aliases_by_value, alias_chapter_ids = await _load_legacy_aliases(connection)

        chapter_columns = await _table_columns(connection, "chapter")
        if "code" not in chapter_columns:
            await connection.execute(text('ALTER TABLE "chapter" ADD COLUMN code VARCHAR(128)'))
            chapter_columns.add("code")

        if "name" in chapter_columns:
            rows = await connection.execute(text('SELECT id, code, name FROM "chapter"'))
        else:
            rows = await connection.execute(text('SELECT id, code FROM "chapter"'))

        chapter_codes_by_id: dict[int, str] = {
            row[0]: str(row[1]).strip()
            for row in rows
            if row[1] is not None and str(row[1]).strip()
        }
        if "name" in chapter_columns:
            rows = await connection.execute(text('SELECT id, code, name FROM "chapter"'))
            for row in rows:
                chapter_id, current_code, legacy_name = row
                if current_code is not None and str(current_code).strip():
                    continue
                code = _resolve_chapter_code(
                    legacy_name,
                    chapter_id=chapter_id,
                    by_legacy=by_legacy,
                    by_translation=by_translation,
                    aliases_by_value=aliases_by_value,
                    chapter_codes_by_id=chapter_codes_by_id,
                )
                await connection.execute(
                    text('UPDATE "chapter" SET code = :code WHERE id = :chapter_id'),
                    {"code": code, "chapter_id": chapter_id},
                )
                chapter_codes_by_id[chapter_id] = code
        else:
            missing_code = await connection.execute(
                text(
                    'SELECT count(*) FROM "chapter" '
                    "WHERE code IS NULL OR btrim(code) = ''"
                )
            )
            if missing_code.scalar_one() != 0:
                raise ValueError("Chapter rows without a stable code cannot be migrated")

        null_codes = await connection.execute(
            text(
                'SELECT count(*) FROM "chapter" '
                "WHERE code IS NULL OR btrim(code) = ''"
            )
        )
        if null_codes.scalar_one() != 0:
            raise ValueError("Chapter code backfill left NULL or empty code rows")

        duplicate_codes = await connection.execute(
            text(
                'SELECT code FROM "chapter" '
                "GROUP BY code HAVING count(*) > 1 LIMIT 1"
            )
        )
        duplicate_code = duplicate_codes.scalar_one_or_none()
        if duplicate_code is not None:
            raise ValueError(f"Chapter code backfill produced duplicate code {duplicate_code!r}")

        await connection.execute(text('ALTER TABLE "chapter" ALTER COLUMN code SET NOT NULL'))
        await connection.execute(
            text('CREATE UNIQUE INDEX IF NOT EXISTS uq_chapter_code ON "chapter" (code)')
        )
        await _seed_catalog(connection)

        if alias_chapter_ids:
            chapter_ids = {
                row[0]
                for row in await connection.execute(text('SELECT id FROM "chapter"'))
            }
            orphaned_aliases = alias_chapter_ids - chapter_ids
            if orphaned_aliases:
                raise ValueError(
                    "chapter_alias contains orphaned chapter references: "
                    f"{sorted(orphaned_aliases)!r}"
                )

        chapter_rows = await connection.execute(text('SELECT id, code FROM "chapter"'))
        chapter_ids_by_code = {str(row[1]): row[0] for row in chapter_rows}
        chapter_codes_by_id = {chapter_id: code for code, chapter_id in chapter_ids_by_code.items()}

        item_columns: set[str] | None = None
        if await _table_exists(connection, "analyze_result_items"):
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
                for item_id, legacy_value in rows:
                    chapter_id = _resolve_analyze_chapter_id(
                        legacy_value,
                        item_id=item_id,
                        by_legacy=by_legacy,
                        by_translation=by_translation,
                        aliases_by_value=aliases_by_value,
                        chapter_ids_by_code=chapter_ids_by_code,
                        chapter_codes_by_id=chapter_codes_by_id,
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

        if "name" in chapter_columns:
            await connection.execute(text('ALTER TABLE "chapter" DROP COLUMN IF EXISTS "name"'))
        if item_columns is not None and "chapter" in item_columns:
            await connection.execute(
                text('ALTER TABLE analyze_result_items DROP COLUMN IF EXISTS "chapter"')
            )

        if await _table_exists(connection, "chapter_alias"):
            await connection.execute(text('DROP TABLE "chapter_alias"'))
