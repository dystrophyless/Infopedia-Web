from __future__ import annotations

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.favorites.models import FavoriteTerm
from src.terms.models import Definition, Term
from src.topics.models import Topic


def _term_details_options():
    return selectinload(Term.definitions).joinedload(Definition.topic).joinedload(Topic.book)


async def get_user_favorites(
    session: AsyncSession,
    *,
    user_id: int,
    skip: int,
    limit: int,
) -> list[Term]:
    query = (
        select(Term)
        .join(FavoriteTerm, FavoriteTerm.term_id == Term.id)
        .where(FavoriteTerm.user_id == user_id)
        .order_by(FavoriteTerm.created_at.desc(), FavoriteTerm.term_id.desc())
        .offset(skip)
        .limit(limit)
        .options(_term_details_options())
    )
    result = await session.execute(query)
    return list(result.scalars().all())


async def count_user_favorites(session: AsyncSession, *, user_id: int) -> int:
    query = select(func.count()).select_from(FavoriteTerm).where(FavoriteTerm.user_id == user_id)
    result = await session.execute(query)
    return int(result.scalar_one() or 0)


async def get_term_by_id(session: AsyncSession, *, term_id: int) -> Term | None:
    query = select(Term).where(Term.id == term_id).options(_term_details_options())
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def get_existing_term_ids(session: AsyncSession, *, term_ids: list[int]) -> set[int]:
    if not term_ids:
        return set()
    query = select(Term.id).where(Term.id.in_(term_ids))
    result = await session.execute(query)
    return set(result.scalars().all())


async def get_favorite(session: AsyncSession, *, user_id: int, term_id: int) -> FavoriteTerm | None:
    query = select(FavoriteTerm).where(
        FavoriteTerm.user_id == user_id,
        FavoriteTerm.term_id == term_id,
    )
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def get_favorite_term_ids(
    session: AsyncSession,
    *,
    user_id: int,
    term_ids: list[int],
) -> set[int]:
    if not term_ids:
        return set()
    query = select(FavoriteTerm.term_id).where(
        FavoriteTerm.user_id == user_id,
        FavoriteTerm.term_id.in_(term_ids),
    )
    result = await session.execute(query)
    return set(result.scalars().all())


async def add_favorite(session: AsyncSession, *, user_id: int, term_id: int) -> None:
    existing = await get_favorite(session, user_id=user_id, term_id=term_id)
    if existing is not None:
        return
    session.add(FavoriteTerm(user_id=user_id, term_id=term_id))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        # A concurrent request may have inserted the same composite key; the
        # operation is intentionally idempotent.
        if await get_favorite(session, user_id=user_id, term_id=term_id) is None:
            raise


async def remove_favorite(session: AsyncSession, *, user_id: int, term_id: int) -> None:
    await session.execute(
        delete(FavoriteTerm).where(
            FavoriteTerm.user_id == user_id,
            FavoriteTerm.term_id == term_id,
        )
    )
    await session.commit()
