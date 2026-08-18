from collections.abc import Mapping


SAFE_ANALYZE_CONTEXT_KEYS = frozenset(
    {
        "row_index",
        "score",
        "max_score",
        "percentage",
        "value_length",
    }
)


class AnalyzeError(Exception):
    code = "analyze_execution_failed"
    message = "Could not analyze the document."
    stage = "failed"

    def __init__(
        self,
        *,
        code: str | None = None,
        message: str | None = None,
        stage: str | None = None,
        reason: str | None = None,
        context: Mapping[str, object] | None = None,
        details: Mapping[str, object] | None = None,
    ) -> None:
        self.code = code or self.code
        self.message = message or self.message
        self.stage = stage or self.stage
        self.reason = reason
        diagnostic_context = {**(details or {}), **(context or {})}
        self.context = diagnostic_context
        self.details = self.context
        super().__init__(self.message)

    @property
    def safe_context(self) -> dict[str, int | float]:
        """Return only bounded, non-document diagnostic fields for logging."""

        safe_context: dict[str, int | float] = {}
        for key, value in self.context.items():
            if key not in SAFE_ANALYZE_CONTEXT_KEYS:
                continue
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                safe_context[key] = value
        return safe_context

    def to_payload(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
        }


class InvalidAnalyzeDocumentError(AnalyzeError):
    code = "invalid_document_type"
    message = "Upload a valid PDF document."
    stage = "validation_failed"


class UnsupportedAnalyzeDocumentError(AnalyzeError):
    code = "unsupported_document"
    message = "Upload the official informatics result PDF."
    stage = "validation_failed"


class AnalyzeExtractionError(AnalyzeError):
    code = "analyze_extraction_failed"
    message = "Could not extract text from the document."
    stage = "extraction_failed"
