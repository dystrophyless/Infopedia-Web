import asyncio
from datetime import date
from pathlib import Path
from types import SimpleNamespace

import pytest

import src.analyze.router as analyze_router
import src.models  # noqa: F401 - register relationship targets for SQL compilation
from src.analyze.attempts import (
    UntAnalysisAttemptOption,
    get_unt_analysis_attempt_options,
    validate_unt_analysis_submission,
)
from src.analyze.repository import get_analyzed_unt_attempt_ids

ROOT_DIR = Path(__file__).resolve().parents[1]
CONFIG_SOURCE = (ROOT_DIR / "src" / "config.py").read_text(encoding="utf-8")
ROUTER_SOURCE = (ROOT_DIR / "src" / "analyze" / "router.py").read_text(encoding="utf-8")
SCHEMAS_SOURCE = (ROOT_DIR / "src" / "analyze" / "schemas.py").read_text(
    encoding="utf-8",
)


def _settings(**overrides):
    values = {
        "UNT_ANALYSIS_TIMEZONE": "Asia/Qyzylorda",
        "UNT_ANALYSIS_JANUARY_START_DATE": "2026-01-10",
        "UNT_ANALYSIS_JANUARY_END_DATE": "2026-02-10",
        "UNT_ANALYSIS_MARCH_START_DATE": "2026-03-01",
        "UNT_ANALYSIS_MARCH_END_DATE": "2026-04-30",
        "UNT_ANALYSIS_GRANT_1_START_DATE": "2026-05-01",
        "UNT_ANALYSIS_GRANT_1_END_DATE": "2026-07-31",
        "UNT_ANALYSIS_GRANT_2_START_DATE": "2026-08-01",
        "UNT_ANALYSIS_GRANT_2_END_DATE": "2026-08-31",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_attempt_window_is_inclusive_at_both_boundaries():
    before = get_unt_analysis_attempt_options(
        date(2026, 1, 9), app_settings=_settings(),
    )
    start = get_unt_analysis_attempt_options(
        date(2026, 1, 10), app_settings=_settings(),
    )
    end = get_unt_analysis_attempt_options(date(2026, 2, 10), app_settings=_settings())
    after = get_unt_analysis_attempt_options(
        date(2026, 2, 11), app_settings=_settings(),
    )

    assert before[0].available is False
    assert start[0].available is True
    assert end[0].available is True
    assert after[0].available is False


def test_september_has_no_available_attempt_when_all_configured_windows_are_closed():
    options = get_unt_analysis_attempt_options(
        date(2026, 9, 12), app_settings=_settings(),
    )

    assert [option.available for option in options] == [False, False, False, False]


def test_unconfigured_attempt_is_unavailable():
    options = get_unt_analysis_attempt_options(
        date(2026, 5, 15),
        app_settings=_settings(
            UNT_ANALYSIS_GRANT_1_START_DATE="",
            UNT_ANALYSIS_GRANT_1_END_DATE="",
        ),
    )

    assert options[2].available is False
    assert options[2].start_date is None
    assert options[2].end_date is None


def test_analyzed_attempt_remains_distinct_from_server_window_availability():
    options = get_unt_analysis_attempt_options(
        date(2026, 4, 2),
        app_settings=_settings(),
        analyzed_attempt_ids=frozenset({"january"}),
    )

    assert options[0].analyzed is True
    assert options[0].available is False
    assert options[1].analyzed is False
    assert options[1].available is True


def test_analyzed_attempt_ids_are_user_scoped_and_ignore_legacy_results():
    class _Scalars:
        def all(self):
            return ["march"]

    class _Result:
        def scalars(self):
            return _Scalars()

    class _Session:
        statement = None

        async def execute(self, statement):
            self.statement = statement
            return _Result()

    session = _Session()
    attempt_ids = asyncio.run(get_analyzed_unt_attempt_ids(session, user_id=7))
    compiled = session.statement.compile()
    sql = str(compiled)

    assert attempt_ids == {"march"}
    assert compiled.params == {"user_id_1": 7}
    assert "analyze_results.unt_attempt_id IS NOT NULL" in sql
    assert "SELECT DISTINCT" in sql


def test_cannot_submit_an_attempt_that_the_user_already_analyzed():
    options = get_unt_analysis_attempt_options(
        date(2026, 1, 11),
        app_settings=_settings(),
        analyzed_attempt_ids=frozenset({"january"}),
    )

    with pytest.raises(ValueError, match="unt_attempt_already_analyzed"):
        validate_unt_analysis_submission("january", date(2026, 1, 11), options)


def test_submission_date_must_belong_to_configured_attempt_window():
    options = get_unt_analysis_attempt_options(
        date(2026, 1, 11),
        app_settings=_settings(),
    )

    with pytest.raises(ValueError, match="unt_attempt_date_outside_window"):
        validate_unt_analysis_submission("january", date(2026, 1, 9), options)


def test_partial_or_reversed_window_is_rejected():
    with pytest.raises(ValueError, match="Both UNT_ANALYSIS_JANUARY_START_DATE"):
        get_unt_analysis_attempt_options(
            date(2026, 1, 11),
            app_settings=_settings(UNT_ANALYSIS_JANUARY_END_DATE=""),
        )

    with pytest.raises(ValueError, match="must not be after"):
        get_unt_analysis_attempt_options(
            date(2026, 1, 11),
            app_settings=_settings(
                UNT_ANALYSIS_JANUARY_START_DATE="2026-02-10",
                UNT_ANALYSIS_JANUARY_END_DATE="2026-01-10",
            ),
        )


def test_backend_owns_window_configuration_and_exposes_attempts_endpoint():
    assert "UNT_ANALYSIS_TIMEZONE" in CONFIG_SOURCE
    for attempt in ("JANUARY", "MARCH", "GRANT_1", "GRANT_2"):
        assert f"UNT_ANALYSIS_{attempt}_START_DATE" in CONFIG_SOURCE
        assert f"UNT_ANALYSIS_{attempt}_END_DATE" in CONFIG_SOURCE

    assert (
        '@router.get("/attempts", response_model=UntAnalysisAttemptsResponse)'
        in ROUTER_SOURCE
    )
    assert "get_unt_analysis_attempt_options" in ROUTER_SOURCE
    assert "reference_date" in SCHEMAS_SOURCE
    assert "available: bool" in SCHEMAS_SOURCE


def test_attempts_endpoint_serializes_backend_options(monkeypatch):
    monkeypatch.setattr(
        analyze_router,
        "get_unt_analysis_reference_date",
        lambda: date(2026, 1, 11),
    )
    monkeypatch.setattr(
        analyze_router,
        "get_unt_analysis_attempt_options",
        lambda _reference_date, **_kwargs: (
            UntAnalysisAttemptOption(
                id="january",
                start_date=date(2026, 1, 10),
                end_date=date(2026, 2, 10),
                available=True,
                analyzed=True,
            ),
            UntAnalysisAttemptOption(
                id="march",
                start_date=None,
                end_date=None,
                available=False,
            ),
            UntAnalysisAttemptOption(
                id="grant-1",
                start_date=None,
                end_date=None,
                available=False,
            ),
            UntAnalysisAttemptOption(
                id="grant-2",
                start_date=None,
                end_date=None,
                available=False,
            ),
        ),
    )
    async def analyzed_attempts(_session, *, user_id):
        assert user_id == 7
        return {"january"}

    monkeypatch.setattr(
        analyze_router,
        "get_analyzed_unt_attempt_ids",
        analyzed_attempts,
        raising=False,
    )

    response = asyncio.run(
        analyze_router.get_unt_analysis_attempts(SimpleNamespace(id=7), object()),
    )

    assert response.reference_date == date(2026, 1, 11)
    assert response.attempts[0].id == "january"
    assert response.attempts[0].available is True
    assert response.attempts[0].analyzed is True
