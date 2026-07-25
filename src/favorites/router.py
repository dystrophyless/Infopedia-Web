from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.database import get_async_session
from src.favorites.repository import (
    add_favorite,
    count_user_favorites,
    get_existing_term_ids,
    get_favorite_term_ids,
    get_term_by_id,
    get_user_favorites,
    remove_favorite,
)
from src.favorites.schemas import (
    FavoriteMutationResponse,
    FavoriteStatusesRequest,
    FavoriteStatusesResponse,
    FavoritesPageResponse,
)
from src.security.public_refs import InvalidPublicRef, decode_public_ref, encode_public_ref
from src.users.models import User

router = APIRouter()


def _decode_term_ref_or_404(term_ref: str) -> int:
    try:
        return decode_public_ref("term", term_ref)
    except InvalidPublicRef:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        ) from None


async def _require_term(session: AsyncSession, *, term_id: int):
    term = await get_term_by_id(session, term_id=term_id)
    if term is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )
    return term


@router.get("", response_model=FavoritesPageResponse)
async def get_favorites(
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    terms = await get_user_favorites(
        session,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    total = await count_user_favorites(session, user_id=current_user.id)
    return FavoritesPageResponse(
        terms=terms,
        total=total,
        skip=skip,
        limit=limit,
        has_more=skip + len(terms) < total,
    )


@router.post("/status", response_model=FavoriteStatusesResponse)
async def get_favorite_statuses(
    payload: FavoriteStatusesRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    term_ids: list[int] = []
    canonical_refs: list[str] = []
    seen: set[int] = set()
    for term_ref in payload.term_public_ids:
        term_id = _decode_term_ref_or_404(term_ref)
        if term_id not in seen:
            seen.add(term_id)
            term_ids.append(term_id)
            canonical_refs.append(encode_public_ref("term", term_id))

    existing_term_ids = await get_existing_term_ids(session, term_ids=term_ids)
    if existing_term_ids != set(term_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found.",
        )

    favorite_ids = await get_favorite_term_ids(
        session,
        user_id=current_user.id,
        term_ids=term_ids,
    )
    return FavoriteStatusesResponse(
        favorite_term_public_ids=[
            term_ref for term_ref, term_id in zip(canonical_refs, term_ids) if term_id in favorite_ids
        ]
    )


@router.put("/{term_ref}", response_model=FavoriteMutationResponse)
async def create_favorite(
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    term_id = _decode_term_ref_or_404(term_ref)
    await _require_term(session, term_id=term_id)
    await add_favorite(session, user_id=current_user.id, term_id=term_id)
    return FavoriteMutationResponse(
        term_public_id=encode_public_ref("term", term_id),
        is_favorite=True,
    )


@router.delete("/{term_ref}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_favorite(
    term_ref: str,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> None:
    term_id = _decode_term_ref_or_404(term_ref)
    await _require_term(session, term_id=term_id)
    await remove_favorite(session, user_id=current_user.id, term_id=term_id)
