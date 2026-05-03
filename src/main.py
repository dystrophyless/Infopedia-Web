from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.auth.router import router as auth_router
from src.database import async_engine
from src.search.router import router as search_router
from src.terms.router import router as terms_router
from src.topics.router import router as topics_router
from src.users.router import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        yield
    finally:
        await async_engine.dispose()


app = FastAPI(lifespan=lifespan)

app.include_router(
    users_router,
    prefix="/api/users",
    tags=["users"],
)

app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["auth"],
)

app.include_router(
    terms_router,
    prefix="/api/terms",
    tags=["terms"],
)

app.include_router(
    search_router,
    prefix="/api/search",
    tags=["search"],
)

app.include_router(
    topics_router,
    prefix="/api/topics",
    tags=["topics"],
)


@app.get("/")
async def root():
    return {"message": "Hello World"}
