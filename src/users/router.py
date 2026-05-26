from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user as get_authenticated_user
from src.auth.dependencies import get_onboarded_user
from src.auth.utils import hash_password
from src.database import get_async_session
from src.users.models import User
from src.users.repository import (
    add_user,
    check_user_exists_by_email,
    check_user_exists_by_username,
    get_user_by_id,
)
from src.users.repository import (
    get_users as get_all_users,
)
from src.users.schemas import (
    GradeSetupRequest,
    UserCreate,
    UsernameSetupRequest,
    UserResponsePrivate,
    UserResponsePublic,
    UserUpdate,
)

router = APIRouter()


@router.get("")
async def get_users(
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> list[UserResponsePublic]:
    users: list[User] = await get_all_users(session)

    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователи не найдены.",
        )

    return users


@router.post(
    "",
    response_model=UserResponsePrivate,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    user_data: UserCreate,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    username_exists: bool = await check_user_exists_by_username(
        session,
        username=user_data.username,
    )

    if username_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username уже существует.",
        )

    email_exists: bool = await check_user_exists_by_email(
        session,
        email=user_data.email,
    )

    if email_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует.",
        )

    new_user: User = await add_user(
        session,
        username=user_data.username,
        email=user_data.email.lower(),
        password_hash=hash_password(user_data.password),
    )

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username или email уже существует.",
        )

    await session.commit()
    await session.refresh(new_user)

    return new_user


@router.patch("/me/username", response_model=UserResponsePrivate)
async def set_my_username(
    username_data: UsernameSetupRequest,
    current_user: Annotated[User, Depends(get_authenticated_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if current_user.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "onboarding_already_completed",
                "message": "Onboarding уже завершен.",
            },
        )

    if current_user.username is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "username_already_set",
                "message": "Username уже установлен.",
            },
        )

    username_exists = await check_user_exists_by_username(
        session,
        username=username_data.username,
    )

    if username_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username уже существует.",
        )

    current_user.username = username_data.username

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username уже существует.",
        )

    await session.refresh(current_user)

    return current_user


@router.patch("/me/grade", response_model=UserResponsePrivate)
async def set_my_grade(
    grade_data: GradeSetupRequest,
    current_user: Annotated[User, Depends(get_authenticated_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if current_user.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "onboarding_already_completed",
                "message": "Onboarding уже завершен.",
            },
        )

    if current_user.grade is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "grade_already_set",
                "message": "Grade уже установлен.",
            },
        )

    if current_user.username is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "onboarding_step_required",
                "next_step": "username",
                "message": "Сначала укажите username.",
            },
        )

    current_user.grade = grade_data.grade
    current_user.onboarding_completed = True

    await session.commit()
    await session.refresh(current_user)

    return current_user


@router.get("/me", response_model=UserResponsePrivate)
async def get_current_user(
    current_user: Annotated[User, Depends(get_onboarded_user)],
):
    return current_user


@router.get("/{user_id}", response_model=UserResponsePublic)
async def get_user(
    user_id: int,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    user: User | None = await get_user_by_id(session, user_id=user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден.",
        )

    return user


@router.patch("/{user_id}", response_model=UserResponsePrivate)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: Annotated[User, Depends(get_onboarded_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не можете обновлять данные другого пользователя",
        )

    user: User | None = await get_user_by_id(session, user_id=user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден.",
        )

    if user_data.username is not None:
        current_username = user.username.lower() if user.username is not None else None

        if user_data.username.lower() != current_username:
            username_exists = await check_user_exists_by_username(
                session,
                username=user_data.username,
            )

            if username_exists:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Пользователь с таким username уже существует.",
                )

    if user_data.email is not None and user_data.email.lower() != user.email.lower():
        email_exists: bool = await check_user_exists_by_email(
            session,
            email=user_data.email,
        )

        if email_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с таким email уже существует.",
            )

    update_data = user_data.model_dump(exclude_unset=True, exclude_none=True)

    for field, value in update_data.items():
        normalized_value = value.lower() if field == "email" else value
        setattr(user, field, normalized_value)

    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким username или email уже существует.",
        )

    await session.commit()
    await session.refresh(user)

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_onboarded_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не можете удалять другого пользователя",
        )

    user: User | None = await get_user_by_id(session, user_id=user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден.",
        )

    await session.delete(user)
    await session.commit()
