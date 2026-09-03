from __future__ import annotations

# ruff: noqa: BLE001, EM102, INP001, S608
import asyncio
import json
import os
import statistics
import sys
import time
from collections.abc import Sequence
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.dialects import postgresql  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.search.term_filters import TermSearchFilters  # noqa: E402
from src.terms.repository import (  # noqa: E402
    build_search_terms_statements,
    search_filtered_terms,
)

WARMUPS = 1
RUNS = 5
NOT_RUN_EXIT = 3
NEEDS_REPLAN_EXIT = 2
ERROR_EXIT = 4
FACT_TABLES = frozenset({"term", "definition"})
MIN_EXPECTED_SCALE_GROWTH = 9.9
MAX_EXPECTED_SCALE_GROWTH = 10.1


class BenchmarkNotRunError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ExplainSample:
    execution_ms: float
    planning_ms: float
    shared_hits: int
    shared_reads: int
    temp_reads: int
    temp_writes: int
    rows: int


def _json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def _not_run(reason: str) -> int:
    _json({"status": "NOT_RUN", "reason": reason, "warmups": WARMUPS, "runs": RUNS})
    return NOT_RUN_EXIT


def _quoted(identifier: str) -> str:
    if not identifier.replace("_", "").isalnum():
        raise ValueError("Unsafe SQL identifier")
    return f'"{identifier}"'


def _table_copy_scale(table_name: str, requested_scale: int) -> int:
    return requested_scale if table_name in FACT_TABLES else 1


def _compiled(statement) -> str:
    sql = str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        ),
    )
    return sql.replace("ESCAPE '\\\\'", "ESCAPE E'\\\\'")


def _explain_document(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        value = json.loads(value)
    if isinstance(value, list):
        return value[0]
    if isinstance(value, dict):
        return value
    raise TypeError(f"Unsupported EXPLAIN JSON payload: {type(value)!r}")


async def _explain(session: AsyncSession, sql: str, params: dict[str, Any] | None = None) -> ExplainSample:
    raw = await session.scalar(
        text(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {sql}"),
        params or {},
    )
    document = _explain_document(raw)
    plan = document["Plan"]
    return ExplainSample(
        execution_ms=float(document.get("Execution Time", 0.0)),
        planning_ms=float(document.get("Planning Time", 0.0)),
        shared_hits=int(plan.get("Shared Hit Blocks", 0)),
        shared_reads=int(plan.get("Shared Read Blocks", 0)),
        temp_reads=int(plan.get("Temp Read Blocks", 0)),
        temp_writes=int(plan.get("Temp Written Blocks", 0)),
        rows=int(plan.get("Actual Rows", 0)),
    )


async def _sample_explain(
    session: AsyncSession,
    sql: str,
    params: dict[str, Any] | None = None,
) -> list[ExplainSample]:
    samples = []
    for ordinal in range(WARMUPS + RUNS):
        sample = await _explain(session, sql, params)
        if ordinal >= WARMUPS:
            samples.append(sample)
    return samples


def _summary(samples: Sequence[ExplainSample]) -> dict[str, Any]:
    return {
        "median_ms": statistics.median(sample.execution_ms for sample in samples),
        "max_ms": max(sample.execution_ms for sample in samples),
        "median_shared_hits": statistics.median(sample.shared_hits for sample in samples),
        "max_shared_hits": max(sample.shared_hits for sample in samples),
        "max_shared_reads": max(sample.shared_reads for sample in samples),
        "max_temp_reads": max(sample.temp_reads for sample in samples),
        "max_temp_writes": max(sample.temp_writes for sample in samples),
        "median_rows": statistics.median(sample.rows for sample in samples),
        "samples": [asdict(sample) for sample in samples],
    }


async def _sample_endpoint(
    session: AsyncSession,
    *,
    filters: TermSearchFilters,
    skip: int,
    limit: int,
) -> dict[str, Any]:
    elapsed = []
    result_shape = None
    for ordinal in range(WARMUPS + RUNS):
        started = time.perf_counter()
        page = await search_filtered_terms(session, filters=filters, skip=skip, limit=limit)
        duration_ms = (time.perf_counter() - started) * 1000
        result_shape = {"total": page.total, "returned": len(page.terms), "mode": page.mode}
        if ordinal >= WARMUPS:
            elapsed.append(duration_ms)
    return {
        "median_ms": statistics.median(elapsed),
        "max_ms": max(elapsed),
        "samples_ms": elapsed,
        "shape": result_shape,
    }


async def _create_schema(connection, *, schema: str, scale: int) -> None:
    quoted = _quoted(schema)
    await connection.execute(text(f"CREATE SCHEMA {quoted}"))
    await connection.execute(text(f"SET LOCAL search_path TO {quoted}, public"))
    for ddl in (
        "CREATE TABLE book (id bigint PRIMARY KEY, publisher varchar(255) NOT NULL, grade integer NOT NULL)",
        "CREATE TABLE chapter (id bigint PRIMARY KEY, code varchar(128) NOT NULL)",
        "CREATE TABLE topic_code (id bigint PRIMARY KEY, name varchar(512) NOT NULL, chapter_id bigint)",
        "CREATE TABLE topic (id bigint PRIMARY KEY, name varchar(255) NOT NULL, page_start integer NOT NULL, page_end integer NOT NULL, book_id bigint NOT NULL)",
        "CREATE TABLE topic_mapping (topic_code_id bigint NOT NULL, topic_id bigint NOT NULL, PRIMARY KEY (topic_code_id, topic_id))",
        "CREATE TABLE term (id bigint PRIMARY KEY, name varchar(255) NOT NULL)",
        "CREATE TABLE definition (id bigint PRIMARY KEY, term_id bigint NOT NULL, name varchar(255) NOT NULL, topic_id bigint NOT NULL, text text NOT NULL, page integer NOT NULL)",
    ):
        await connection.execute(text(ddl))

    max_ids = {}
    for table_name in ("book", "chapter", "topic_code", "topic", "term", "definition"):
        max_ids[table_name] = int(
            await connection.scalar(text(f"SELECT COALESCE(MAX(id), 0) + 1 FROM public.{table_name}")),
        )
    if not all(max_ids.values()):
        raise BenchmarkNotRunError("public app tables are unavailable")

    copies = "generate_series(0, :fact_scale - 1) AS replica(copy_no)"
    inserts = (
        "INSERT INTO book SELECT b.id, b.publisher, b.grade FROM public.book b",
        "INSERT INTO chapter SELECT c.id, c.code FROM public.chapter c",
        "INSERT INTO topic_code SELECT tc.id, tc.name, tc.chapter_id FROM public.topic_code tc",
        "INSERT INTO topic SELECT tp.id, tp.name, tp.page_start, tp.page_end, tp.book_id FROM public.topic tp",
        "INSERT INTO topic_mapping SELECT tm.topic_code_id, tm.topic_id FROM public.topic_mapping tm",
        f"INSERT INTO term SELECT t.id + replica.copy_no * :term_stride, CASE WHEN replica.copy_no = 0 THEN t.name ELSE left(t.name, 230) || ' [bench ' || replica.copy_no || ']' END FROM public.term t CROSS JOIN {copies}",
        f"INSERT INTO definition SELECT d.id + replica.copy_no * :definition_stride, d.term_id + replica.copy_no * :term_stride, d.name, d.topic_id, d.text, d.page FROM public.definition d CROSS JOIN {copies}",
    )
    params = {
        "fact_scale": _table_copy_scale("term", scale),
        **{f"{name}_stride": stride for name, stride in max_ids.items()},
    }
    for insert in inserts:
        await connection.execute(text(insert), params)

    for index_sql in (
        "CREATE INDEX bench_book_grade ON book (grade)",
        "CREATE INDEX bench_topic_book ON topic (book_id)",
        "CREATE INDEX bench_topic_code_chapter ON topic_code (chapter_id)",
        "CREATE INDEX bench_topic_mapping_topic ON topic_mapping (topic_id)",
        "CREATE INDEX bench_definition_term ON definition (term_id)",
        "CREATE INDEX bench_definition_topic ON definition (topic_id)",
        "CREATE INDEX bench_definition_name_trgm ON definition USING gin (name gin_trgm_ops)",
    ):
        await connection.execute(text(index_sql))
    await connection.execute(text("ANALYZE"))


async def _representative_filters(session: AsyncSession) -> tuple[TermSearchFilters, str]:
    row = (
        await session.execute(
            text(
                """
                SELECT tp.book_id, b.grade, tc.chapter_id, min(d.name) AS sample_name
                FROM definition d
                JOIN topic tp ON tp.id = d.topic_id
                JOIN book b ON b.id = tp.book_id
                JOIN topic_mapping tm ON tm.topic_id = tp.id
                JOIN topic_code tc ON tc.id = tm.topic_code_id
                WHERE tc.chapter_id IS NOT NULL
                GROUP BY tp.book_id, b.grade, tc.chapter_id
                ORDER BY count(DISTINCT d.term_id) DESC, tp.book_id, tc.chapter_id
                LIMIT 1
                """,
            ),
        )
    ).one_or_none()
    if row is None:
        raise BenchmarkNotRunError("app data has no mapped definitions for a representative filter")
    sample_name = row.sample_name.strip()
    prefix = sample_name[: max(1, min(4, len(sample_name)))]
    return (
        TermSearchFilters(
            query="",
            grades=(int(row.grade),),
            book_ids=(int(row.book_id),),
            chapter_ids=(int(row.chapter_id),),
            ent_only=True,
        ),
        prefix,
    )


def _reference_page_sql(*, mode: str) -> str:
    name_clause = ""
    if mode == "prefix":
        name_clause = "AND d.name ILIKE :name_pattern ESCAPE E'\\\\'"
    return f"""
        SELECT d.term_id, min(d.id) AS first_qualifying_definition_id
        FROM definition d
        JOIN topic tp ON tp.id = d.topic_id
        JOIN book b ON b.id = tp.book_id
        WHERE tp.book_id = :book_id
          AND b.grade = :grade
          AND EXISTS (
              SELECT 1
              FROM topic_mapping tm
              JOIN topic_code tc ON tc.id = tm.topic_code_id
              WHERE tm.topic_id = d.topic_id
                AND tc.chapter_id = :chapter_id
                AND tc.chapter_id IS NOT NULL
          )
          {name_clause}
        GROUP BY d.term_id
        ORDER BY min(d.id), d.term_id
        OFFSET :skip LIMIT :limit
    """


async def _endpoint_buffer_shape(
    session: AsyncSession,
    *,
    filters: TermSearchFilters,
    skip: int,
    limit: int,
) -> dict[str, Any]:
    statements = build_search_terms_statements(
        filters=filters,
        mode="all_filtered",
        skip=skip,
        limit=limit,
        page_term_ids=[],
    )
    page_ids = [
        row.term_id
        for row in (await session.execute(statements.page)).all()
    ]
    statements = build_search_terms_statements(
        filters=filters,
        mode="all_filtered",
        skip=skip,
        limit=limit,
        page_term_ids=page_ids,
    )
    phases = {
        "count": _compiled(statements.count),
        "page": _compiled(statements.page),
        "hydration": _compiled(statements.hydration),
    }
    summaries = {}
    for name, sql in phases.items():
        summaries[name] = _summary(await _sample_explain(session, sql))
    return {
        "phases": summaries,
        "shared_hits": sum(summary["median_shared_hits"] for summary in summaries.values()),
        "has_spill": any(
            summary["max_temp_reads"] or summary["max_temp_writes"]
            for summary in summaries.values()
        ),
    }


async def _benchmark_scale(session: AsyncSession, *, scale: int) -> dict[str, Any]:
    natural_filters, prefix = await _representative_filters(session)
    all_statements = build_search_terms_statements(
        filters=natural_filters,
        mode="all_filtered",
        skip=0,
        limit=20,
        page_term_ids=[],
    )
    page2_statements = build_search_terms_statements(
        filters=natural_filters,
        mode="all_filtered",
        skip=20,
        limit=20,
        page_term_ids=[],
    )
    prefix_filters = TermSearchFilters(
        query=prefix,
        grades=natural_filters.grades,
        book_ids=natural_filters.book_ids,
        chapter_ids=natural_filters.chapter_ids,
        ent_only=True,
    )
    prefix_statements = build_search_terms_statements(
        filters=prefix_filters,
        mode="prefix",
        skip=0,
        limit=20,
        page_term_ids=[],
    )
    params = {
        "book_id": natural_filters.book_ids[0],
        "grade": natural_filters.grades[0],
        "chapter_id": natural_filters.chapter_ids[0],
        "skip": 0,
        "limit": 20,
    }
    reference_all = _summary(await _sample_explain(session, _reference_page_sql(mode="all"), params))
    candidate_all = _summary(await _sample_explain(session, _compiled(all_statements.page)))
    candidate_page2 = _summary(await _sample_explain(session, _compiled(page2_statements.page)))
    prefix_params = {**params, "name_pattern": prefix.replace("%", "\\%").replace("_", "\\_") + "%"}
    reference_prefix = _summary(
        await _sample_explain(session, _reference_page_sql(mode="prefix"), prefix_params),
    )
    candidate_prefix = _summary(await _sample_explain(session, _compiled(prefix_statements.page)))
    endpoint = await _sample_endpoint(
        session,
        filters=natural_filters,
        skip=0,
        limit=20,
    )
    endpoint_buffers = await _endpoint_buffer_shape(
        session,
        filters=natural_filters,
        skip=0,
        limit=20,
    )
    return {
        "scale": scale,
        "filter_shape": {
            "book_count": len(natural_filters.book_ids),
            "grade_count": len(natural_filters.grades),
            "chapter_count": len(natural_filters.chapter_ids),
            "ent_only": natural_filters.ent_only,
            "prefix_length": len(prefix),
        },
        "reference_sql_shapes": {
            "all_filtered": "definition->term/topic/book; correlated topic_mapping->topic_code EXISTS; GROUP BY term_id; ORDER BY min(definition.id),term_id",
            "prefix": "same qualifying Definition predicate plus escaped case-insensitive prefix",
        },
        "reference_all": reference_all,
        "candidate_all": candidate_all,
        "candidate_page2": candidate_page2,
        "reference_prefix": reference_prefix,
        "candidate_prefix": candidate_prefix,
        "endpoint": endpoint,
        "endpoint_buffers": endpoint_buffers,
    }


def _gate(name: str, actual: float, limit: float, *, comparator: str = "<=") -> dict[str, Any]:
    passed = actual <= limit
    return {"name": name, "actual": actual, "limit": limit, "comparator": comparator, "passed": passed}


def _evaluate(natural: dict[str, Any], scaled: dict[str, Any]) -> list[dict[str, Any]]:
    natural_hits_cap = max(
        natural["reference_all"]["median_shared_hits"] * 1.5,
        natural["reference_all"]["median_shared_hits"] + 512,
    )
    prefix_hits_cap = max(
        natural["reference_prefix"]["median_shared_hits"] * 1.5,
        natural["reference_prefix"]["median_shared_hits"] + 512,
    )
    natural_hits = max(1, natural["candidate_all"]["median_shared_hits"])
    natural_rows = max(1, natural["candidate_all"]["median_rows"])
    corpus_growth = scaled["endpoint"]["shape"]["total"] / max(
        1,
        natural["endpoint"]["shape"]["total"],
    )
    gates = [
        _gate("natural.page.median_ms", natural["candidate_all"]["median_ms"], 5),
        _gate("natural.page.max_ms", natural["candidate_all"]["max_ms"], 10),
        _gate("natural.page.shared_hits_relative", natural["candidate_all"]["median_shared_hits"], natural_hits_cap),
        _gate("natural.prefix.shared_hits_relative", natural["candidate_prefix"]["median_shared_hits"], prefix_hits_cap),
        _gate("natural.endpoint.median_ms", natural["endpoint"]["median_ms"], 150),
        _gate("natural.endpoint.max_ms", natural["endpoint"]["max_ms"], 250),
        _gate("natural.endpoint.shared_hits", natural["endpoint_buffers"]["shared_hits"], 10000),
        _gate("scaled.page.median_ms", scaled["candidate_all"]["median_ms"], 25),
        _gate("scaled.page.max_ms", scaled["candidate_all"]["max_ms"], 50),
        _gate("scaled.endpoint.median_ms", scaled["endpoint"]["median_ms"], 300),
        _gate("scaled.endpoint.max_ms", scaled["endpoint"]["max_ms"], 400),
        _gate("scaled.page.buffer_growth", scaled["candidate_all"]["median_shared_hits"] / natural_hits, 12),
        _gate("scaled.page.row_growth", scaled["candidate_all"]["median_rows"] / natural_rows, 12),
        _gate(
            "scaled.page2.shared_hits",
            scaled["candidate_page2"]["median_shared_hits"],
            max(1, scaled["candidate_all"]["median_shared_hits"]) * 2,
        ),
    ]
    gates.append(
        {
            "name": "scaled.qualifying_corpus.growth",
            "actual": corpus_growth,
            "limit": "9.9..10.1",
            "comparator": "between",
            "passed": MIN_EXPECTED_SCALE_GROWTH <= corpus_growth <= MAX_EXPECTED_SCALE_GROWTH,
        },
    )
    for phase, summary in natural["endpoint_buffers"]["phases"].items():
        gates.append(_gate(f"natural.phase.{phase}.max_ms", summary["max_ms"], 100))
    gates.extend(
        [
            {"name": "natural.endpoint.no_spill", "actual": natural["endpoint_buffers"]["has_spill"], "limit": False, "comparator": "==", "passed": not natural["endpoint_buffers"]["has_spill"]},
            {"name": "scaled.endpoint.no_spill", "actual": scaled["endpoint_buffers"]["has_spill"], "limit": False, "comparator": "==", "passed": not scaled["endpoint_buffers"]["has_spill"]},
        ],
    )
    return gates


async def _run(database_url: str) -> tuple[dict[str, Any], int]:
    if not database_url.startswith("postgresql+psycopg"):
        raise BenchmarkNotRunError("TEST_DATABASE_URL must use postgresql+psycopg")
    engine = create_async_engine(database_url, pool_size=2, max_overflow=0)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    suffix = uuid4().hex
    schemas = {"natural": f"bench_search_natural_{suffix}", "scaled": f"bench_search_10x_{suffix}"}
    try:
        async with engine.begin() as connection:
            has_tables = await connection.scalar(text("SELECT to_regclass('public.definition') IS NOT NULL"))
            has_trgm = await connection.scalar(text("SELECT to_regprocedure('similarity(text,text)') IS NOT NULL"))
            if not has_tables:
                raise BenchmarkNotRunError("public app tables are unavailable")
            if not has_trgm:
                raise BenchmarkNotRunError("pg_trgm is unavailable in TEST_DATABASE_URL")
            await _create_schema(connection, schema=schemas["natural"], scale=1)
            await _create_schema(connection, schema=schemas["scaled"], scale=10)

        results = {}
        for name, scale in (("natural", 1), ("scaled", 10)):
            async with sessions.begin() as session:
                await session.execute(text(f"SET LOCAL search_path TO {_quoted(schemas[name])}, public"))
                results[name] = await _benchmark_scale(session, scale=scale)
        gates = _evaluate(results["natural"], results["scaled"])
        passed = all(gate["passed"] for gate in gates)
        return (
            {
                "status": "PASS" if passed else "NEEDS_REPLAN",
                "database": "TEST_DATABASE_URL",
                "warmups": WARMUPS,
                "runs": RUNS,
                "schemas": {"natural_scale": 1, "scaled_scale": 10, "disposable": True},
                "results": results,
                "gates": gates,
            },
            0 if passed else NEEDS_REPLAN_EXIT,
        )
    finally:
        try:
            async with engine.begin() as connection:
                for schema in schemas.values():
                    await connection.execute(text(f"DROP SCHEMA IF EXISTS {_quoted(schema)} CASCADE"))
        finally:
            await engine.dispose()


def main() -> int:
    database_url = os.environ.get("TEST_DATABASE_URL", "")
    if not database_url:
        return _not_run("TEST_DATABASE_URL is not set")
    try:
        payload, exit_code = asyncio.run(_run(database_url))
    except BenchmarkNotRunError as exc:
        return _not_run(str(exc))
    except Exception as exc:  # pragma: no cover - reported as machine-readable harness failure
        _json(
            {
                "status": "ERROR",
                "error_type": type(exc).__name__,
                "reason": str(exc),
                "warmups": WARMUPS,
                "runs": RUNS,
            },
        )
        return ERROR_EXIT
    _json(payload)
    return exit_code


if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


if __name__ == "__main__":
    raise SystemExit(main())
