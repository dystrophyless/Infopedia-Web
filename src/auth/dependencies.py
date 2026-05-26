from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.utils import oauth2_scheme, verify_access_token
from src.database import get_async_session
from src.users.models import User
from src.users.repository import get_user_by_id


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
) -> User:
    user_id = verify_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Просроченный либо неправильный токен.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Просроченный либо неправильный токен.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user: User | None = await get_user_by_id(session, user_id=user_id_int)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_onboarded_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if current_user.onboarding_completed:
        return current_user

    next_step = "username" if current_user.username is None else "grade"

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "onboarding_required",
            "next_step": next_step,
        },
    )