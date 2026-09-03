# ruff: noqa: F401
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

# Keep this stable chapter FK name in canonical metadata without changing the
# feature model module outside this ownership slice.
for _constraint in AnalyzeResultItem.__table__.foreign_key_constraints:
    if any(element.target_fullname == "chapter.id" for element in _constraint.elements):
        _constraint.name = "fk_analyze_result_items_chapter_id"
