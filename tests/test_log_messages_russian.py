from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATHS = tuple(
    ROOT / relative_path
    for relative_path in (
        "src/database.py",
        "src/auth/router.py",
        "src/prepare_app.py",
        "src/loader.py",
        "src/terms/service.py",
    )
)


def _read_sources() -> dict[Path, str]:
    return {
        path: path.read_text(encoding="utf-8")
        for path in SOURCE_PATHS
    }


OLD_TARGET_PHRASES = (
    "Could not update user schema compatibility: %s",
    "Failed to complete email verification for %s",
    "Book coverage by chapter recalculated",
    "Пропущен malformed lessonGoal: %r",
    "Rerank Rescue Triggered",
    "Moving `%s` (raw: %.4f) above `%s` (raw: %.4f)",
    "Query: %r | Alpha: %.2f",
    "Top Candidates:",
    "Decision:",
    "Override",
    "Margin",
)


EXPECTED_RUSSIAN_FORMULATIONS = {
    "src/database.py": (
        "Не удалось обновить совместимость схемы пользователя: %s",
    ),
    "src/auth/router.py": (
        "Не удалось завершить подтверждение электронной почты для %s",
    ),
    "src/prepare_app.py": (
        "Охват книг по главам пересчитан",
    ),
    "src/loader.py": (
        "Пропущен некорректный lessonGoal: %r",
    ),
    "src/terms/service.py": (
        "--- Сработало спасение реранжированием ---",
        "Поднимаем `%s` (raw: %.4f) выше `%s` (raw: %.4f)",
        "Запрос: %r | Альфа: %.2f",
        "Лучшие кандидаты:",
        "Решение: принято по высокому реранку (%.4f)",
        "Решение: принудительный выбор кандидата №2",
        "Решение: принято по Combined/отрыву (%.4f)",
        "Решение: отклонено (отрыв: %.4f, Combined: %.4f)",
    ),
}


def test_old_target_english_log_phrases_are_absent() -> None:
    sources = _read_sources()
    all_source = "\n".join(sources.values())

    for phrase in OLD_TARGET_PHRASES:
        assert phrase not in all_source, f"Старая фраза всё ещё присутствует: {phrase!r}"


def test_expected_russian_log_formulations_are_present() -> None:
    sources = _read_sources()

    for relative_path, expected_phrases in EXPECTED_RUSSIAN_FORMULATIONS.items():
        source = sources[ROOT / relative_path]
        for phrase in expected_phrases:
            assert phrase in source, f"В {relative_path} отсутствует: {phrase!r}"


def test_stable_log_fields_are_preserved() -> None:
    sources = _read_sources()
    loader_source = sources[ROOT / "src/loader.py"]
    service_source = sources[ROOT / "src/terms/service.py"]

    assert "lessonGoal" in loader_source
    for field in ("exact", "rerank_raw", "combined"):
        assert field in service_source


def test_log_placeholders_and_metric_formats_are_preserved() -> None:
    sources = _read_sources()
    expected_formats = {
        "src/database.py": (
            "Не удалось обновить совместимость схемы пользователя: %s",
        ),
        "src/auth/router.py": (
            "Не удалось завершить подтверждение электронной почты для %s",
        ),
        "src/loader.py": (
            "Пропущен некорректный lessonGoal: %r",
        ),
        "src/terms/service.py": (
            "Поднимаем `%s` (raw: %.4f) выше `%s` (raw: %.4f)",
            "Запрос: %r | Альфа: %.2f",
            " #%02d: %s | exact:%.4f | rerank_raw:%.4f | combined:%.4f",
            "Решение: принято по высокому реранку (%.4f)",
            "Решение: принято по Combined/отрыву (%.4f)",
            "Решение: отклонено (отрыв: %.4f, Combined: %.4f)",
        ),
    }

    for relative_path, expected_snippets in expected_formats.items():
        source = sources[ROOT / relative_path]
        for snippet in expected_snippets:
            assert snippet in source, f"В {relative_path} нарушен формат: {snippet!r}"
