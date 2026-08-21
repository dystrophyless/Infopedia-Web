from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user
from src.config import settings
from src.database import get_async_session
from src.search.schemas import SearchTermsResponse
from src.search.term_filters import (
    INVALID_SEARCH_FILTERS_DETAIL,
    InvalidTermSearchFiltersError,
    parse_term_search_filters,
)
from src.security.anti_scrape import enforce_anti_scrape
from src.terms.models import Term
from src.terms.repository import (
    search_filtered_terms,
    search_terms_by_prefix,
    search_terms_by_similarity,
)
from src.terms.schemas import TermDetailedResponse
from src.users.models import User

router = APIRouter()


@router.get("/", response_model=list[TermDetailedResponse])
async def search_terms(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    query: Annotated[str, Query(min_length=1, max_length=255)],
    limit: Annotated[int, Query(ge=1, le=settings.ANTI_SCRAPE_MAX_SEARCH_RESULTS)] = 10,
):
    await enforce_anti_scrape(
        request,
        scope="search:terms",
        user_id=current_user.id,
        limit=settings.ANTI_SCRAPE_SEARCH_LIMIT,
    )
    terms: list[Term] | None = await search_terms_by_prefix(
        session,
        limit=limit,
        user_query=query,
    )

    if not terms:
        terms = await search_terms_by_prefix(
            session,
            limit=limit,
            user_query=query,
            prefix=False,
        )

    if not terms:
        terms = await search_terms_by_similarity(
            session,
            limit=limit,
            user_query=query,
        )

    return terms or []


@router.get("/terms", response_model=SearchTermsResponse)
async def search_terms_filtered(  # noqa: PLR0913
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
    query: Annotated[str, Query(max_length=255)] = "",
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=settings.ANTI_SCRAPE_MAX_SEARCH_RESULTS)] = 10,
    grades: Annotated[list[str] | None, Query(alias="grade")] = None,
    book_refs: Annotated[list[str] | None, Query(alias="book")] = None,
    chapter_refs: Annotated[list[str] | None, Query(alias="chapter")] = None,
    ent_only: Annotated[bool, Query()] = False,  # noqa: FBT002
):
    await enforce_anti_scrape(
        request,
        scope="search:terms",
        user_id=current_user.id,
        limit=settings.ANTI_SCRAPE_SEARCH_LIMIT,
    )
    try:
        filters = parse_term_search_filters(
            query=query,
            grades=list(grades or ()),
            book_refs=list(book_refs or ()),
            chapter_refs=list(chapter_refs or ()),
            ent_only=ent_only,
        )
    except InvalidTermSearchFiltersError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=INVALID_SEARCH_FILTERS_DETAIL,
        ) from None

    page = await search_filtered_terms(
        session,
        filters=filters,
        skip=skip,
        limit=limit,
    )
    terms = [TermDetailedResponse.model_validate(term) for term in page.terms]
    return SearchTermsResponse(
        terms=terms,
        total=page.total,
        skip=skip,
        limit=limit,
        has_more=skip + len(terms) < page.total,
    )
