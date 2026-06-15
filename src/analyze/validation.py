import io

import pdfplumber

from src.analyze.exceptions import InvalidAnalyzeDocumentError

PDF_CONTENT_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "application/octet-stream",
}
PDF_MAGIC_BYTES = b"%PDF"


def validate_pdf_upload(content: bytes, *, content_type: str | None = None) -> None:
    if not content:
        raise InvalidAnalyzeDocumentError(message="Upload a non-empty PDF document.")

    if content_type and content_type not in PDF_CONTENT_TYPES:
        raise InvalidAnalyzeDocumentError(message="Upload a PDF document.")

    if not content.startswith(PDF_MAGIC_BYTES):
        raise InvalidAnalyzeDocumentError(message="Upload a valid PDF document.")

    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            if len(pdf.pages) == 0:
                raise InvalidAnalyzeDocumentError(
                    message="Upload a PDF document with at least one page.",
                )
    except InvalidAnalyzeDocumentError:
        raise
    except Exception as exc:
        raise InvalidAnalyzeDocumentError(
            message="Upload a readable PDF document.",
        ) from exc
