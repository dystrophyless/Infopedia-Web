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
    ) -> None:
        self.code = code or self.code
        self.message = message or self.message
        self.stage = stage or self.stage
        super().__init__(self.message)

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
