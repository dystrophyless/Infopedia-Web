"""Migrate legacy term identities to the canonical terms v2 shape."""

from __future__ import annotations

import argparse
import asyncio
import json
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from src.terms.catalog import TermsCatalogV2, parse_terms_catalog_v2


@dataclass(frozen=True, slots=True)
class MigrationStats:
    """Counters and invariant values reported by the terms v2 migration."""

    definitions_before: int
    definitions_after: int
    null_names_after: int
    aliases_found: int
    aliases_merged: int
    favorites_merged: int
    definitions_repointed: int


def build_normalization_mapping(catalog: TermsCatalogV2) -> dict[str, str]:
    """Derive source-name to canonical-name identities from a v2 catalog."""
    mapping: dict[str, str] = {}
    source_names_by_canonical: dict[str, set[str]] = {
        canonical_name: set() for canonical_name in catalog.canonical_names
    }

    for definition in catalog.definitions:
        source_names_by_canonical[definition.canonical_name].add(definition.source_name)
        previous = mapping.setdefault(definition.source_name, definition.canonical_name)
        if previous != definition.canonical_name:
            message = (
                f"source name {definition.source_name!r} belongs to multiple canonical terms: "
                f"{previous!r}, {definition.canonical_name!r}"
            )
            raise ValueError(message)

    for canonical_name, source_names in source_names_by_canonical.items():
        if canonical_name not in source_names:
            message = (
                f"canonical term {canonical_name!r} is not present among its source variants"
            )
            raise ValueError(message)

    return mapping


async def migrate_terms_v2(
    connection: AsyncConnection,
    *,
    mapping: Mapping[str, str],
) -> MigrationStats:
    """Apply the terms v2 migration inside the caller's open transaction."""
    definitions_before = int(
        (await connection.scalar(text("SELECT count(*) FROM definition"))) or 0,
    )

    await connection.execute(
        text("ALTER TABLE definition ADD COLUMN IF NOT EXISTS name varchar(255)"),
    )
    await connection.execute(
        text(
            "UPDATE definition AS d "
            "SET name = t.name "
            "FROM term AS t "
            "WHERE d.term_id = t.id AND d.name IS NULL",
        ),
    )

    term_rows = await connection.execute(text("SELECT id, name FROM term"))
    term_ids = {str(row.name): int(row.id) for row in term_rows}

    aliases_found = 0
    aliases_merged = 0
    favorites_merged = 0
    definitions_repointed = 0

    for old_name, canonical_name in mapping.items():
        if not isinstance(old_name, str) or not isinstance(canonical_name, str):
            raise ValueError("normalization mapping names must be strings")  # noqa: TRY004
        if old_name == canonical_name:
            continue
        old_id = term_ids.get(old_name)
        if old_id is None:
            # This is the normal idempotent rerun path: the alias was already
            # merged and removed by an earlier invocation.
            continue
        aliases_found += 1
        canonical_id = term_ids.get(canonical_name)
        if canonical_id is None:
            message = f"canonical term {canonical_name!r} is missing for existing alias {old_name!r}"
            raise ValueError(message)

        favorite_result = await connection.execute(
            text(
                "INSERT INTO favorite_term (user_id, term_id, created_at) "
                "SELECT user_id, :canonical_id, created_at "
                "FROM favorite_term "
                "WHERE term_id = :old_id "
                "ON CONFLICT (user_id, term_id) "
                "DO UPDATE SET created_at = GREATEST("
                "favorite_term.created_at, EXCLUDED.created_at)",
            ),
            {"canonical_id": canonical_id, "old_id": old_id},
        )
        if favorite_result.rowcount and favorite_result.rowcount > 0:
            favorites_merged += favorite_result.rowcount
        await connection.execute(
            text("DELETE FROM favorite_term WHERE term_id = :old_id"),
            {"old_id": old_id},
        )

        definition_result = await connection.execute(
            text("UPDATE definition SET term_id = :canonical_id WHERE term_id = :old_id"),
            {"canonical_id": canonical_id, "old_id": old_id},
        )
        if definition_result.rowcount and definition_result.rowcount > 0:
            definitions_repointed += definition_result.rowcount
        await connection.execute(
            text("DELETE FROM term WHERE id = :old_id"),
            {"old_id": old_id},
        )
        term_ids.pop(old_name, None)
        aliases_merged += 1

    await connection.execute(text("ALTER TABLE definition ALTER COLUMN name SET NOT NULL"))
    await connection.execute(
        text(
            "CREATE INDEX IF NOT EXISTS idx_definition_name_trgm "
            "ON definition USING gin (name gin_trgm_ops)",
        ),
    )
    await connection.execute(text("DROP INDEX IF EXISTS idx_term_name_trgm"))

    definitions_after = int(
        (await connection.scalar(text("SELECT count(*) FROM definition"))) or 0,
    )
    null_names_after = int(
        (await connection.scalar(text("SELECT count(*) FROM definition WHERE name IS NULL"))) or 0,
    )
    if definitions_after != definitions_before:
        message = f"terms v2 migration changed the definition count: before={definitions_before}, after={definitions_after}"
        raise RuntimeError(message)
    if null_names_after:
        message = f"terms v2 migration left {null_names_after} definition source names null"
        raise RuntimeError(message)

    return MigrationStats(
        definitions_before=definitions_before,
        definitions_after=definitions_after,
        null_names_after=null_names_after,
        aliases_found=aliases_found,
        aliases_merged=aliases_merged,
        favorites_merged=favorites_merged,
        definitions_repointed=definitions_repointed,
    )


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--terms-json",
        required=True,
        type=Path,
        help="Path to strict normalized terms.json schema_version=2",
    )
    return parser.parse_args(argv)


async def _run(terms_json: Path) -> MigrationStats:
    raw = json.loads(terms_json.read_text(encoding="utf-8"))
    catalog = parse_terms_catalog_v2(raw)
    mapping = build_normalization_mapping(catalog)
    # Importing the application engine lazily keeps pure mapping validation
    # usable without constructing the full application configuration.
    from src.database import async_engine  # noqa: PLC0415

    async with async_engine.begin() as connection:
        stats = await migrate_terms_v2(connection, mapping=mapping)
    return stats


def main(argv: list[str] | None = None) -> int:
    """Run the one-shot migration CLI and print its counters as JSON."""
    args = _parse_args(argv)
    stats = asyncio.run(_run(args.terms_json))
    print(json.dumps(asdict(stats), ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
