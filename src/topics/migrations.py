from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection


async def migrate_book_table_schema(conn: AsyncConnection) -> None:
    result = await conn.execute(text("SELECT to_regclass('public.book');"))
    if result.scalar() is None:
        return

    await conn.execute(
        text("ALTER TABLE book ADD COLUMN IF NOT EXISTS publisher VARCHAR(255);"),
    )
    await conn.execute(
        text("ALTER TABLE book ADD COLUMN IF NOT EXISTS grade INTEGER;"),
    )
    await conn.execute(
        text(
            """
            UPDATE book
            SET publisher = NULLIF(BTRIM(split_part(name, ': ', 1)), '')
            WHERE publisher IS NULL
              AND name IS NOT NULL
              AND POSITION(': ' IN name) > 0;
            """,
        ),
    )
    await conn.execute(
        text(
            """
            UPDATE book
            SET grade = substring(split_part(name, ': ', 2) from '\\d+')::integer
            WHERE grade IS NULL
              AND name IS NOT NULL
              AND POSITION(': ' IN name) > 0
              AND substring(split_part(name, ': ', 2) from '\\d+') IS NOT NULL;
            """,
        ),
    )
    await conn.execute(text("ALTER TABLE book ALTER COLUMN publisher SET NOT NULL;"))
    await conn.execute(text("ALTER TABLE book ALTER COLUMN grade SET NOT NULL;"))
    await conn.execute(
        text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'uq_book_publisher_grade'
                ) THEN
                    ALTER TABLE book
                    ADD CONSTRAINT uq_book_publisher_grade UNIQUE (publisher, grade);
                END IF;
            END
            $$;
            """,
        ),
    )
    await conn.execute(
        text("CREATE INDEX IF NOT EXISTS ix_book_grade ON book (grade);"),
    )
