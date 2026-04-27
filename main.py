from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import async_engine
from routers import users


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        yield
    finally:
        await async_engine.dispose()


app = FastAPI(lifespan=lifespan)

app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.get("/")
async def root():
    return {"message": "Hello World"}
