from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        extra="allow",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    secret_key: SecretStr
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    postgres_db: str
    postgres_host: str
    postgres_port: int
    postgres_user: str
    postgres_password: str

    redis_host: str
    redis_port: int
    redis_db: int
    redis_password: str = ""
    redis_username: str = ""

    celery_broker_url: str
    celery_result_backend: str
    celery_result_expires_seconds: int = 3600
    search_task_owner_ttl_seconds: int = 3600


settings = Settings()
