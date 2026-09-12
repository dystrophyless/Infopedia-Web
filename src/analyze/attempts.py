from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from src.config import Settings, settings

UntAnalysisAttemptId = Literal["january", "march", "grant-1", "grant-2"]

UNT_ANALYSIS_ATTEMPT_IDS: tuple[UntAnalysisAttemptId, ...] = (
    "january",
    "march",
    "grant-1",
    "grant-2",
)

_WINDOW_SETTING_FIELDS: dict[
    UntAnalysisAttemptId,
    tuple[str, str],
] = {
    "january": (
        "UNT_ANALYSIS_JANUARY_START_DATE",
        "UNT_ANALYSIS_JANUARY_END_DATE",
    ),
    "march": (
        "UNT_ANALYSIS_MARCH_START_DATE",
        "UNT_ANALYSIS_MARCH_END_DATE",
    ),
    "grant-1": (
        "UNT_ANALYSIS_GRANT_1_START_DATE",
        "UNT_ANALYSIS_GRANT_1_END_DATE",
    ),
    "grant-2": (
        "UNT_ANALYSIS_GRANT_2_START_DATE",
        "UNT_ANALYSIS_GRANT_2_END_DATE",
    ),
}


@dataclass(frozen=True, slots=True)
class UntAnalysisAttemptWindow:
    id: UntAnalysisAttemptId
    start_date: date | None
    end_date: date | None


@dataclass(frozen=True, slots=True)
class UntAnalysisAttemptOption:
    id: UntAnalysisAttemptId
    start_date: date | None
    end_date: date | None
    available: bool


def _parse_configured_date(value: str, *, setting_name: str) -> date | None:
    normalized = value.strip()
    if not normalized:
        return None

    try:
        return date.fromisoformat(normalized)
    except ValueError as exc:
        message = f"{setting_name} must be an ISO date in YYYY-MM-DD format"
        raise ValueError(message) from exc


def get_unt_analysis_attempt_windows(
    app_settings: Settings = settings,
) -> tuple[UntAnalysisAttemptWindow, ...]:
    windows: list[UntAnalysisAttemptWindow] = []

    for attempt_id in UNT_ANALYSIS_ATTEMPT_IDS:
        start_setting, end_setting = _WINDOW_SETTING_FIELDS[attempt_id]
        start_date = _parse_configured_date(
            getattr(app_settings, start_setting, ""),
            setting_name=start_setting,
        )
        end_date = _parse_configured_date(
            getattr(app_settings, end_setting, ""),
            setting_name=end_setting,
        )

        if (start_date is None) != (end_date is None):
            message = (
                f"Both {start_setting} and {end_setting} must be configured together"
            )
            raise ValueError(message)
        if start_date is not None and end_date is not None and start_date > end_date:
            message = f"{start_setting} must not be after {end_setting}"
            raise ValueError(message)

        windows.append(
            UntAnalysisAttemptWindow(
                id=attempt_id,
                start_date=start_date,
                end_date=end_date,
            ),
        )

    return tuple(windows)


def get_unt_analysis_reference_date(
    app_settings: Settings = settings,
) -> date:
    timezone_name = app_settings.UNT_ANALYSIS_TIMEZONE.strip()
    try:
        timezone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as exc:
        message = (
            f"UNT_ANALYSIS_TIMEZONE must be a valid IANA timezone: {timezone_name}"
        )
        raise ValueError(message) from exc
    return datetime.now(timezone).date()


def get_unt_analysis_attempt_options(
    reference_date: date | None = None,
    *,
    app_settings: Settings = settings,
) -> tuple[UntAnalysisAttemptOption, ...]:
    resolved_date = (
        reference_date
        if reference_date is not None
        else get_unt_analysis_reference_date(app_settings)
    )

    return tuple(
        UntAnalysisAttemptOption(
            id=window.id,
            start_date=window.start_date,
            end_date=window.end_date,
            available=(
                window.start_date is not None
                and window.end_date is not None
                and window.start_date <= resolved_date <= window.end_date
            ),
        )
        for window in get_unt_analysis_attempt_windows(app_settings)
    )
