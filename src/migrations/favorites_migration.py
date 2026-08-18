"""Compatibility migration for the user favorite-term table."""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine


async def migrate_favorites_schema(engine: AsyncEngine) -> None:
    """Create the favorite-term table and lookup index when absent.

    This migration is intentionally safe to run after ``Base.metadata.create_all``
    and repeatedly against an existing database.  ``IF NOT EXISTS`` preserves
    any existing favorite rows while filling in the compatibility gap for
    installations created before the model was introduced.
    """

    async with engine.begin() as connection:
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS favorite_term (
                    user_id INTEGER NOT NULL,
                    term_id INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE NOT NULL
                        DEFAULT TIMEZONE('utc', now()),
                    CONSTRAINT pk_favorite_term PRIMARY KEY (user_id, term_id),
                    CONSTRAINT fk_favorite_term_user
                        FOREIGN KEY (user_id) REFERENCES "user" (id)
                        ON DELETE CASCADE,
                    CONSTRAINT fk_favorite_term_term
                        FOREIGN KEY (term_id) REFERENCES term (id)
                        ON DELETE CASCADE
                )
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_favorite_term_user_created_at
                ON favorite_term (user_id, created_at)
                """
            )
        )
