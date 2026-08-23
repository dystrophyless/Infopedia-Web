"""Bootstrap-only canonical PostgreSQL schema initialization."""

# Imports are intentionally local in ``register_models`` so this module is the
# explicit model-registration boundary used by the bootstrap initializer.
# ruff: noqa: D202, D213, EM102, F401, I001, PLC0415, RUF100

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlalchemy.dialects import postgresql

from src.database import Base


def register_models() -> None:
    """Register every ORM module before ``metadata.create_all``."""

    import src.analyze.models  # noqa: F401
    import src.auth.models  # noqa: F401
    import src.favorites.models  # noqa: F401
    import src.terms.models  # noqa: F401
    import src.tests.models  # noqa: F401
    import src.topics.models  # noqa: F401
    import src.users.models  # noqa: F401
    import src.models  # noqa: F401 - imports complete relationship targets


def _named_metadata_objects() -> tuple[set[str], set[str]]:
    indexes: set[str] = set()
    constraints: set[str] = set()
    for table in Base.metadata.tables.values():
        indexes.update(str(index.name) for index in table.indexes if index.name)
        constraints.update(
            str(constraint.name)
            for constraint in table.constraints
            if constraint.name
        )
    return indexes, constraints


def _normalise_expression(value: object) -> str | None:
    if value is None:
        return None
    result = " ".join(str(value).strip().lower().split()).replace('"', "")
    while result.startswith("(") and result.endswith(")"):
        result = result[1:-1].strip()
    return result or None


def _expected_indexes() -> dict[str, dict[str, object]]:
    dialect = postgresql.dialect()
    expected: dict[str, dict[str, object]] = {}
    for table in Base.metadata.tables.values():
        for index in table.indexes:
            if not index.name:
                continue
            options = index.dialect_options["postgresql"]
            ops = options.get("ops") or {}
            where = options.get("where")
            expected[str(index.name)] = {
                "table": table.name,
                "access_method": str(options.get("using") or "btree"),
                "unique": bool(index.unique),
                "predicate": _normalise_expression(
                    None if where is None else where.compile(dialect=dialect),
                ),
                "columns": tuple(column.name for column in index.columns),
                "opclasses": tuple(
                    str(ops.get(column.name))
                    for column in index.columns
                    if ops.get(column.name)
                ),
            }
    return expected


async def _verify_postgres_contract(connection) -> None:
    required_extensions = {"vector", "pg_trgm"}
    installed_extensions = {
        str(row[0])
        for row in await connection.execute(
            text("SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm')"),
        )
    }
    missing_extensions = required_extensions - installed_extensions
    if missing_extensions:
        raise RuntimeError(f"required PostgreSQL extensions are missing: {sorted(missing_extensions)}")

    index_names, constraint_names = _named_metadata_objects()
    expected_indexes = _expected_indexes()
    if index_names:
        rows = await connection.execute(
            text(
                """
                SELECT idx.relname, i.indisvalid, i.indisready,
                       t.relname, am.amname, i.indisunique,
                       pg_get_expr(i.indpred, i.indrelid), pg_get_indexdef(i.indexrelid),
                       ARRAY(SELECT a.attname FROM unnest(i.indkey) WITH ORDINALITY AS key(attnum, ordinality)
                             LEFT JOIN pg_attribute AS a ON a.attrelid = i.indrelid AND a.attnum = key.attnum
                             ORDER BY key.ordinality),
                       ARRAY(SELECT opc.opcname FROM unnest(i.indclass) WITH ORDINALITY AS key(opcoid, ordinality)
                             JOIN pg_opclass AS opc ON opc.oid = key.opcoid ORDER BY key.ordinality)
                FROM pg_index AS i
                JOIN pg_class AS idx ON idx.oid = i.indexrelid
                JOIN pg_class AS t ON t.oid = i.indrelid
                JOIN pg_namespace AS n ON n.oid = idx.relnamespace
                JOIN pg_am AS am ON am.oid = idx.relam
                WHERE n.nspname = current_schema() AND idx.relname = ANY(:names)
                """,
            ),
            {"names": sorted(index_names)},
        )
        actual_indexes = {
            str(row[0]): {
                "valid": bool(row[1]), "ready": bool(row[2]), "table": str(row[3]),
                "access_method": str(row[4]), "unique": bool(row[5]),
                "predicate": _normalise_expression(row[6]), "definition": str(row[7]).lower(),
                "columns": tuple(str(value) for value in (row[8] or ()) if value is not None),
                "opclasses": tuple(str(value) for value in (row[9] or ()) if value is not None),
            }
            for row in rows
        }
        missing_indexes = index_names - set(actual_indexes)
        invalid_indexes = {
            name for name, value in actual_indexes.items() if not value["valid"] or not value["ready"]
        }
        if missing_indexes or invalid_indexes:
            raise RuntimeError(
                f"canonical indexes missing/invalid: missing={sorted(missing_indexes)} invalid={sorted(invalid_indexes)}",
            )
        def differs(name: str, key: str, value: dict[str, object]) -> bool:
            expected = expected_indexes[name][key]
            if key == "opclasses" and not expected:
                return False  # PostgreSQL records implicit default opclasses.
            return value[key] != expected

        index_drift = {
            name: {key: value[key] for key in ("table", "access_method", "unique", "predicate", "columns", "opclasses")
                   if differs(name, key, value)}
            for name, value in actual_indexes.items()
            if name in expected_indexes
            and any(differs(name, key, value) for key in ("table", "access_method", "unique", "predicate", "columns", "opclasses"))
        }
        if index_drift:
            raise RuntimeError(f"canonical index definition drift: {index_drift}")

    if constraint_names:
        rows = await connection.execute(
            text(
                """
                SELECT c.conname, c.convalidated
                FROM pg_constraint AS c
                JOIN pg_namespace AS n ON n.oid = c.connamespace
                WHERE n.nspname = current_schema() AND c.conname = ANY(:names)
                """,
            ),
            {"names": sorted(constraint_names)},
        )
        actual_constraints = {str(row[0]): bool(row[1]) for row in rows}
        missing_constraints = constraint_names - set(actual_constraints)
        invalid_constraints = {
            name for name, validated in actual_constraints.items() if not validated
        }
        if missing_constraints or invalid_constraints:
            raise RuntimeError(
                "canonical constraints missing/unvalidated: "
                f"missing={sorted(missing_constraints)} invalid={sorted(invalid_constraints)}",
            )


async def initialize_schema(engine: AsyncEngine) -> None:
    """Create the canonical schema once during controlled bootstrap.

    Runtime application startup must not call this function.  The initializer
    is deliberately explicit and fail-closed: extension/index/constraint
    checks run after ``create_all`` and any drift raises before loaders run.
    """

    register_models()
    async with engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await connection.run_sync(Base.metadata.create_all)
        if connection.dialect.name == "postgresql":
            await _verify_postgres_contract(connection)
