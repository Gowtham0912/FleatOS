import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def alter_db():
    engine = create_async_engine('postgresql+asyncpg://fleet_user:fleet_pass@localhost:5432/fleet_db')
    async with engine.begin() as conn:
        await conn.execute(text('ALTER TABLE pairing_requests ADD COLUMN IF NOT EXISTS sender_id BIGINT REFERENCES users(id) ON DELETE SET NULL;'))
        await conn.execute(text('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS driver_id BIGINT REFERENCES users(id) ON DELETE SET NULL;'))
    await engine.dispose()
    print('PostgreSQL Schema updated')

asyncio.run(alter_db())
