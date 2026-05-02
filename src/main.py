from fastapi import FastAPI

from src.auth.router import router as auth_router
from src.users.router import router as users_router

app = FastAPI()

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

@app.get("/")
async def root():
    return {"message": "Hello World"}
