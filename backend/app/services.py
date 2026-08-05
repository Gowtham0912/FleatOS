"""
Service layer — all business logic lives here, routes stay thin.
"""

from datetime import datetime, timezone
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Vehicle, Location
from app.schemas import LocationCreate


async def get_or_create_vehicle(db: AsyncSession, device_id: str) -> Vehicle:
    """
    Return an existing vehicle row for the given device_id,
    or create a new one if it does not exist yet.
    """
    result = await db.execute(
        select(Vehicle).where(Vehicle.device_id == device_id)
    )
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        vehicle = Vehicle(
            device_id=device_id,
            name=f"Vehicle {device_id[:8]}",  # Friendly default name
        )
        db.add(vehicle)
        await db.flush()  # Assigns the PK without committing

    return vehicle


async def record_location(
    db: AsyncSession, payload: LocationCreate
) -> tuple[Vehicle, Location]:
    """
    Upsert the vehicle and insert a new location record.
    Returns (vehicle, location) so the route can broadcast immediately.
    """
    vehicle = await get_or_create_vehicle(db, payload.device_id)

    ts = payload.timestamp or datetime.now(timezone.utc)

    location = Location(
        vehicle_id=vehicle.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        timestamp=ts,
    )
    db.add(location)
    await db.commit()
    await db.refresh(vehicle)
    await db.refresh(location)
    return vehicle, location


async def list_vehicles(db: AsyncSession) -> list[Vehicle]:
    """Return all vehicles ordered by id."""
    result = await db.execute(select(Vehicle).order_by(Vehicle.id))
    return list(result.scalars().all())


async def get_vehicle_by_id(db: AsyncSession, vehicle_id: int) -> Vehicle | None:
    """Return a vehicle by its primary key."""
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    return result.scalar_one_or_none()


async def get_latest_location(
    db: AsyncSession, vehicle_id: int
) -> Location | None:
    """Return the most recent location record for a given vehicle."""
    result = await db.execute(
        select(Location)
        .where(Location.vehicle_id == vehicle_id)
        .order_by(desc(Location.timestamp))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_location_history(
    db: AsyncSession, vehicle_id: int, limit: int = 100
) -> list[Location]:
    """Return the last N location records for a vehicle (newest first)."""
    result = await db.execute(
        select(Location)
        .where(Location.vehicle_id == vehicle_id)
        .order_by(desc(Location.timestamp))
        .limit(limit)
    )
    return list(result.scalars().all())
