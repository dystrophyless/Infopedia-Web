import logging
from typing import cast

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from enums import UserGrade, UserLanguage, UserRole
from models import Activity, User

logger = logging.getLogger(__name__)


async def add_user(
    session: AsyncSession,
    *,
    username: str | None = None,
    email: str,
    password_hash: str,
    language: UserLanguage = UserLanguage.RUSSIAN,
    grade: UserGrade = UserGrade.GRADE_UNDEFINED,
    role: UserRole = UserRole.USER,
    banned: bool = False,
) -> User:
    new_user: User = User(
        username=username,
        email=email,
        password_hash=password_hash,
        language=language,
        grade=grade,
        role=role,
        banned=banned,
    )
    session.add(new_user)
    await session.flush()

    logger.debug(
        "Пользователь был добавлен в базу данных."
        "`id`='%d', `email`='%s', `language`='%s', `grade`='%s', `role`='%s', `banned`='%s'",
        new_user.id,
        email,
        language,
        grade,
        role,
        banned,
    )

    return new_user


async def get_user(session: AsyncSession, *, user_id: int) -> User | None:
    query = (
        select(User)
        .where(User.id == user_id)
    )  # fmt: skip

    result = await session.execute(query)

    user: User | None = result.scalar_one_or_none()

    if user is None:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return None

    logger.debug("Получили данные для пользователя с `user_id`='%d'", user_id)

    return user


async def change_user_alive_status(
    session: AsyncSession,
    *,
    is_alive: bool,
    user_id: int,
) -> None:
    stmt = update(User).where(User.id == user_id).values(is_alive=is_alive)
    result: CursorResult = cast(CursorResult, await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return

    logger.debug(
        "Обновлён статус `is_alive` на '%s' для пользователя с `user_id`='%d'",
        is_alive,
        user_id,
    )


async def change_user_banned_status_by_id(
    session: AsyncSession,
    *,
    banned: bool,
    user_id: int,
) -> None:
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(banned=banned)
    )  # fmt: skip

    result: CursorResult = cast(CursorResult, await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return

    logger.debug(
        "Обновлён статус `banned` на '%s' для пользователя с `user_id`='%d'",
        banned,
        user_id,
    )


async def change_user_banned_status_by_username(
    session: AsyncSession,
    *,
    banned: bool,
    username: str,
) -> None:
    stmt = (
        update(User)
        .where(User.username == username)
        .values(banned=banned)
    )  # fmt: skip

    result: CursorResult = cast(CursorResult, await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug(
            "Не удалось получить пользователя с `username`='%s' из базы данных",
            username,
        )
        return

    logger.debug(
        "Обновлён статус `banned` на '%s' для пользователя с `username`='%s'",
        banned,
        username,
    )


async def update_user_language(
    session: AsyncSession,
    *,
    language: str,
    user_id: int,
) -> None:
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(language=language)
    )  # fmt: skip

    result: CursorResult = cast(CursorResult, await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug("Попытка обновить язык несуществующему пользователю: %d", user_id)
        return

    logger.debug(
        "Язык `language`='%s' был установлен для пользователя с `user_id`='%d'",
        language,
        user_id,
    )


async def get_user_language(session: AsyncSession, *, user_id: int) -> str | None:
    query = (
        select(User.language)
        .where(User.id == user_id)
    )  # fmt: skip

    result = await session.execute(query)

    language: str = result.scalar_one_or_none()

    if language is None:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return None

    logger.debug(
        "У пользователя с `user_id`='%d' установлен следующий язык `language`='%s'",
        user_id,
        language,
    )

    return language


async def get_user_banned_status_by_id(
    session: AsyncSession,
    *,
    user_id: int,
) -> bool | None:
    query = (
        select(User.banned)
        .where(User.id == user_id)
    )  # fmt: skip
    result = await session.execute(query)

    banned: bool = result.scalar_one_or_none()

    if banned is None:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return None

    logger.debug(
        "У пользователя с `user_id`='%d' установлен следующий статус `banned`='%s'",
        user_id,
        banned,
    )

    return banned


async def get_user_banned_status_by_username(
    session: AsyncSession,
    *,
    username: str,
) -> bool | None:
    query = (
        select(User.banned)
        .where(User.username == username)
    )  # fmt: skip

    result = await session.execute(query)

    banned: bool = result.scalar_one_or_none()

    if banned is None:
        logger.debug(
            "Не удалось получить пользователя с `username`='%s' из базы данных",
            username,
        )
        return None

    logger.debug(
        "У пользователя с `username`='%s' установлен следующий статус `banned`='%s'",
        username,
        banned,
    )

    return banned


async def get_user_role(session: AsyncSession, *, user_id: int) -> UserRole | None:
    query = (
        select(User.role)
        .where(User.id == user_id)
    )  # fmt: skip

    result = await session.execute(query)

    role: UserRole = result.scalar_one_or_none()

    if role is None:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return None

    logger.debug(
        "У пользователя с `user_id`='%s' установлена следующая роль: %s",
        user_id,
        role,
    )

    return role


async def get_user_grade(session: AsyncSession, *, user_id: int) -> UserGrade | None:
    query = (
        select(User.grade)
        .where(User.id == user_id)
    )  # fmt: skip

    result = await session.execute(query)

    grade: UserGrade = result.scalar_one_or_none()

    if grade is None:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return None

    logger.debug(
        "У пользователя с `user_id`='%s' установлена следующий класс: %s",
        user_id,
        grade,
    )

    return grade


async def add_user_activity(session: AsyncSession, *, user_id: int) -> None:
    stmt = (
        insert(Activity)
        .values(user_id=user_id)
        .on_conflict_do_update(
            index_elements=["user_id", "activity_date"],
            set_={"actions": Activity.actions + 1},
        )
    )
    await session.execute(stmt)
    logger.debug(
        "Активность пользователя с `user_id`='%d' была обновлена в таблице `activity`",
        user_id,
    )
