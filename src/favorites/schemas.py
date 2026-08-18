from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from src.terms.schemas import TermDetailedResponse


class FavoritesPageResponse(BaseModel):
    terms: list[TermDetailedResponse]
    total: int = Field(ge=0)
    skip: int = Field(ge=0)
    limit: int = Field(ge=1)
    has_more: bool


class FavoriteStatusesRequest(BaseModel):
    term_public_ids: list[str] = Field(min_length=1, max_length=100)


class FavoriteStatusesResponse(BaseModel):
    favorite_term_public_ids: list[str]


class FavoriteMutationResponse(BaseModel):
    term_public_id: str
    is_favorite: Literal[True] = True
