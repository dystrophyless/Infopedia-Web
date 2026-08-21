from pydantic import BaseModel, Field

from src.terms.schemas import TermDetailedResponse


class SearchTermsResponse(BaseModel):
    terms: list[TermDetailedResponse]
    total: int = Field(ge=0)
    skip: int = Field(ge=0)
    limit: int = Field(ge=1)
    has_more: bool
