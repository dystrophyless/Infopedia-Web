from contextlib import asynccontextmanager
from urllib.parse import urlsplit, urlunsplit

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.auth.router import router as auth_router
from src.config import settings
from src.database import async_engine, ensure_user_schema_compatibility
from src.search.router import router as search_router
from src.terms.router import router as terms_router
from src.topics.router import router as topics_router
from src.users.router import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await ensure_user_schema_compatibility(async_engine)
        yield
    finally:
        await async_engine.dispose()


def get_cors_origins(frontend_url: str) -> list[str]:
    frontend_origin = frontend_url.rstrip("/")
    origins = {frontend_origin}
    parsed = urlsplit(frontend_origin)

    if parsed.hostname in {"localhost", "127.0.0.1"}:
        alternate_host = "127.0.0.1" if parsed.hostname == "localhost" else "localhost"
        netloc = alternate_host
        if parsed.port:
            netloc = f"{alternate_host}:{parsed.port}"
        origins.add(urlunsplit((parsed.scheme, netloc, "", "", "")))

    return sorted(origins)


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(settings.FRONTEND_URL),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
