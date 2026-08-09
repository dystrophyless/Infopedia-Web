# ruff: noqa: C901, PLR0915, PT009
import asyncio
import os
import sys
import unittest
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from src.migrations.tests_migration import migrate_tests_schema
from src.security.public_refs import encode_public_ref
from src.tests.errors import AnswerAlreadySubmittedError
from src.tests.models import (
    TestAttempt,
    TestAttemptQuestion,
    TestQuestion,
    TestQuestionOption,
)
from src.tests.service import TestsService
from src.topics.models import Chapter, Topic, TopicCode, TopicMapping
from src.users.models import User

if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


class TestTestsAttemptConcurrencyPostgres(unittest.IsolatedAsyncioTestCase):
    async def test_two_client_answer_and_complete_linearization(self):
        database_url = os.environ.get("TEST_DATABASE_URL", "")
        if not database_url:
            if os.environ.get("REQUIRE_POSTGRES_INTEGRATION") == "1":
                self.fail("NOT RUN: TEST_DATABASE_URL is required for PostgreSQL concurrency verification")
            self.skipTest("NOT RUN: set TEST_DATABASE_URL for the two-client PostgreSQL concurrency gate")
        if not database_url.startswith("postgresql+psycopg"):
            self.fail("PostgreSQL concurrency gate requires a postgresql+psycopg TEST_DATABASE_URL")

        engine = create_async_engine(database_url, pool_size=4, max_overflow=0)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        attempt_id: int | None = None
        created_question_id: int | None = None
        try:
            await migrate_tests_schema(engine)
            async with sessions() as setup:
                user_id = (await setup.execute(select(User.id).order_by(User.id).limit(1))).scalar_one_or_none()
                eligibility = (
                    await setup.execute(
                        select(Topic.id, Chapter.id)
                        .join(TopicMapping, TopicMapping.topic_id == Topic.id)
                        .join(TopicCode, TopicCode.id == TopicMapping.topic_code_id)
                        .join(Chapter, Chapter.id == TopicCode.chapter_id)
                        .order_by(Topic.id, Chapter.id)
                        .limit(1),
                    )
                ).one_or_none()
                question = (
                    await setup.execute(
                        select(TestQuestion)
                        .options(selectinload(TestQuestion.options))
                        .where(TestQuestion.active.is_(True))
                        .order_by(TestQuestion.id)
                        .limit(1),
                    )
                ).scalar_one_or_none()
                if user_id is None or eligibility is None:
                    self.skipTest("NOT RUN: PostgreSQL app schema has no user and eligible topic/chapter fixture")
                topic_id, chapter_id = eligibility
                if question is None or len(question.options) < 1:
                    question = TestQuestion(
                        source_key=f"concurrency-{uuid4().hex}",
                        topic_id=topic_id,
                        prompt="Concurrency verification question",
                        explanation="Server-owned answer",
                    )
                    question.options.extend(
                        [
                            TestQuestionOption(source_ref="a", label="A", text="Correct", is_correct=True),
                            TestQuestionOption(source_ref="b", label="B", text="Wrong", is_correct=False),
                        ],
                    )
                    setup.add(question)
                    await setup.flush()
                    created_question_id = question.id
                option = question.options[0]
                attempt = TestAttempt(
                    user_id=user_id,
                    mode="random",
                    title="Concurrency verification",
                    questions_total=1,
                )
                setup.add(attempt)
                await setup.flush()
                snapshot = TestAttemptQuestion(
                    attempt_id=attempt.id,
                    question_id=question.id,
                    ordinal=0,
                    question_ref=encode_public_ref("test_question", question.id),
                    prompt=question.prompt,
                    options_json=[
                        {
                            "option_ref": encode_public_ref("test_option", item.id),
                            "label": item.label,
                            "text": item.text,
                        }
                        for item in question.options
                    ],
                    correct_option_ref=encode_public_ref("test_option", option.id),
                    explanation=question.explanation,
                    chapter_id=chapter_id,
                    topic_title="Concurrency",
                )
                setup.add(snapshot)
                await setup.commit()
                attempt_id = attempt.id
                user_ref = user_id
                attempt_ref = encode_public_ref("attempt", attempt.id)
                question_ref = snapshot.question_ref
                option_ref = encode_public_ref("test_option", option.id)

            fixed_now = datetime.now(UTC)

            async def submit_once():
                async with sessions() as session:
                    try:
                        return await TestsService(session, now=fixed_now).submit_answer(
                            user_id=user_ref,
                            attempt_ref=attempt_ref,
                            question_ref=question_ref,
                            option_ref=option_ref,
                        )
                    except AnswerAlreadySubmittedError:
                        return "conflict"

            first, second = await asyncio.gather(submit_once(), submit_once())
            self.assertNotEqual(first, "conflict")
            self.assertNotEqual(second, "conflict")
            self.assertEqual(first["option_ref"], option_ref)
            self.assertEqual(second["option_ref"], option_ref)

            async def complete_once():
                async with sessions() as session:
                    return await TestsService(session, now=fixed_now).complete_attempt(
                        user_id=user_ref,
                        attempt_ref=attempt_ref,
                    )

            summary_a, summary_b = await asyncio.gather(complete_once(), complete_once())
            self.assertEqual(summary_a, summary_b)
            self.assertEqual(summary_a["answered_questions"], 1)
        finally:
            if attempt_id is not None:
                async with engine.begin() as connection:
                    await connection.execute(delete(TestAttempt).where(TestAttempt.id == attempt_id))
            if created_question_id is not None:
                async with engine.begin() as connection:
                    await connection.execute(delete(TestQuestion).where(TestQuestion.id == created_question_id))
            await engine.dispose()


if __name__ == "__main__":
    unittest.main()
