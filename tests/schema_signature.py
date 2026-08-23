# ruff: noqa: C901, EM102, PLC0415, PLR0912, PLR0915, PLR2004, S608, SIM117
"""
Read-only PostgreSQL schema introspection and canonical assertions.

This module deliberately imports application models only inside the metadata
helper.  It never imports ``prepare_app``, loaders, or migrations and never
executes DDL/DML.  Every catalog query runs in a transaction explicitly marked
read-only before the first query.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import sys
from collections.abc import Mapping
from typing import Any
from urllib.parse import quote

from sqlalchemy import text
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, create_async_engine

if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    # Psycopg's async implementation cannot run on Windows' Proactor loop.
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

LEGACY_COLUMNS = {
    ("chapter", "name"),
    ("analyze_result_items", "chapter"),
    ("test_catalog_stat", "question_count"),
    ("test_question", "chapter_id"),
    ("user", "onboarding_completed"),
}
SchemaSignature = dict[str, Any]


def configured_postgres_url() -> str | None:
    """
    Return a PostgreSQL URL without logging or exposing credentials.

    ``TEST_DATABASE_URL`` is preferred.  When it is absent, the five
    ``POSTGRES_*`` values are assembled locally so this gate can inspect the
    configured Docker database without importing application bootstrap code.
    """
    direct = os.environ.get("TEST_DATABASE_URL", "").strip()
    if direct:
        return direct

    keys = ("POSTGRES_DB", "POSTGRES_HOST", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_PORT")
    values = {key: os.environ.get(key, "").strip() for key in keys}
    port = values["POSTGRES_PORT"]
    postgres_values = {key: values[key] for key in keys[:4]}
    if not all(postgres_values.values()) or not port:
        return None
    try:
        parsed_port = int(port)
    except ValueError:
        return None
    return (
        f"postgresql+psycopg://{quote(values['POSTGRES_USER'], safe='')}"
        f":{quote(values['POSTGRES_PASSWORD'], safe='')}@{values['POSTGRES_HOST']}"
        f":{parsed_port}/{quote(values['POSTGRES_DB'], safe='')}"
    )


def registered_metadata():
    """Return the complete current ORM metadata with explicit model imports."""
    # ``src.models`` intentionally imports all normal models but does not own
    # the favorites module registration, so import that model explicitly.
    import src.analyze.models
    import src.auth.models
    import src.favorites.models
    import src.models
    import src.terms.models
    import src.tests.models
    import src.topics.models
    import src.users.models  # noqa: F401
    from src.database import Base

    return Base.metadata


def _normalise_type(value: object) -> str:
    result = re.sub(r"\s+", " ", str(value).strip().lower())
    result = result.replace('"', "")
    replacements = {
        "character varying": "varchar",
        "timestamp with time zone": "timestamptz",
        "timestamp without time zone": "timestamp",
        "double precision": "float8",
        "float": "float8",
        "integer": "int4",
        "bigint": "int8",
        "smallint": "int2",
        "boolean": "bool",
    }
    for source, target in replacements.items():
        token_pattern = rf"(?<![a-z0-9_]){re.escape(source)}(?![a-z0-9_])"
        result = re.sub(token_pattern, target, result)
    return result


def _strip_redundant_outer_parentheses(value: str) -> str:
    while value.startswith("(") and value.endswith(")"):
        depth = 0
        encloses_all = True
        for index, character in enumerate(value):
            if character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
                if depth == 0 and index != len(value) - 1:
                    encloses_all = False
                    break
        if not encloses_all or depth != 0:
            break
        value = value[1:-1].strip()
    return value


def _normalise_any_array_literals(value: str) -> str:
    """Canonicalize finite non-null ``= ANY (ARRAY[...])`` checks to ``IN``."""
    pattern = re.compile(r"=\s*any\s*\(\s*array\s*\[([^\]]*)\]\s*(?:\[\])?\s*\)")

    def replace(match: re.Match[str]) -> str:
        values = [item.strip() for item in match.group(1).split(",")]
        literal = re.compile(r"(?:'[^']*'|[-+]?(?:\d+(?:\.\d*)?|\.\d+))$")
        if not values or any(not literal.fullmatch(item) for item in values):
            return match.group(0)
        return " in (" + ", ".join(values) + ")"

    return pattern.sub(replace, value)


def _normalise_expression(value: object) -> str | None:
    if value is None:
        return None
    result = re.sub(r"\s+", " ", str(value).strip().lower())
    result = result.replace('"', "")
    result = re.sub(r"::[a-z_][a-z_ ]*", "", result)
    result = _normalise_any_array_literals(result)
    result = _strip_redundant_outer_parentheses(result)
    result = re.sub(r"\(\s*([^()]*)\s*\)", r"(\1)", result)
    result = re.sub(r"\s+", " ", result).strip()
    return result or None


async def introspect_postgres_schema(engine: AsyncEngine) -> dict[str, Any]:
    """Capture a deterministic PostgreSQL catalog signature using read-only SQL."""
    async with engine.connect() as connection:
        async with connection.begin():
            await connection.execute(text("SET TRANSACTION READ ONLY"))
            read_only = str((await connection.execute(text("SHOW transaction_read_only"))).scalar_one()).lower() == "on"
            schema_name = str((await connection.execute(text("SELECT current_schema()"))).scalar_one())
            server = await connection.execute(
                text(
                    "SELECT current_setting('server_version_num')::integer AS version_num, "
                    "current_setting('server_version') AS version",
                ),
            )
            server_row = server.mappings().one()
            extensions = await connection.execute(
                text(
                    "SELECT extname FROM pg_extension "
                    "WHERE extname IN ('vector', 'pg_trgm') ORDER BY extname",
                ),
            )
            tables = await connection.execute(
                text(
                    "SELECT table_name FROM information_schema.tables "
                    "WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' "
                    "ORDER BY table_name",
                ),
            )
            columns = await connection.execute(
                text(
                    """
                    SELECT n.nspname AS schema_name, c.relname AS table_name,
                           a.attname AS column_name, a.attnotnull AS not_null,
                           format_type(a.atttypid, a.atttypmod) AS formatted_type,
                           pg_get_expr(ad.adbin, ad.adrelid) AS server_default
                    FROM pg_class AS c
                    JOIN pg_namespace AS n ON n.oid = c.relnamespace
                    JOIN pg_attribute AS a ON a.attrelid = c.oid
                    LEFT JOIN pg_attrdef AS ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
                    WHERE n.nspname = current_schema() AND c.relkind IN ('r', 'p')
                      AND a.attnum > 0 AND NOT a.attisdropped
                    ORDER BY c.relname, a.attnum
                    """,
                ),
            )
            indexes = await connection.execute(
                text(
                    """
                    SELECT i.relname AS index_name, t.relname AS table_name,
                           am.amname AS access_method, ix.indisunique AS is_unique,
                           ix.indisvalid AS is_valid, ix.indisready AS is_ready,
                           pg_get_expr(ix.indpred, ix.indrelid) AS predicate,
                           pg_get_indexdef(i.oid) AS index_definition,
                           ARRAY(
                             SELECT a.attname
                             FROM unnest(ix.indkey) WITH ORDINALITY AS key(attnum, ordinality)
                             LEFT JOIN pg_attribute AS a
                               ON a.attrelid = ix.indrelid AND a.attnum = key.attnum
                             ORDER BY key.ordinality
                           ) AS columns,
                           ARRAY(
                             SELECT opc.opcname
                             FROM unnest(ix.indclass) WITH ORDINALITY AS key(opcoid, ordinality)
                             JOIN pg_opclass AS opc ON opc.oid = key.opcoid
                             ORDER BY key.ordinality
                           ) AS opclasses
                    FROM pg_index AS ix
                    JOIN pg_class AS i ON i.oid = ix.indexrelid
                    JOIN pg_class AS t ON t.oid = ix.indrelid
                    JOIN pg_namespace AS n ON n.oid = t.relnamespace
                    JOIN pg_am AS am ON am.oid = i.relam
                    WHERE n.nspname = current_schema()
                    ORDER BY i.relname
                    """,
                ),
            )
            constraints = await connection.execute(
                text(
                    """
                    SELECT c.conname AS constraint_name, t.relname AS table_name,
                           c.contype AS constraint_type, c.convalidated AS is_valid,
                           pg_get_constraintdef(c.oid, true) AS definition,
                           ARRAY(
                             SELECT a.attname
                             FROM unnest(c.conkey) WITH ORDINALITY AS key(attnum, ordinality)
                             JOIN pg_attribute AS a
                               ON a.attrelid = c.conrelid AND a.attnum = key.attnum
                             ORDER BY key.ordinality
                           ) AS columns,
                           rt.relname AS referenced_table,
                           ARRAY(
                             SELECT a.attname
                             FROM unnest(c.confkey) WITH ORDINALITY AS key(attnum, ordinality)
                             JOIN pg_attribute AS a
                               ON a.attrelid = c.confrelid AND a.attnum = key.attnum
                             ORDER BY key.ordinality
                           ) AS referenced_columns
                    FROM pg_constraint AS c
                    JOIN pg_class AS t ON t.oid = c.conrelid
                    JOIN pg_namespace AS n ON n.oid = t.relnamespace
                    LEFT JOIN pg_class AS rt ON rt.oid = c.confrelid
                    WHERE n.nspname = current_schema()
                    ORDER BY t.relname, c.conname
                    """,
                ),
            )

            signature: dict[str, Any] = {
                "schema": schema_name,
                "transaction_read_only": read_only,
                "server_version_num": int(server_row["version_num"]),
                "server_version": str(server_row["version"]),
                "extensions": tuple(str(row[0]) for row in extensions),
                "tables": tuple(str(row[0]) for row in tables),
                "columns": {},
                "indexes": {},
                "constraints": {},
            }
            for row in columns.mappings():
                table = str(row["table_name"])
                signature["columns"].setdefault(table, {})[str(row["column_name"])] = {
                    "type": _normalise_type(row["formatted_type"]),
                    "nullable": not bool(row["not_null"]),
                    "default": _normalise_expression(row["server_default"]),
                }
            for row in indexes.mappings():
                signature["indexes"][str(row["index_name"])] = {
                    "table": str(row["table_name"]),
                    "access_method": str(row["access_method"]),
                    "unique": bool(row["is_unique"]),
                    "valid": bool(row["is_valid"]),
                    "ready": bool(row["is_ready"]),
                    "predicate": _normalise_expression(row["predicate"]),
                    "columns": tuple(str(value) for value in (row["columns"] or ()) if value is not None),
                    "opclasses": tuple(str(value) for value in (row["opclasses"] or ()) if value is not None),
                    "definition": _normalise_expression(row["index_definition"]),
                }
            for row in constraints.mappings():
                signature["constraints"][str(row["constraint_name"])] = {
                    "table": str(row["table_name"]),
                    "type": str(row["constraint_type"]),
                    "valid": bool(row["is_valid"]),
                    "definition": _normalise_expression(row["definition"]),
                    "columns": tuple(str(value) for value in (row["columns"] or ()) if value is not None),
                    "referenced_table": str(row["referenced_table"]) if row["referenced_table"] else None,
                    "referenced_columns": tuple(str(value) for value in (row["referenced_columns"] or ()) if value is not None),
                }
            await _extend_schema_signature(connection, signature)
            return signature


def _quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


async def _extend_schema_signature(connection: AsyncConnection, signature: SchemaSignature) -> None:
    """Collect deterministic catalog/data inventory without changing state."""
    sequences = await connection.execute(
        text(
            """
            SELECT n.nspname AS schema_name, c.relname AS sequence_name,
                   format_type(s.seqtypid, NULL) AS sequence_type,
                   s.seqmin, s.seqmax, s.seqstart, s.seqincrement,
                   s.seqcycle, s.seqcache,
                   owner_table.relname AS owned_table,
                   owner_column.attname AS owned_column,
                   pg_get_userbyid(c.relowner) AS owner,
                   c.relacl AS acl
            FROM pg_class AS c
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            JOIN pg_sequence AS s ON s.seqrelid = c.oid
            LEFT JOIN pg_depend AS dep
              ON dep.objid = c.oid AND dep.deptype = 'a'
            LEFT JOIN pg_class AS owner_table ON owner_table.oid = dep.refobjid
            LEFT JOIN pg_attribute AS owner_column
              ON owner_column.attrelid = dep.refobjid AND owner_column.attnum = dep.refobjsubid
            WHERE n.nspname = current_schema()
            ORDER BY c.relname
            """,
        ),
    )
    signature["sequences"] = {}
    for row in sequences.mappings():
        sequence_name = str(row["sequence_name"])
        sequence_table = _quote_identifier(str(row["schema_name"])) + "." + _quote_identifier(sequence_name)
        state = await connection.execute(
            text(f"SELECT last_value, is_called FROM {sequence_table}"),
        )
        state_row = state.mappings().one()
        signature["sequences"][sequence_name] = {
            "schema": str(row["schema_name"]),
            "type": _normalise_type(row["sequence_type"]),
            "min": int(row["seqmin"]),
            "max": int(row["seqmax"]),
            "start": int(row["seqstart"]),
            "increment": int(row["seqincrement"]),
            "cycle": bool(row["seqcycle"]),
            "cache": int(row["seqcache"]),
            "current": int(state_row["last_value"]),
            "is_called": bool(state_row["is_called"]),
            "owned_by": (
                f"{row['owned_table']}.{row['owned_column']}"
                if row["owned_table"] and row["owned_column"] else None
            ),
            "owner": str(row["owner"]),
            "acl": tuple(str(value) for value in (row["acl"] or ())),
        }

    object_rows = await connection.execute(
        text(
            """
            SELECT c.relkind, c.relname, pg_get_userbyid(c.relowner) AS owner,
                   c.relacl AS acl, n.nspname AS schema_name
            FROM pg_class AS c
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema()
              AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'i', 'f')
            ORDER BY c.relkind, c.relname
            """,
        ),
    )
    signature["owners_acls"] = {
        f"{row['schema_name']}.{row['relname']}": {
            "kind": str(row["relkind"]),
            "owner": str(row["owner"]),
            "acl": tuple(str(value) for value in (row["acl"] or ())),
        }
        for row in object_rows.mappings()
    }
    schemas = await connection.execute(
        text(
            """
            SELECT nspname, pg_get_userbyid(nspowner) AS owner, nspacl
            FROM pg_namespace
            WHERE nspname = current_schema()
            """,
        ),
    )
    for row in schemas.mappings():
        signature["owners_acls"][f"schema:{row['nspname']}"] = {
            "kind": "namespace",
            "owner": str(row["owner"]),
            "acl": tuple(str(value) for value in (row["nspacl"] or ())),
        }

    triggers = await connection.execute(
        text(
            """
            SELECT c.relname AS table_name, t.tgname,
                   pg_get_triggerdef(t.oid, true) AS definition
            FROM pg_trigger AS t
            JOIN pg_class AS c ON c.oid = t.tgrelid
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema() AND NOT t.tgisinternal
            ORDER BY c.relname, t.tgname
            """,
        ),
    )
    signature["triggers"] = [
        {
            "table": str(row["table_name"]),
            "name": str(row["tgname"]),
            "definition": _normalise_expression(row["definition"]),
        }
        for row in triggers.mappings()
    ]

    views = await connection.execute(
        text(
            """
            SELECT c.relkind, c.relname,
                   pg_get_viewdef(c.oid, true) AS definition,
                   pg_get_userbyid(c.relowner) AS owner, c.relacl AS acl
            FROM pg_class AS c
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema() AND c.relkind IN ('v', 'm')
            ORDER BY c.relname
            """,
        ),
    )
    signature["views"] = [
        {
            "kind": str(row["relkind"]),
            "name": str(row["relname"]),
            "definition": _normalise_expression(row["definition"]),
            "owner": str(row["owner"]),
            "acl": tuple(str(value) for value in (row["acl"] or ())),
        }
        for row in views.mappings()
    ]

    rules = await connection.execute(
        text(
            """
            SELECT c.relname AS table_name, r.rulename,
                   pg_get_ruledef(r.oid, true) AS definition
            FROM pg_rewrite AS r
            JOIN pg_class AS c ON c.oid = r.ev_class
            JOIN pg_namespace AS n ON n.oid = c.relnamespace
            WHERE n.nspname = current_schema() AND r.rulename <> '_RETURN'
            ORDER BY c.relname, r.rulename
            """,
        ),
    )
    signature["rules"] = [
        {
            "table": str(row["table_name"]),
            "name": str(row["rulename"]),
            "definition": _normalise_expression(row["definition"]),
        }
        for row in rules.mappings()
    ]

    dependencies = await connection.execute(
        text(
            """
            SELECT obj_ns.nspname AS object_schema, obj.relname AS object_name,
                   obj.relkind AS object_kind, d.objsubid,
                   ref_ns.nspname AS referenced_schema, ref.relname AS referenced_name,
                   ref.relkind AS referenced_kind, d.refobjsubid, d.deptype
            FROM pg_depend AS d
            JOIN pg_class AS obj ON obj.oid = d.objid
            JOIN pg_namespace AS obj_ns ON obj_ns.oid = obj.relnamespace
            LEFT JOIN pg_class AS ref ON ref.oid = d.refobjid
            LEFT JOIN pg_namespace AS ref_ns ON ref_ns.oid = ref.relnamespace
            WHERE obj_ns.nspname = current_schema()
              AND d.deptype <> 'i'
            ORDER BY object_name, d.objsubid, referenced_name, d.refobjsubid, d.deptype
            """,
        ),
    )
    signature["dependencies"] = [dict(row) for row in dependencies.mappings()]

    extensions = await connection.execute(
        text(
            """
            SELECT extname, extversion, pg_get_userbyid(extowner) AS owner,
                   extrelocatable, extconfig
            FROM pg_extension ORDER BY extname
            """,
        ),
    )
    signature["extensions_detail"] = [
        {
            "name": str(row["extname"]),
            "version": str(row["extversion"]),
            "owner": str(row["owner"]),
            "relocatable": bool(row["extrelocatable"]),
            "config": tuple(int(value) for value in (row["extconfig"] or ())),
        }
        for row in extensions.mappings()
    ]

    signature["table_data"] = {}
    metadata = registered_metadata()
    primary_keys = {
        item["table"]: tuple(item.get("columns", ()))
        for item in signature["constraints"].values()
        if item.get("type") == "p"
    }
    for table_name in sorted(set(signature.get("tables", ())) | set(metadata.tables)):
        quoted_table = _quote_identifier(table_name)
        pk_columns = primary_keys.get(table_name, ())
        count_result = await connection.execute(text(f"SELECT count(*)::bigint AS row_count FROM {quoted_table}"))
        row_count = int(count_result.scalar_one())
        table_data: dict[str, Any] = {"row_count": row_count, "primary_key": pk_columns}
        if pk_columns:
            order_by = ", ".join(f"t.{_quote_identifier(column)}" for column in pk_columns)
            hash_result = await connection.execute(
                text(
                    f"SELECT md5(COALESCE(string_agg(md5(to_jsonb(t)::text), '' ORDER BY {order_by}), '')) "
                    f"AS row_hash FROM {quoted_table} AS t",
                ),
            )
            table_data["row_hash"] = str(hash_result.scalar_one())
        else:
            table_data["row_hash"] = None
        signature["table_data"][table_name] = table_data

    graph = {
        "column": {
            "orm_type": _normalise_type("BIGINT"),
            "db": signature["columns"].get("test_catalog_generation", {}).get("id"),
        },
        "referenced_by": [
            {
                "table": table_name,
                "column": column_name,
                "db": signature["columns"].get(table_name, {}).get(column_name),
                "target": signature["columns"].get("test_catalog_generation", {}).get("id"),
            }
            for table_name, columns in signature["columns"].items()
            for column_name in columns
            if any(
                item["referenced_table"] == "test_catalog_generation"
                and item["referenced_columns"] == ("id",)
                and item["table"] == table_name
                and item["columns"] == (column_name,)
                for item in signature["constraints"].values()
            )
        ],
        "sequences": {
            name: value for name, value in signature["sequences"].items()
            if value["owned_by"] == "test_catalog_generation.id"
        },
        "constraints": {
            name: value for name, value in signature["constraints"].items()
            if value["table"] == "test_catalog_generation"
            or value.get("referenced_table") == "test_catalog_generation"
        },
        "indexes": {
            name: value for name, value in signature["indexes"].items()
            if value["table"] == "test_catalog_generation"
            or value["table"] in {item["table"] for item in signature["constraints"].values() if item.get("referenced_table") == "test_catalog_generation"}
        },
        "catalog_dependencies": [
            item for item in signature["dependencies"]
            if item.get("object_name") == "test_catalog_generation"
            or item.get("referenced_name") == "test_catalog_generation"
        ],
    }
    signature["test_catalog_generation_id_dependency_graph"] = graph


async def read_schema_signature(connection: AsyncConnection) -> SchemaSignature:
    """
    Read the canonical signature without permitting schema or data writes.

    The caller owns the connection.  The small bound-engine adapter lets the
    existing catalog collector keep its transaction boundary while ensuring
    ``engine.connect()`` yields this exact connection instead of borrowing a
    second pooled connection.
    """

    class _BoundConnection:
        def __init__(self, bound: AsyncConnection) -> None:
            self.bound = bound

        async def __aenter__(self) -> AsyncConnection:
            return self.bound

        async def __aexit__(self, exc_type, exc_value, traceback) -> bool:
            return False

    class _BoundEngine:
        def __init__(self, bound: AsyncConnection) -> None:
            self.bound = bound

        def connect(self) -> _BoundConnection:
            return _BoundConnection(self.bound)

    return await introspect_postgres_schema(_BoundEngine(connection))


def _expected_metadata_indexes(metadata) -> dict[str, dict[str, Any]]:
    dialect = postgresql.dialect()
    expected: dict[str, dict[str, Any]] = {}
    for table in metadata.tables.values():
        for index in table.indexes:
            where = index.dialect_options["postgresql"].get("where")
            predicate = None if where is None else _normalise_expression(where.compile(dialect=dialect))
            using = index.dialect_options["postgresql"].get("using") or "btree"
            ops = index.dialect_options["postgresql"].get("ops") or {}
            expected[str(index.name)] = {
                "table": table.name,
                "access_method": str(using),
                "unique": bool(index.unique),
                "predicate": predicate,
                "columns": tuple(column.name for column in index.columns),
                "opclasses": tuple(str(ops.get(column.name)) for column in index.columns if ops.get(column.name)),
            }
    expected["idx_term_name_trgm"] = {
        "table": "term", "access_method": "gin", "unique": False,
        "predicate": None, "columns": ("name",), "opclasses": ("gin_trgm_ops",),
    }
    expected["uq_chapter_code"] = {
        "table": "chapter", "access_method": "btree", "unique": True,
        "predicate": None, "columns": ("code",), "opclasses": (),
    }
    return expected


def _jsonable(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [_jsonable(item) for item in value]
    if isinstance(value, set):
        return sorted(_jsonable(item) for item in value)
    return value


def collect_schema_mismatches(signature: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Collect every ORM/catalog mismatch without stopping at the first one."""
    metadata = registered_metadata()
    mismatches: list[dict[str, Any]] = []

    def mismatch(kind: str, **details: Any) -> None:
        mismatches.append({"kind": kind, **details})

    version = int(signature.get("server_version_num", 0))
    if not 170000 <= version < 180000:
        mismatch("server_version", expected="postgresql17", actual=version)
    if not signature.get("transaction_read_only", False):
        mismatch("transaction_mode", expected=True, actual=False)
    for extension in ("vector", "pg_trgm"):
        if extension not in signature.get("extensions", ()):
            mismatch("extension_missing", extension=extension)

    actual_tables = set(signature.get("columns", {}))
    expected_tables = set(metadata.tables)
    for table_name in sorted(expected_tables - actual_tables):
        mismatch("table_missing", table=table_name)
    for table_name in sorted(actual_tables - expected_tables):
        mismatch("table_unexpected", table=table_name)

    dialect = postgresql.dialect()
    for table in metadata.tables.values():
        actual_columns = signature.get("columns", {}).get(table.name, {})
        expected_columns = set(table.columns.keys())
        for column_name in sorted(expected_columns - set(actual_columns)):
            mismatch("column_missing", table=table.name, column=column_name)
        for column_name in sorted(set(actual_columns) - expected_columns):
            mismatch("column_unexpected", table=table.name, column=column_name)
        for column in table.columns:
            actual = actual_columns.get(column.name)
            if actual is None:
                continue
            expected_type = _normalise_type(column.type.compile(dialect=dialect))
            if actual.get("type") != expected_type:
                mismatch("column_type", table=table.name, column=column.name, expected=expected_type, actual=actual.get("type"))
            expected_nullable = bool(column.nullable)
            if actual.get("nullable") != expected_nullable:
                mismatch("column_nullability", table=table.name, column=column.name, expected=expected_nullable, actual=actual.get("nullable"))
            if column.server_default is not None:
                expected_default = _normalise_expression(column.server_default.arg)
                if actual.get("default") != expected_default:
                    mismatch("column_default", table=table.name, column=column.name, expected=expected_default, actual=actual.get("default"))
            elif len(table.primary_key.columns) == 1 and column.autoincrement is True and actual.get("default") is not None:
                expected_sequence_default = _normalise_expression(
                    f"nextval('{table.name}_{column.name}_seq'::regclass)",
                )
                if actual.get("default") != expected_sequence_default:
                    mismatch("column_default", table=table.name, column=column.name, expected=expected_sequence_default, actual=actual.get("default"))
            elif actual.get("default") is not None:
                mismatch("column_unexpected_default", table=table.name, column=column.name, actual=actual.get("default"))

    for table, column in sorted(LEGACY_COLUMNS):
        if column in signature.get("columns", {}).get(table, {}):
            mismatch("legacy_column_present", table=table, column=column)
    if "chapter_alias" in signature.get("tables", ()):
        mismatch("legacy_table_present", table="chapter_alias")

    indexes = signature.get("indexes", {})
    expected_indexes = _expected_metadata_indexes(metadata)
    constraints = signature.get("constraints", {})
    for name in sorted(set(indexes) - set(expected_indexes)):
        backing_constraint = constraints.get(name)
        if (
            backing_constraint is not None
            and backing_constraint.get("type") in {"p", "u", "x"}
            and backing_constraint.get("table") == indexes[name].get("table")
            and tuple(backing_constraint.get("columns", ())) == tuple(indexes[name].get("columns", ()))
        ):
            continue
        mismatch("index_unexpected", index=name, actual=indexes[name])
    for name, expected in expected_indexes.items():
        actual = indexes.get(name)
        if actual is None:
            mismatch("index_missing", index=name, expected=expected)
            continue
        for key in ("table", "access_method", "unique", "predicate", "columns"):
            if actual.get(key) != expected[key]:
                mismatch("index_property", index=name, property=key, expected=expected[key], actual=actual.get(key))
        if expected["opclasses"] and tuple(actual.get("opclasses", ())[-len(expected["opclasses"]):]) != expected["opclasses"]:
            mismatch("index_opclass", index=name, expected=expected["opclasses"], actual=actual.get("opclasses"))
        for key in ("valid", "ready"):
            if not actual.get(key, False):
                mismatch("index_state", index=name, property=key, expected=True, actual=actual.get(key))

    for table in metadata.tables.values():
        primary = tuple(column.name for column in table.primary_key.columns)
        if not any(item.get("table") == table.name and item.get("type") == "p" and tuple(item.get("columns", ())) == primary for item in constraints.values()):
            mismatch("primary_key", table=table.name, expected=primary)
        for constraint in table.constraints:
            class_name = constraint.__class__.__name__
            if class_name == "UniqueConstraint":
                columns = tuple(column.name for column in constraint.columns)
                if not any(item.get("table") == table.name and item.get("type") == "u" and tuple(item.get("columns", ())) == columns and (constraint.name is None or name == constraint.name) for name, item in constraints.items()):
                    mismatch("unique_constraint", table=table.name, constraint=constraint.name, expected=columns)
            elif class_name == "CheckConstraint":
                actual = constraints.get(constraint.name)
                expected = _normalise_expression(f"CHECK ({_normalise_expression(constraint.sqltext)})")
                if actual is None:
                    mismatch("check_constraint_missing", table=table.name, constraint=constraint.name)
                elif actual.get("definition") != expected:
                    mismatch("check_constraint", table=table.name, constraint=constraint.name, expected=expected, actual=actual.get("definition"))
            elif class_name == "ForeignKeyConstraint":
                source = tuple(column.name for column in constraint.columns)
                target = tuple(element.target_fullname.rsplit(".", 1)[-1] for element in constraint.elements)
                target_table = constraint.elements[0].column.table.name
                ondelete = (constraint.elements[0].ondelete or "").lower()
                if not any(
                    item.get("table") == table.name and item.get("type") == "f"
                    and tuple(item.get("columns", ())) == source
                    and item.get("referenced_table") == target_table
                    and tuple(item.get("referenced_columns", ())) == target
                    and (not ondelete or f"on delete {ondelete}" in (item.get("definition") or ""))
                    for item in constraints.values()
                ):
                    mismatch("foreign_key", table=table.name, expected_source=source, expected_target=f"{target_table}.{target}", expected_ondelete=ondelete or None)

    favorite_expected = {
        "favorite_term_pkey": ("p", ("user_id", "term_id"), None),
        "favorite_term_user_id_fkey": ("f", ("user_id",), "cascade"),
        "favorite_term_term_id_fkey": ("f", ("term_id",), "cascade"),
    }
    for name, (kind, columns, ondelete) in favorite_expected.items():
        actual = constraints.get(name)
        if actual is None:
            mismatch("favorite_constraint_missing", constraint=name)
            continue
        if actual.get("type") != kind or tuple(actual.get("columns", ())) != columns:
            mismatch("favorite_constraint", constraint=name, expected_type=kind, expected_columns=columns, actual=actual)
        if ondelete and f"on delete {ondelete}" not in (actual.get("definition") or ""):
            mismatch("favorite_ondelete", constraint=name, expected=ondelete, actual=actual.get("definition"))

    sequences = signature.get("sequences", {})
    for table in metadata.tables.values():
        if len(table.primary_key.columns) != 1:
            continue
        for column in table.primary_key.columns:
            if column.autoincrement is not True:
                continue
            sequence_name = f"{table.name}_{column.name}_seq"
            sequence = sequences.get(sequence_name)
            expected_type = _normalise_type(column.type.compile(dialect=dialect))
            if sequence is None:
                mismatch("sequence_missing", sequence=sequence_name, expected_type=expected_type)
                continue
            if sequence.get("type") != expected_type:
                mismatch("sequence_type", sequence=sequence_name, expected=expected_type, actual=sequence.get("type"))
            if sequence.get("owned_by") != f"{table.name}.{column.name}":
                mismatch("sequence_owned_by", sequence=sequence_name, expected=f"{table.name}.{column.name}", actual=sequence.get("owned_by"))

    generation = signature.get("test_catalog_generation_id_dependency_graph", {})
    generation_db = generation.get("column", {}).get("db") or {}
    if generation_db.get("type") != "int8":
        mismatch("test_catalog_generation_id_type", expected="int8", actual=generation_db.get("type"), dependency_graph=generation)
    for dependent in generation.get("referenced_by", ()):
        source_type = (dependent.get("db") or {}).get("type")
        if source_type != "int8":
            mismatch("test_catalog_generation_fk_type", table=dependent.get("table"), column=dependent.get("column"), expected="int8", actual=source_type, dependency_graph=generation)

    return mismatches


def build_schema_mismatch_manifest(signature: Mapping[str, Any]) -> dict[str, Any]:
    """Return a deterministic JSON-serializable inventory and mismatch report."""
    mismatches = collect_schema_mismatches(signature)
    return {
        "mismatches": mismatches,
        "mismatch_count": len(mismatches),
        "signature": _jsonable(signature),
        "json": json.dumps(mismatches, sort_keys=True, separators=(",", ":")),
    }


schema_mismatch_manifest = build_schema_mismatch_manifest


def _cli_database_url() -> str:
    """Return the explicitly supplied CLI URL without exposing credentials."""
    database_url = os.environ.get("TEST_DATABASE_URL", "").strip()
    if not database_url:
        raise ValueError("TEST_DATABASE_URL is required")
    if not database_url.startswith("postgresql+psycopg://"):
        raise ValueError("TEST_DATABASE_URL must use postgresql+psycopg://")
    return database_url


async def _capture_cli_manifest() -> dict[str, Any]:
    """Capture one complete read-only signature for the CLI entrypoint."""
    engine = create_async_engine(_cli_database_url(), pool_size=1, max_overflow=0)
    try:
        async with engine.connect() as connection:
            signature = await read_schema_signature(connection)
        return build_schema_mismatch_manifest(signature)
    finally:
        await engine.dispose()


def main() -> int:
    """Emit a JSON schema/mismatch manifest; return 1 when drift is found."""
    try:
        # Validate this controlled input separately so a runtime ValueError can
        # never echo a driver message that might contain a password-bearing URL.
        _cli_database_url()
    except ValueError as exc:
        print(f"schema signature configuration error: {exc}", file=sys.stderr)
        return 2

    try:
        manifest = asyncio.run(_capture_cli_manifest())
    except Exception as exc:  # noqa: BLE001  # pragma: no cover - exercised by live CLI failures
        # Do not print driver exception text: it can contain a password-bearing URL.
        print(f"schema signature failed: {type(exc).__name__}", file=sys.stderr)
        return 2

    payload = json.dumps(_jsonable(manifest), sort_keys=True, indent=2)
    print(payload)
    mismatch_count = int(manifest["mismatch_count"])
    table_count = len(manifest["signature"].get("tables", ()))
    print(
        f"schema signature captured: tables={table_count} mismatches={mismatch_count}",
        file=sys.stderr,
    )
    return 1 if mismatch_count else 0


def _assert_metadata_columns(signature: Mapping[str, Any], metadata) -> None:
    actual_columns = signature["columns"]
    missing_tables = sorted(set(metadata.tables) - set(actual_columns))
    if missing_tables:
        raise AssertionError(f"missing ORM metadata tables: {missing_tables}")
    dialect = postgresql.dialect()
    for table in metadata.tables.values():
        actual_table = actual_columns[table.name]
        missing = sorted(set(table.columns.keys()) - set(actual_table))
        if missing:
            raise AssertionError(f"{table.name}: missing columns {missing}")
        for column in table.columns:
            expected_type = _normalise_type(column.type.compile(dialect=dialect))
            actual = actual_table[column.name]
            if actual["nullable"] != bool(column.nullable):
                raise AssertionError(f"{table.name}.{column.name}: nullability drift")
            if actual["type"] != expected_type:
                raise AssertionError(
                    f"{table.name}.{column.name}: type {actual['type']!r} != {expected_type!r}",
                )
            if column.server_default is not None:
                expected_default = _normalise_expression(column.server_default.arg)
                if actual["default"] != expected_default:
                    raise AssertionError(
                        f"{table.name}.{column.name}: server default "
                        f"{actual['default']!r} != {expected_default!r}",
                    )


def _assert_metadata_constraints(signature: Mapping[str, Any], metadata) -> None:
    constraints = signature["constraints"]
    for table in metadata.tables.values():
        primary = tuple(column.name for column in table.primary_key.columns)
        primary_matches = [item for item in constraints.values() if item["table"] == table.name and item["type"] == "p" and item["columns"] == primary]
        if not primary_matches:
            raise AssertionError(f"{table.name}: primary key {primary} missing")
        for constraint in table.constraints:
            if constraint.__class__.__name__ == "UniqueConstraint":
                columns = tuple(column.name for column in constraint.columns)
                matches = [item for name, item in constraints.items() if item["table"] == table.name and item["type"] == "u" and item["columns"] == columns and (constraint.name is None or name == constraint.name)]
                if not matches:
                    raise AssertionError(f"{table.name}: unique constraint {constraint.name or columns} missing")
            elif constraint.__class__.__name__ == "CheckConstraint":
                if constraint.name not in constraints:
                    raise AssertionError(f"{table.name}: check constraint {constraint.name!r} missing")
                expected = _normalise_expression(constraint.sqltext)
                if constraints[constraint.name]["definition"] != _normalise_expression(f"CHECK ({expected})"):
                    raise AssertionError(f"{constraint.name}: check expression drift")
            elif constraint.__class__.__name__ == "ForeignKeyConstraint":
                source = tuple(column.name for column in constraint.columns)
                target = tuple(element.target_fullname.rsplit(".", 1)[-1] for element in constraint.elements)
                target_table = constraint.elements[0].column.table.name
                ondelete = (constraint.elements[0].ondelete or "").lower()
                matches = [
                    item for item in constraints.values()
                    if item["table"] == table.name and item["type"] == "f"
                    and item["columns"] == source and item["referenced_table"] == target_table
                    and item["referenced_columns"] == target
                    and (not ondelete or f"on delete {ondelete}" in (item["definition"] or ""))
                ]
                if not matches:
                    raise AssertionError(f"{table.name}: foreign key {source} -> {target_table}.{target} missing")


def assert_canonical_schema(signature: Mapping[str, Any]) -> None:
    """Assert PostgreSQL 17/extensions, ORM shape, indexes, and constraints."""
    manifest = build_schema_mismatch_manifest(signature)
    if manifest["mismatches"]:
        raise AssertionError(json.dumps(manifest["mismatches"], sort_keys=True, indent=2))
    version = int(signature["server_version_num"])
    if not 170000 <= version < 180000:
        raise AssertionError(f"PostgreSQL 17 required, got server_version_num={version}")
    if not signature["transaction_read_only"]:
        raise AssertionError("schema introspection transaction was not read-only")
    missing_extensions = {"vector", "pg_trgm"} - set(signature["extensions"])
    if missing_extensions:
        raise AssertionError(f"missing PostgreSQL extensions: {sorted(missing_extensions)}")

    metadata = registered_metadata()
    _assert_metadata_columns(signature, metadata)
    for table, column in LEGACY_COLUMNS:
        if column in signature["columns"].get(table, {}):
            raise AssertionError(f"legacy column remains: {table}.{column}")
    if "chapter_alias" in signature["tables"]:
        raise AssertionError("legacy chapter_alias table remains")

    indexes = signature["indexes"]
    for name, expected in _expected_metadata_indexes(metadata).items():
        actual = indexes.get(name)
        if actual is None:
            raise AssertionError(f"missing canonical index: {name}")
        for key in ("table", "access_method", "unique", "predicate", "columns"):
            if actual[key] != expected[key]:
                raise AssertionError(f"index {name}: {key} {actual[key]!r} != {expected[key]!r}")
        if expected["opclasses"] and actual["opclasses"][-len(expected["opclasses"]):] != expected["opclasses"]:
            raise AssertionError(f"index {name}: opclass drift")
        if not actual["valid"] or not actual["ready"]:
            raise AssertionError(f"index {name}: PostgreSQL index is invalid or not ready")

    _assert_metadata_constraints(signature, metadata)
    favorite_constraints = {
        "favorite_term_pkey": ("p", ("user_id", "term_id"), None),
        "favorite_term_user_id_fkey": ("f", ("user_id",), "cascade"),
        "favorite_term_term_id_fkey": ("f", ("term_id",), "cascade"),
    }
    for name, (kind, columns, ondelete) in favorite_constraints.items():
        actual = signature["constraints"].get(name)
        if actual is None or actual["type"] != kind or actual["columns"] != columns or not actual["valid"]:
            raise AssertionError(f"favorite constraint {name} is missing or malformed")
        if ondelete and f"on delete {ondelete}" not in (actual["definition"] or ""):
            raise AssertionError(f"favorite constraint {name}: ON DELETE {ondelete.upper()} required")

    for name in (
        "fk_analyze_result_items_chapter_id",
        "fk_test_question_topic_id",
        "fk_test_catalog_stat_generation",
        "fk_test_catalog_stat_chapter",
        "fk_test_catalog_state_generation",
        "ck_test_catalog_stat_nonnegative",
        "ck_test_catalog_state_singleton",
    ):
        actual = signature["constraints"].get(name)
        if actual is None or not actual["valid"]:
            raise AssertionError(f"canonical constraint {name} is missing or not validated")


if __name__ == "__main__":
    raise SystemExit(main())
