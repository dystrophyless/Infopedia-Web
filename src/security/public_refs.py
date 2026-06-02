from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import os
from typing import Any

_VERSION = 1
_VALUE_BYTES = 8
_SIGNATURE_BYTES = 10
_ALLOWED_NAMESPACE_CHARS = set("abcdefghijklmnopqrstuvwxyz0123456789_")


class InvalidPublicRefError(ValueError):
    """Raised when a public reference cannot be trusted or decoded."""


InvalidPublicRef = InvalidPublicRefError


def _secret_to_bytes(secret: Any | None) -> bytes:
    if secret is None:
        secret = os.environ.get("SECRET_KEY")

    if secret is None:
        from src.config import settings  # noqa: PLC0415

        secret = settings.SECRET_KEY

    if hasattr(secret, "get_secret_value"):
        secret = secret.get_secret_value()

    secret_text = str(secret)
    if not secret_text:
        raise ValueError("SECRET_KEY is required to build public references.")

    return secret_text.encode("utf-8")


def _validate_namespace(namespace: str) -> str:
    normalized = namespace.strip().lower()
    if not normalized or any(char not in _ALLOWED_NAMESPACE_CHARS for char in normalized):
        raise ValueError("Public reference namespace must be lowercase ascii.")
    return normalized


def _urlsafe_b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _urlsafe_b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def _derive_key(secret: bytes, namespace: str, purpose: str) -> bytes:
    message = f"infopedia-public-ref:{namespace}:{purpose}".encode("ascii")
    return hmac.new(secret, message, hashlib.sha256).digest()


def _mask_value(value: int, *, secret: bytes, namespace: str) -> bytes:
    value_bytes = value.to_bytes(_VALUE_BYTES, "big")
    mask = _derive_key(secret, namespace, "mask")[:_VALUE_BYTES]
    return bytes(item ^ mask[index] for index, item in enumerate(value_bytes))


def _unmask_value(masked: bytes, *, secret: bytes, namespace: str) -> int:
    mask = _derive_key(secret, namespace, "mask")[:_VALUE_BYTES]
    value_bytes = bytes(item ^ mask[index] for index, item in enumerate(masked))
    return int.from_bytes(value_bytes, "big")


def _signature(payload: bytes, *, secret: bytes, namespace: str) -> bytes:
    signing_key = _derive_key(secret, namespace, "signature")
    return hmac.new(signing_key, payload, hashlib.sha256).digest()[:_SIGNATURE_BYTES]


def encode_public_ref(namespace: str, value: int, *, secret: Any | None = None) -> str:
    namespace = _validate_namespace(namespace)
    if value < 1:
        raise ValueError("Public reference value must be a positive integer.")

    secret_bytes = _secret_to_bytes(secret)
    payload = bytes([_VERSION]) + _mask_value(
        value,
        secret=secret_bytes,
        namespace=namespace,
    )
    signed = payload + _signature(payload, secret=secret_bytes, namespace=namespace)
    return f"{namespace}_{_urlsafe_b64encode(signed)}"


def decode_public_ref(namespace: str, public_ref: str, *, secret: Any | None = None) -> int:
    namespace = _validate_namespace(namespace)
    prefix = f"{namespace}_"
    if not public_ref.startswith(prefix):
        raise InvalidPublicRefError("Public reference namespace mismatch.")

    encoded = public_ref[len(prefix):]
    try:
        raw = _urlsafe_b64decode(encoded)
    except (binascii.Error, ValueError):
        raise InvalidPublicRefError("Public reference is not valid base64.") from None

    expected_length = 1 + _VALUE_BYTES + _SIGNATURE_BYTES
    if len(raw) != expected_length or raw[0] != _VERSION:
        raise InvalidPublicRefError("Public reference has an invalid format.")

    secret_bytes = _secret_to_bytes(secret)
    payload = raw[: 1 + _VALUE_BYTES]
    supplied_signature = raw[1 + _VALUE_BYTES:]
    expected_signature = _signature(
        payload,
        secret=secret_bytes,
        namespace=namespace,
    )
    if not hmac.compare_digest(supplied_signature, expected_signature):
        raise InvalidPublicRefError("Public reference signature mismatch.")

    value = _unmask_value(payload[1:], secret=secret_bytes, namespace=namespace)
    if value < 1:
        raise InvalidPublicRefError("Public reference value is invalid.")

    return value
