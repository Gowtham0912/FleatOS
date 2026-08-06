"""
Service layer — all business logic lives here, routes stay thin.
"""

from datetime import datetime, timezone
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Vehicle, Location, generate_pairing_code, generate_share_code
from app.schemas import LocationCreate, VehicleCreate


async def get_or_create_vehicle(
    db: AsyncSession, device_id: str, pairing_code: str | None = None
) -> Vehicle:
    """
    Return an existing vehicle row. If pairing_code is provided, lookup
    by pairing_code and link the device_id to that user's pre-created vehicle!
    """
    vehicle = None

    if pairing_code:
        # User created a vehicle and scanned QR / entered code
        res = await db.execute(
            select(Vehicle).where(Vehicle.pairing_code == pairing_code.strip().upper())
        )
        vehicle = res.scalar_one_or_none()
        if vehicle:
            # Bind device_id to this paired vehicle
            if vehicle.device_id != device_id:
                vehicle.device_id = device_id
                await db.flush()
            return vehicle

    # Lookup by device_id if not found by pairing code
    result = await db.execute(
        select(Vehicle).where(Vehicle.device_id == device_id)
    )
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        vehicle = Vehicle(
            device_id=device_id,
            name=f"Vehicle {device_id[:8]}",
            pairing_code=generate_pairing_code(),
            share_code=generate_share_code(),
        )
        db.add(vehicle)
        await db.flush()

    return vehicle


async def record_location(
    db: AsyncSession, payload: LocationCreate
) -> tuple[Vehicle, Location]:
    """
    Upsert the vehicle and insert a new location record.
    Returns (vehicle, location) so the route can broadcast immediately.
    """
    vehicle = await get_or_create_vehicle(db, payload.device_id, payload.pairing_code)

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


async def list_vehicles(db: AsyncSession, user_id: int | None = None) -> list[Vehicle]:
    """Return vehicles owned by user_id, or all vehicles if unauthenticated."""
    stmt = select(Vehicle)
    if user_id is not None:
        stmt = stmt.where(Vehicle.user_id == user_id)
    stmt = stmt.order_by(Vehicle.id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_user_vehicle(
    db: AsyncSession, user_id: int, payload: VehicleCreate
) -> Vehicle:
    """Create a new personalized vehicle for a logged-in user."""
    device_id = payload.device_id or f"dev_{generate_pairing_code()[4:]}"

    vehicle = Vehicle(
        name=payload.name.strip(),
        device_id=device_id,
        user_id=user_id,
        pairing_code=generate_pairing_code(),
        share_code=generate_share_code(),
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_vehicle_by_share_code(
    db: AsyncSession, share_code: str
) -> Vehicle | None:
    """Return a vehicle by its public share code."""
    res = await db.execute(
        select(Vehicle).where(Vehicle.share_code == share_code.strip().upper())
    )
    return res.scalar_one_or_none()


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

