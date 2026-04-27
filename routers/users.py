from datetime import timedelta
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm
from PIL import UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from config import settings
from database import get_async_session
from image_utils import delete_profile_image, process_profile_image
from models import User
from repository import add_user
from schemas import Token, UserCreate, UserPrivate, UserPublic, UserUpdate

router = APIRouter()


@router.get(
    "",
    response_model=list[UserPrivate],
)
async def get_users(session: Annotated[AsyncSession, Depends(get_async_session)]):
    result = await session.execute(select(User))

    users = result.scalars().all()

    if not users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No users found",
        )

    return users


@router.post(
    "",
    response_model=UserPrivate,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    user: UserCreate,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    result = await session.execute(
        select(User)
        .where(func.lower(User.username) == user.username.lower()),
    )  # fmt: skip

    existing_username: User | None = result.scalar_one_or_none()

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    result = await session.execute(
        select(User)
        .where(func.lower(User.email) == user.email.lower()),
    )  # fmt: skip

    existing_email: User | None = result.scalar_one_or_none()

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists",
        )

    new_user = await add_user(
        session,
        username=user.username,
        email=user.email.lower(),
        password_hash=hash_password(user.password),
    )

    await session.commit()
    await session.refresh(new_user)

    return new_user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    result = await session.execute(
        select(User)
        .where(func.lower(User.email) == form_data.username.lower()),
    )  # fmt: skip

    user: User | None = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
    )

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserPrivate)
async def get_current_user(
    current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


@router.get("/{user_id}", response_model=UserPublic)
async def get_user(
    user_id: int,
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    result = await session.execute(
        select(User)
        .where(User.id == user_id),
    )  # fmt: skip

    user: User | None = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.patch("/{user_id}", response_model=UserPrivate)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user",
        )

    result = await session.execute(
        select(User)
        .where(User.id == user_id),
    )  # fmt: skip

    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if (
        user_data.username is not None
        and user_data.username.lower() != user.username.lower()
    ):
        result = await session.execute(
            select(User)
            .where(func.lower(User.username) == user_data.username.lower()),
        )  # fmt: skip

        existing_username: User | None = result.scalar_one_or_none()

        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )

    if user_data.email is not None and user_data.email.lower() != user.email.lower():
        result = await session.execute(
            select(User)
            .where(func.lower(User.email) == user_data.email.lower()),
        )  # fmt: skip

        existing_email: User | None = result.scalar_one_or_none()

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value) if field != "email" else setattr(user, field, value.lower())  # fmt: skip

    await session.commit()
    await session.refresh(user)
    return user


@router.patch("/{user_id}/picture", response_model=UserPrivate)
async def update_profile_picture(
    user_id: int,
    file: UploadFile,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's profile picture",
        )

    content = await file.read()

    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds the maximum limit of {settings.max_upload_size_bytes // (1024 * 1024)} MB.",
        )

    try:
        filename = await run_in_threadpool(process_profile_image, content)
    except UnidentifiedImageError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. Please upload a valid image (JPEG, PNG, GIF, WebP).",
        ) from err

    old_filename = current_user.image_file

    current_user.image_file = filename

    await session.commit()
    await session.refresh(current_user)

    if old_filename:
        delete_profile_image(old_filename)

    return current_user


@router.delete("/{user_id}/picture", response_model=UserPrivate)
async def delete_profile_picture(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user's profile picture",
        )

    old_filename = current_user.image_file

    if old_filename is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have a profile picture to delete.",
        )

    current_user.image_file = None

    await session.commit()
    await session.refresh(current_user)

    delete_profile_image(old_filename)

    return current_user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_async_session)],
):
    if user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this user",
        )

    result = await session.execute(
        select(User).where(User.id == user_id),
    )

    user: User | None = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    old_filename = user.image_file

    await session.delete(user)
    await session.commit()

    if old_filename:
        delete_profile_image(old_filename)
