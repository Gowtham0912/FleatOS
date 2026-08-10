"""
Database connection and session management using SQLAlchemy (async).
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import settings

# Async engine — uses asyncpg driver for PostgreSQL
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

# Session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """FastAPI dependency — yields an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


from sqlalchemy import text


async def init_db():
    """Create all tables and auto-migrate missing columns on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Auto-migrate missing columns for existing tables
        await conn.execute(text(
            "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;"
        ))
        await conn.execute(text(
            "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS pairing_code VARCHAR(32);"
        ))
        await conn.execute(text(
            "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS share_code VARCHAR(32);"
        ))
        await conn.execute(text(
            "UPDATE vehicles SET pairing_code = 'TRK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)) WHERE pairing_code IS NULL;"
        ))
        await conn.execute(text(
            "UPDATE vehicles SET share_code = 'SHR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)) WHERE share_code IS NULL;"
        ))

        # Add account_code to users table if missing
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_code VARCHAR(32);"
        ))
        # Backfill any users missing an account_code
        await conn.execute(text(
            "UPDATE users SET account_code = 'FLT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)) WHERE account_code IS NULL;"
        ))
        # Add unique constraint if not present (safe — won't fail if already exists)
        await conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_users_account_code'
                ) THEN
                    ALTER TABLE users ADD CONSTRAINT uq_users_account_code UNIQUE (account_code);
                END IF;
            END $$;
        """))

