# ruff: noqa: C901, PLR0915, PT009, PT027
import asyncio
import os
import re
import sys
import unittest
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import delete
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import src.favorites.models  # noqa: F401 - mirror production bootstrap model registration
from src.schema import initialize_schema
from src.security.public_refs import encode_public_ref
from src.tests.errors import AttemptCompletedError
from src.tests.models import (
    TestAttempt,
    TestAttemptQuestion,
    TestQuestion,
    TestQuestionOption,
)
from src.tests.repository import read_dashboard_history
from src.tests.service import TestsService
from src.topics.models import Book, Chapter, Topic, TopicCode, TopicMapping
from src.users.enums import UserGrade, UserLanguage, UserRole
from src.users.models import User

if sys.platform == "win32" and hasattr(asyncio, "WindowsSelectorEventLoopPolicy"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


def _validated_concurrency_database_url() -> str:
    if os.environ.get("ALLOW_DISPOSABLE_POSTGRES") != "1":
        raise ValueError("ALLOW_DISPOSABLE_POSTGRES=1 is required")
    database_url = os.environ.get("TEST_DISPOSABLE_DATABASE_URL", "").strip()
    if not database_url.startswith("postgresql+psycopg://"):
        raise ValueError("TEST_DISPOSABLE_DATABASE_URL must use postgresql+psycopg://")
    database_name = make_url(database_url).database or ""
    if not re.fullmatch(r"infopedia_concurrency_[0-9a-f]{12}", database_name):
        raise ValueError("TEST_DISPOSABLE_DATABASE_URL must target infopedia_concurrency_<12hex>")
    return database_url


class TestTestsAttemptConcurrencyPostgres(unittest.IsolatedAsyncioTestCase):
    def test_database_configuration_fails_closed(self):
        original_opt_in = os.environ.pop("ALLOW_DISPOSABLE_POSTGRES", None)
        original_url = os.environ.pop("TEST_DISPOSABLE_DATABASE_URL", None)
        try:
            with self.assertRaises(ValueError):
                _validated_concurrency_database_url()
            os.environ["ALLOW_DISPOSABLE_POSTGRES"] = "1"
            os.environ["TEST_DISPOSABLE_DATABASE_URL"] = "postgresql+psycopg://example@localhost:5432/infopedia"
            with self.assertRaises(ValueError):
                _validated_concurrency_database_url()
        finally:
            if original_opt_in is not None:
                os.environ["ALLOW_DISPOSABLE_POSTGRES"] = original_opt_in
            else:
                os.environ.pop("ALLOW_DISPOSABLE_POSTGRES", None)
            if original_url is not None:
                os.environ["TEST_DISPOSABLE_DATABASE_URL"] = original_url
            else:
                os.environ.pop("TEST_DISPOSABLE_DATABASE_URL", None)

    async def test_two_client_answer_and_complete_linearization(self):  # noqa: PLR0912
        database_url = os.environ.get("TEST_DISPOSABLE_DATABASE_URL", "")
        if not database_url:
            if os.environ.get("REQUIRE_POSTGRES_INTEGRATION") == "1":
                self.fail("NOT RUN: TEST_DISPOSABLE_DATABASE_URL is required for PostgreSQL concurrency verification")
            self.skipTest("NOT RUN: set TEST_DISPOSABLE_DATABASE_URL and ALLOW_DISPOSABLE_POSTGRES=1 for the concurrency gate")
        try:
            database_url = _validated_concurrency_database_url()
        except ValueError as exc:
            self.fail(str(exc))

        engine = create_async_engine(database_url, pool_size=4, max_overflow=0)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        attempt_ids: list[int] = []
        created_question_ids: list[int] = []
        created_mapping_keys: list[tuple[int, int]] = []
        created_topic_ids: list[int] = []
        created_topic_code_ids: list[int] = []
        created_chapter_ids: list[int] = []
        created_book_ids: list[int] = []
        created_user_ids: list[int] = []
        try:
            # The caller must provide a uniquely named disposable database;
            # this gate never initializes or mutates the live target.
            await initialize_schema(engine)
            async with sessions() as setup:
                fixture_tag = uuid4().hex
                user = User(
                    username=f"tests_gate_{fixture_tag[:20]}",
                    email=f"tests-gate-{fixture_tag}@example.test",
                    language=UserLanguage.RUSSIAN,
                    grade=UserGrade.GRADE_11,
                    role=UserRole.CLIENT,
                    banned=False,
                )
                book = Book(publisher=f"tests-gate-{fixture_tag}", grade=11)
                chapter = Chapter(code=f"tests-gate-{fixture_tag}")
                topic_code = TopicCode(name=f"tests-gate-{fixture_tag}", chapter=chapter)
                topic = Topic(
                    name=f"tests-gate-{fixture_tag}",
                    page_start=1,
                    page_end=1,
                    book=book,
                )
                setup.add_all([user, book, chapter, topic_code, topic])
                await setup.flush()
                setup.add(TopicMapping(topic_id=topic.id, topic_code_id=topic_code.id))
                await setup.flush()
                created_user_ids.append(user.id)
                created_book_ids.append(book.id)
                created_chapter_ids.append(chapter.id)
                created_topic_code_ids.append(topic_code.id)
                created_topic_ids.append(topic.id)
                created_mapping_keys.append((topic.id, topic_code.id))
                user_id = user.id
                topic_id = topic.id
                chapter_id = chapter.id
                questions = []
                for index in range(3):
                    fixture = TestQuestion(
                        source_key=f"concurrency-{fixture_tag}-{index}",
                        topic_id=topic_id,
                        prompt=f"Concurrency verification question {index + 1}",
                        explanation="Server-owned answer",
                    )
                    fixture.options.extend(
                        [
                            TestQuestionOption(source_ref="a", label="A", text="Correct", is_correct=True),
                            TestQuestionOption(source_ref="b", label="B", text="Wrong", is_correct=False),
                        ],
                    )
                    setup.add(fixture)
                    questions.append(fixture)
                await setup.flush()
                created_question_ids = [question.id for question in questions]
                correct_option_ref = encode_public_ref("test_option", questions[0].options[0].id)

                async def create_attempt(title: str) -> tuple[int, list[str], str]:
                    attempt = TestAttempt(
                        user_id=user_id,
                        mode="random",
                        title=title,
                        questions_total=len(questions),
                    )
                    setup.add(attempt)
                    await setup.flush()
                    question_refs: list[str] = []
                    for ordinal, fixture in enumerate(questions):
                        correct_option = fixture.options[0]
                        question_ref = encode_public_ref("test_question", fixture.id)
                        question_refs.append(question_ref)
                        setup.add(
                            TestAttemptQuestion(
                                attempt_id=attempt.id,
                                question_id=fixture.id,
                                ordinal=ordinal,
                                question_ref=question_ref,
                                prompt=fixture.prompt,
                                options_json=[
                                    {
                                        "option_ref": encode_public_ref("test_option", item.id),
                                        "label": item.label,
                                        "text": item.text,
                                    }
                                    for item in fixture.options
                                ],
                                correct_option_ref=encode_public_ref("test_option", correct_option.id),
                                explanation=fixture.explanation,
                                chapter_id=chapter_id,
                                topic_title="Concurrency",
                            ),
                        )
                    await setup.commit()
                    attempt_ids.append(attempt.id)
                    return attempt.id, question_refs, encode_public_ref("attempt", attempt.id)

                attempt_title_prefix = f"Concurrency {fixture_tag}"
                empty_attempt_id, empty_question_refs, empty_attempt_ref = await create_attempt(f"{attempt_title_prefix} empty")
                partial_attempt_id, partial_question_refs, partial_attempt_ref = await create_attempt(f"{attempt_title_prefix} partial")
                race_attempt_id, race_question_refs, race_attempt_ref = await create_attempt(f"{attempt_title_prefix} race")
                user_ref = user_id

            fixed_now = datetime.now(UTC)

            async def complete_once(
                attempt_ref: str,
                *,
                ready: asyncio.Event | None = None,
                start: asyncio.Event | None = None,
            ):
                async with sessions() as session:
                    if ready is not None and start is not None:
                        ready.set()
                        await start.wait()
                    return await TestsService(session, now=fixed_now).complete_attempt(
                        user_id=user_ref,
                        attempt_ref=attempt_ref,
                    )

            empty_ready_a = asyncio.Event()
            empty_ready_b = asyncio.Event()
            empty_start = asyncio.Event()
            empty_tasks = (
                asyncio.create_task(complete_once(empty_attempt_ref, ready=empty_ready_a, start=empty_start)),
                asyncio.create_task(complete_once(empty_attempt_ref, ready=empty_ready_b, start=empty_start)),
            )
            await asyncio.gather(empty_ready_a.wait(), empty_ready_b.wait())
            empty_start.set()
            empty_summary_a, empty_summary_b = await asyncio.gather(*empty_tasks)
            self.assertEqual(empty_summary_a, empty_summary_b)
            self.assertEqual(
                {
                    key: empty_summary_a[key]
                    for key in ("total_questions", "answered_questions", "correct_answer_count", "score_percent")
                },
                {"total_questions": 3, "answered_questions": 0, "correct_answer_count": 0, "score_percent": 0},
            )

            async with sessions() as session:
                with self.assertRaises(AttemptCompletedError):
                    await TestsService(session, now=fixed_now).submit_answer(
                        user_id=user_ref,
                        attempt_ref=empty_attempt_ref,
                        question_ref=empty_question_refs[0],
                        option_ref=correct_option_ref,
                    )

                empty_reread = await TestsService(session, now=fixed_now).get_attempt_response(
                    user_id=user_ref,
                    attempt_ref=empty_attempt_ref,
                )
                self.assertEqual(empty_reread.summary_json, empty_summary_a)

            async with sessions() as session:
                partial_answer = await TestsService(session, now=fixed_now).submit_answer(
                    user_id=user_ref,
                    attempt_ref=partial_attempt_ref,
                    question_ref=partial_question_refs[0],
                    option_ref=correct_option_ref,
                )
                self.assertTrue(partial_answer["correct"])
            partial_summary = await complete_once(partial_attempt_ref)
            self.assertEqual(partial_summary["total_questions"], 3)
            self.assertEqual(partial_summary["answered_questions"], 1)
            self.assertEqual(partial_summary["correct_answer_count"], 1)
            self.assertEqual(partial_summary["score_percent"], 33.33)
            self.assertEqual(await complete_once(partial_attempt_ref), partial_summary)

            race_answer_ready = asyncio.Event()
            race_complete_ready = asyncio.Event()
            race_start = asyncio.Event()

            async def answer_race():
                async with sessions() as session:
                    race_answer_ready.set()
                    await race_start.wait()
                    try:
                        return await TestsService(session, now=fixed_now).submit_answer(
                            user_id=user_ref,
                            attempt_ref=race_attempt_ref,
                            question_ref=race_question_refs[0],
                            option_ref=correct_option_ref,
                        )
                    except AttemptCompletedError:
                        return "completed"

            race_answer_task = asyncio.create_task(answer_race())
            race_complete_task = asyncio.create_task(
                complete_once(race_attempt_ref, ready=race_complete_ready, start=race_start),
            )
            await asyncio.gather(race_answer_ready.wait(), race_complete_ready.wait())
            race_start.set()
            race_answer, race_summary = await asyncio.gather(race_answer_task, race_complete_task)
            self.assertTrue(race_answer == "completed" or isinstance(race_answer, dict))
            self.assertIn(race_summary["answered_questions"], (0, 1))
            if race_answer == "completed":
                self.assertEqual(race_summary["answered_questions"], 0)
            else:
                self.assertEqual(race_answer["option_ref"], correct_option_ref)
                self.assertEqual(race_summary["answered_questions"], 1)

            async with sessions() as session:
                with self.assertRaises(AttemptCompletedError):
                    await TestsService(session, now=fixed_now).submit_answer(
                        user_id=user_ref,
                        attempt_ref=race_attempt_ref,
                        question_ref=race_question_refs[1],
                        option_ref=correct_option_ref,
                    )
                race_reread = await TestsService(session, now=fixed_now).get_attempt_response(
                    user_id=user_ref,
                    attempt_ref=race_attempt_ref,
                )
                self.assertEqual(race_reread.summary_json, race_summary)

                dashboard_first = await read_dashboard_history(session, user_id=user_ref)
                dashboard_second = await read_dashboard_history(session, user_id=user_ref)
                for attempt_id, expected_total in (
                    (empty_attempt_id, 3),
                    (partial_attempt_id, 3),
                    (race_attempt_id, 3),
                ):
                    rows_first = [row for row in dashboard_first["history"] if row["attempt_id"] == attempt_id]
                    rows_second = [row for row in dashboard_second["history"] if row["attempt_id"] == attempt_id]
                    self.assertEqual(rows_first, rows_second)
                    self.assertEqual(len(rows_first), expected_total)
                    if attempt_id == empty_attempt_id:
                        self.assertEqual([row["awarded_weight"] for row in rows_first], [None, None, None])
                    elif attempt_id == partial_attempt_id:
                        self.assertEqual(sum(row["awarded_weight"] or 0 for row in rows_first), 1)
                        self.assertEqual(sum(row["awarded_weight"] is None for row in rows_first), 2)
                    else:
                        self.assertEqual(
                            sum(row["awarded_weight"] or 0 for row in rows_first),
                            race_summary["correct_answer_count"],
                        )
                        self.assertEqual(
                            sum(row["awarded_weight"] is None for row in rows_first),
                            3 - race_summary["answered_questions"],
                        )

        finally:
            async with engine.begin() as connection:
                if attempt_ids:
                    await connection.execute(delete(TestAttempt).where(TestAttempt.id.in_(attempt_ids)))
                if created_question_ids:
                    await connection.execute(delete(TestQuestion).where(TestQuestion.id.in_(created_question_ids)))
                if created_mapping_keys:
                    await connection.execute(
                        delete(TopicMapping).where(
                            TopicMapping.topic_id.in_([topic_id for topic_id, _ in created_mapping_keys]),
                            TopicMapping.topic_code_id.in_([topic_code_id for _, topic_code_id in created_mapping_keys]),
                        ),
                    )
                if created_topic_ids:
                    await connection.execute(delete(Topic).where(Topic.id.in_(created_topic_ids)))
                if created_topic_code_ids:
                    await connection.execute(delete(TopicCode).where(TopicCode.id.in_(created_topic_code_ids)))
                if created_chapter_ids:
                    await connection.execute(delete(Chapter).where(Chapter.id.in_(created_chapter_ids)))
                if created_book_ids:
                    await connection.execute(delete(Book).where(Book.id.in_(created_book_ids)))
                if created_user_ids:
                    await connection.execute(delete(User).where(User.id.in_(created_user_ids)))
            await engine.dispose()


if __name__ == "__main__":
    unittest.main()
