#!/usr/bin/env python3
"""
seed.py — Insert a test vehicle + a few fake GPS pings.

Usage (from backend/ directory with venv activated):
    python scripts/seed.py
"""

import asyncio
from datetime import datetime, timezone, timedelta

# Make sure the app package is importable
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal, init_db
from app.models import Vehicle, Location


FAKE_ROUTE = [
    # Colombo city centre — a small route for testing
    (6.9271, 79.8612),
    (6.9278, 79.8620),
    (6.9285, 79.8630),
    (6.9292, 79.8640),
    (6.9300, 79.8650),
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        # Upsert test vehicle
        from sqlalchemy import select
        result = await db.execute(
            select(Vehicle).where(Vehicle.device_id == "test-device-001")
        )
        vehicle = result.scalar_one_or_none()

        if vehicle is None:
            vehicle = Vehicle(device_id="test-device-001", name="My Android Phone")
            db.add(vehicle)
            await db.flush()
            print(f"✅  Created vehicle: {vehicle.name} (id={vehicle.id})")
        else:
            print(f"ℹ️   Vehicle already exists: {vehicle.name} (id={vehicle.id})")

        # Insert fake location pings
        base_time = datetime.now(timezone.utc) - timedelta(minutes=5)
        for i, (lat, lon) in enumerate(FAKE_ROUTE):
            loc = Location(
                vehicle_id=vehicle.id,
                latitude=lat,
                longitude=lon,
                timestamp=base_time + timedelta(seconds=i * 5),
            )
            db.add(loc)

        await db.commit()
        print(f"✅  Inserted {len(FAKE_ROUTE)} test location records.")
        print("🗺️   Open the dashboard to see the test vehicle on the map.")


if __name__ == "__main__":
    asyncio.run(seed())
