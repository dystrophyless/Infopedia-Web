# ruff: noqa: E402, F401
from src.analyze.models import AnalyzeResult, AnalyzeResultItem
from src.auth.models import AuthIdentity, PasswordResetToken, PendingUser, RefreshToken
from src.database import Base
from src.terms.models import Definition, Term
from src.tests.models import (
    TestAttempt,
    TestAttemptAnswer,
    TestAttemptQuestion,
    TestCatalogGeneration,
    TestCatalogStat,
    TestCatalogState,
    TestQuestion,
    TestQuestionOption,
)
from src.topics.models import (
    Book,
    BookChapterCoverage,
    Chapter,
    ChapterTranslation,
    Topic,
    TopicCode,
    TopicCodeTranslation,
    TopicMapping,
)
from src.users.models import FeatureUsage, User

# Keep the migration-era chapter FK name in the canonical metadata without
# changing the feature model module outside this ownership slice.
for _constraint in AnalyzeResultItem.__table__.foreign_key_constraints:
    if any(element.target_fullname == "chapter.id" for element in _constraint.elements):
        _constraint.name = "fk_analyze_result_items_chapter_id"

# The trigram index is PostgreSQL-specific but belongs to the canonical ORM
# metadata so a fresh ``create_all`` schema matches the bootstrap contract.
from sqlalchemy import Index

if not any(index.name == "idx_term_name_trgm" for index in Term.__table__.indexes):
    Index(
        "idx_term_name_trgm",
        Term.__table__.c.name,
        postgresql_using="gin",
        postgresql_ops={"name": "gin_trgm_ops"},
    )
