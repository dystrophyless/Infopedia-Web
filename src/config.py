from pydantic import SecretStr
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
    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:5173"

    LLMWHISPERER_API_KEY: SecretStr
    MAX_UPLOAD_SIZE_BYTES: int = 2 * 1024 * 1024  # 2 MB
    ANALYZE_TASK_OWNER_TTL_SECONDS: int = 3600

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: SecretStr
    GOOGLE_REDIRECT_URI: str | None = None
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
    FEATURED_DEFINITION_IDS: list[int] = [10, 4, 27, 31, 47]
    ANTI_SCRAPE_ENABLED: bool = True
    ANTI_SCRAPE_BLOCK_AUTOMATION_USER_AGENTS: bool = True
    ANTI_SCRAPE_WINDOW_SECONDS: int = 60
    ANTI_SCRAPE_AUTHENTICATED_LIMIT: int = 90
    ANTI_SCRAPE_PUBLIC_LIMIT: int = 30
    ANTI_SCRAPE_SEARCH_LIMIT: int = 45
    ANTI_SCRAPE_DETAIL_LIMIT: int = 60
    ANTI_SCRAPE_MAX_SEARCH_RESULTS: int = 20
    ANTI_SCRAPE_MAX_TERMS_PAGE_SIZE: int = 20

    @property
    def google_redirect_uri(self) -> str:
        if self.GOOGLE_REDIRECT_URI:
            return self.GOOGLE_REDIRECT_URI
        return f"{self.BACKEND_URL.rstrip('/')}/api/auth/google/callback"

    @property
    def google_frontend_callback_uri(self) -> str:
        return f"{self.FRONTEND_URL.rstrip('/')}/auth/google/callback"


settings = Settings()
