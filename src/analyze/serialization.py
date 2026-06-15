import base64
import binascii

from src.analyze.exceptions import InvalidAnalyzeDocumentError


def encode_file_content(content: bytes) -> str:
    return base64.b64encode(content).decode("ascii")


def decode_file_content(content_b64: str) -> bytes:
    try:
        return base64.b64decode(content_b64.encode("ascii"), validate=True)
    except (binascii.Error, UnicodeEncodeError) as exc:
        raise InvalidAnalyzeDocumentError(
            message="Analyze task payload contains invalid file content.",
        ) from exc
