from pydantic import EmailStr, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="allow",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    SECRET_KEY: SecretStr
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    FRONTEND_URL: str = "http://localhost:5173"

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: SecretStr
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"
    GOOGLE_OAUTH_STATE_TTL_SECONDS: int = 600

    VERIFICATION_CODE_EXPIRE_MINUTES: int
    REGISTRATION_RESEND_COOLDOWN_SECONDS: int
    REGISTRATION_MAX_ATTEMPTS: int
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int

    APP_NAME: str

    RESEND_API_KEY: SecretStr
    EMAIL_FROM: str

    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str

    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int
    REDIS_PASSWORD: str
    REDIS_USERNAME: str

    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    CELERY_RESULT_EXPIRES_SECONDS: int
    SEARCH_TASK_OWNER_TTL_SECONDS: int


settings = Settings()
