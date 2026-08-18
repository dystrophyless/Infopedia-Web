from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class TestModeUnavailableError(Exception):
    mode: str
    reason: str
    required_questions: int
    available_questions: int
    message: str = "Selected test mode is unavailable."

    @property
    def detail(self) -> dict[str, object]:
        return {
            "code": "TEST_MODE_UNAVAILABLE",
            "message": self.message,
            "mode": self.mode,
            "reason": self.reason,
            "required_questions": self.required_questions,
            "available_questions": self.available_questions,
        }


class AttemptNotFoundError(Exception):
    pass


class AttemptCompletedError(Exception):
    pass


class AttemptIncompleteError(Exception):
    pass


class AnswerAlreadySubmittedError(Exception):
    pass


class TestCatalogNotReadyError(Exception):
    """The atomic catalog pointer is absent, so the stats reader cannot serve data."""

    code = "TEST_CATALOG_NOT_READY"


class TestCatalogStaleError(Exception):
    """The pointed catalog generation is invalid or incomplete."""

    code = "TEST_CATALOG_STALE"
