from typing import Literal

AnalyzeLocale = Literal["kk", "ru"]


def normalize_analyze_locale(locale: object | None) -> AnalyzeLocale:
    value = getattr(locale, "value", locale)
    normalized = str(value or "").strip().lower()

    if normalized == "ru" or normalized.startswith("ru-"):
        return "ru"
    return "kk"
