from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class CatalogDefinition:
    canonical_name: str
    source_name: str
    book_key: str
    topic_name: str
    text: str
    page: int


@dataclass(frozen=True, slots=True)
class TermsCatalogV2:
    canonical_names: tuple[str, ...]
    definitions: tuple[CatalogDefinition, ...]


def _required_name(value: object, *, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")
    if value != value.strip() or not value or len(value) > 255:
        raise ValueError(f"{field} must be trimmed and contain 1..255 characters")
    return value


def parse_terms_catalog_v2(data: object) -> TermsCatalogV2:
    if not isinstance(data, dict) or data.get("schema_version") != 2:
        raise ValueError("terms.json schema_version must be 2")
    if set(data) != {"schema_version", "terms"}:
        raise ValueError("terms.json v2 must contain exactly schema_version and terms")
    terms = data["terms"]
    if not isinstance(terms, dict):
        raise ValueError("terms.json v2 terms must be an object")

    canonical_names: list[str] = []
    flattened: list[CatalogDefinition] = []
    for raw_canonical_name, term_payload in terms.items():
        canonical_name = _required_name(raw_canonical_name, field="canonical name")
        if not isinstance(term_payload, dict) or set(term_payload) != {"variants"}:
            raise ValueError(f"term {canonical_name!r} must contain exactly variants")
        variants = term_payload["variants"]
        if not isinstance(variants, dict) or not variants:
            raise ValueError(f"term {canonical_name!r} variants must be a non-empty object")
        canonical_names.append(canonical_name)

        for raw_source_name, books in variants.items():
            source_name = _required_name(raw_source_name, field="source name")
            if not isinstance(books, dict) or not books:
                raise ValueError(f"variant {source_name!r} books must be a non-empty object")
            for raw_book_key, definitions in books.items():
                book_key = _required_name(raw_book_key, field="book key")
                if not isinstance(definitions, list) or not definitions:
                    raise ValueError(f"variant {source_name!r} book {book_key!r} must contain definitions")
                for payload in definitions:
                    if not isinstance(payload, dict) or set(payload) != {"definition", "topic", "page"}:
                        raise ValueError("definition payload must contain exactly definition, topic and page")
                    text = payload["definition"]
                    topic_name = payload["topic"]
                    page = payload["page"]
                    if not isinstance(text, str) or not text.strip():
                        raise ValueError("definition text must be a non-empty string")
                    if not isinstance(topic_name, str) or not topic_name.strip():
                        raise ValueError("definition topic must be a non-empty string")
                    if isinstance(page, bool) or not isinstance(page, int) or page < 1:
                        raise ValueError("definition page must be a positive integer")
                    flattened.append(
                        CatalogDefinition(
                            canonical_name=canonical_name,
                            source_name=source_name,
                            book_key=book_key,
                            topic_name=topic_name,
                            text=text,
                            page=page,
                        ),
                    )

    return TermsCatalogV2(tuple(canonical_names), tuple(flattened))
