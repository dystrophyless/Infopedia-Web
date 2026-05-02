import logging
from typing import cast

from sqlalchemy import select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from src.users.enums import UserGrade, UserLanguage, UserRole
from src.users.models import User

logger = logging.getLogger(__name__)


async def add_user(
    session: AsyncSession,
    *,
    username: str,
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


async def get_users(
    session: AsyncSession,
) -> list[User]:  # fmt: skip
    query = select(User)

    result = await session.execute(query)

    users: list[User] = result.scalars().all()

    logger.debug(
        "Получили список всех пользователей из базы данных. Кол-во: %d",
        len(users),
    )

    return users


async def get_user_by_id(
    session: AsyncSession,
    *,
    user_id: int,
) -> User | None:  # fmt: skip
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


async def get_user_by_email(
    session: AsyncSession,
    *,
    email: str,
) -> User | None:  # fmt: skip
    query = (
        select(User)
        .where(User.email == email)
    )  # fmt: skip

    result = await session.execute(query)

    user: User | None = result.scalar_one_or_none()

    if user is None:
        logger.debug(
            "Не удалось получить пользователя с `email`='%s' из базы данных",
            email,
        )
        return None

    logger.debug("Получили данные для пользователя с `email`='%s'", email)

    return user


async def check_user_exists_by_username(
    session: AsyncSession,
    *,
    username: str,
) -> bool:  # fmt: skip
    query = (
        select(User.id)
        .where(User.username == username)
    )  # fmt: skip

    result = await session.execute(query)

    user_id: int | None = result.scalar_one_or_none()

    exists: bool = user_id is not None

    logger.debug(
        "Пользователь с `username`='%s'%s существует в базе данных",
        username,
        "" if exists else " не",
    )

    return exists


async def check_user_exists_by_email(
    session: AsyncSession,
    *,
    email: str,
) -> bool:  # fmt: skip
    query = (
        select(User.id)
        .where(User.email == email)
    )  # fmt: skip

    result = await session.execute(query)

    user_id: int | None = result.scalar_one_or_none()

    exists: bool = user_id is not None

    logger.debug(
        "Пользователь с `email`='%s'%s существует в базе данных",
        email,
        "" if exists else " не",
    )

    return exists


async def get_user_banned_status(
    session: AsyncSession,
    *,
    user_id: int,
) -> bool | None:  # fmt: skip
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


async def update_user_banned_status(
    session: AsyncSession,
    *,
    banned: bool,
    user_id: int,
) -> None:  # fmt: skip
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(banned=banned)
    )  # fmt: skip

    result: CursorResult = cast("CursorResult", await session.execute(stmt))

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


async def get_user_language(
    session: AsyncSession,
    *,
    user_id: int,
) -> UserLanguage | None:  # fmt: skip
    query = (
        select(User.language)
        .where(User.id == user_id)
    )  # fmt: skip

    result = await session.execute(query)

    language: UserLanguage | None = result.scalar_one_or_none()

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


async def update_user_language(
    session: AsyncSession,
    *,
    language: UserLanguage,
    user_id: int,
) -> None:  # fmt: skip
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(language=language)
    )  # fmt: skip

    result: CursorResult = cast("CursorResult", await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug("Попытка обновить язык несуществующему пользователю: %d", user_id)
        return

    logger.debug(
        "Язык `language`='%s' был установлен для пользователя с `user_id`='%d'",
        language,
        user_id,
    )


async def get_user_role(
    session: AsyncSession,
    *,
    user_id: int,
) -> UserRole | None:  # fmt: skip
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


async def update_user_role(
    session: AsyncSession,
    *,
    user_id: int,
    role: UserRole,
) -> None:  # fmt: skip
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(role=role)
    )  # fmt: skip

    result: CursorResult = cast("CursorResult", await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return

    logger.debug(
        "Роль `role`='%s' была установлена для пользователя с `user_id`='%d'",
        role,
        user_id,
    )


async def get_user_grade(
    session: AsyncSession,
    *,
    user_id: int,
) -> UserGrade | None:  # fmt: skip
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


async def update_user_grade(
    session: AsyncSession,
    *,
    user_id: int,
    grade: UserGrade,
) -> None:  # fmt: skip
    stmt = (
        update(User)
        .where(User.id == user_id)
        .values(grade=grade)
    )  # fmt: skip

    result: CursorResult = cast("CursorResult", await session.execute(stmt))

    if result.rowcount == 0:
        logger.debug(
            "Не удалось получить пользователя с `user_id`='%s' из базы данных",
            user_id,
        )
        return

    logger.debug(
        "Класс `grade`='%s' был установлен для пользователя с `user_id`='%d'",
        grade,
        user_id,
    )
