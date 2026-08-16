"""
Service layer — all business logic lives here, routes stay thin.
"""

from datetime import datetime, timezone
from sqlalchemy import select, desc, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Vehicle, Location, User, PairingRequest,
    generate_pairing_code, generate_share_code,
)
from app.schemas import LocationCreate, VehicleCreate, VehicleUpdate
import math
from app.osrm import get_map_match
from app.config import settings


# ── Vehicle services ────────────────────────────────────────────────────────

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
        select(Vehicle).options(joinedload(Vehicle.driver)).where(Vehicle.device_id == device_id)
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


async def get_vehicle_for_approved_device(
    db: AsyncSession, device_id: str
) -> Vehicle | None:
    """
    Return the vehicle linked to this device_id ONLY if the device
    has been approved via the pairing request flow.

    Approval is confirmed by either:
      a) A vehicle row that has a non-NULL user_id (claimed vehicle), OR
      b) An approved PairingRequest entry whose vehicle_id points to a
         vehicle — even if that vehicle's user_id is still NULL
         (covers the edge case where vehicle ownership wasn't backfilled).
    """
    # Case (a): vehicle exists and is claimed by a user
    result = await db.execute(
        select(Vehicle).options(joinedload(Vehicle.driver)).where(Vehicle.device_id == device_id)
    )
    vehicle = result.scalar_one_or_none()
    if vehicle and vehicle.user_id is not None:
        return vehicle

    # Case (b): approved pairing request exists for this device
    result = await db.execute(
        select(PairingRequest).where(
            PairingRequest.device_id == device_id,
            PairingRequest.status == "approved",
        ).order_by(desc(PairingRequest.created_at)).limit(1)
    )
    req = result.scalar_one_or_none()
    if req and req.vehicle_id:
        result = await db.execute(
            select(Vehicle).options(joinedload(Vehicle.driver)).where(Vehicle.id == req.vehicle_id)
        )
        approved_vehicle = result.scalar_one_or_none()
        if approved_vehicle:
            return approved_vehicle

    return None


async def record_location(
    db: AsyncSession, payload: LocationCreate
) -> tuple[Vehicle, Location]:
    """
    Record a GPS ping. Only works for devices that have been approved
    through the pairing request flow.

    The legacy pairing_code shortcut has been removed — all devices must
    go through the explicit account-code → approval workflow.
    Raises ValueError if the device is not approved.
    """
    vehicle = await get_vehicle_for_approved_device(db, payload.device_id)

    if vehicle is None:
        raise ValueError(
            "Device not approved. Please enter your account code on the GPS sender "
            "page and wait for the account owner to approve your device."
        )

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
    stmt = select(Vehicle).options(joinedload(Vehicle.driver))
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
        vehicle_type=payload.vehicle_type,
        pairing_code=generate_pairing_code(),
        share_code=generate_share_code(),
    )
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def update_vehicle(
    db: AsyncSession, vehicle_id: int, user_id: int, payload: VehicleUpdate
) -> Vehicle | None:
    """Update a vehicle's details."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if not vehicle or vehicle.user_id != user_id:
        return None

    if payload.name is not None:
        vehicle.name = payload.name.strip()
    if payload.vehicle_type is not None:
        vehicle.vehicle_type = payload.vehicle_type

    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_vehicle_by_share_code(
    db: AsyncSession, share_code: str
) -> Vehicle | None:
    """Return a vehicle by its public share code."""
    code = share_code.strip().upper()
    res = await db.execute(
        select(Vehicle).options(joinedload(Vehicle.driver)).where(func.upper(Vehicle.share_code) == code)
    )
    return res.scalar_one_or_none()


async def get_vehicle_by_id(db: AsyncSession, vehicle_id: int) -> Vehicle | None:
    """Return a vehicle by its primary key."""
    result = await db.execute(
        select(Vehicle).options(joinedload(Vehicle.driver)).where(Vehicle.id == vehicle_id)
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


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


async def get_matched_location_data(db: AsyncSession, vehicle: Vehicle, new_location: Location) -> dict:
    """Get map-matched data from OSRM for the vehicle's recent history."""
    history = await get_location_history(db, vehicle.id, limit=5)
    history.reverse() # oldest first
    
    if len(history) < 2:
        return {}

    # Filter outliers
    filtered = [history[0]]
    for i in range(1, len(history)):
        prev = filtered[-1]
        curr = history[i]
        dist = calculate_distance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
        time_diff = (curr.timestamp - prev.timestamp).total_seconds()
        if time_diff > 0:
            speed_kmh = (dist / time_diff) * 3.6
            if speed_kmh <= settings.GPS_OUTLIER_THRESHOLD_KMH:
                filtered.append(curr)
    
    if len(filtered) < 2:
        return {}

    coords = [(loc.longitude, loc.latitude) for loc in filtered]
    timestamps = [int(loc.timestamp.timestamp()) for loc in filtered]

    match_data = await get_map_match(coords, timestamps=timestamps)
    if not match_data or "matchings" not in match_data or not match_data["matchings"]:
        return {}

    matching = match_data["matchings"][0]
    geom = matching.get("geometry", {})
    
    tracepoints = match_data.get("tracepoints", [])
    valid_traces = [tp for tp in tracepoints if tp is not None]
    if not valid_traces:
        return {}
        
    last_trace = valid_traces[-1]
    matched_lon, matched_lat = last_trace["location"]

    geom_coords = geom.get("coordinates", [])
    heading = 0.0
    if len(geom_coords) >= 2:
        lon1, lat1 = geom_coords[-2]
        lon2, lat2 = geom_coords[-1]
        y = math.sin(math.radians(lon2 - lon1)) * math.cos(math.radians(lat2))
        x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - \
            math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(math.radians(lon2 - lon1))
        heading = (math.degrees(math.atan2(y, x)) + 360) % 360

    speed = 0.0
    if len(filtered) >= 2:
        dist = calculate_distance(filtered[-2].latitude, filtered[-2].longitude, filtered[-1].latitude, filtered[-1].longitude)
        td = (filtered[-1].timestamp - filtered[-2].timestamp).total_seconds()
        if td > 0:
            speed = dist / td

    return {
        "matched_latitude": matched_lat,
        "matched_longitude": matched_lon,
        "route_geometry": geom,
        "heading": heading,
        "speed": speed
    }


# ── Pairing Request services ───────────────────────────────────────────────

async def find_user_by_account_code(
    db: AsyncSession, account_code: str
) -> User | None:
    """Find a user by their account code."""
    code = account_code.strip().upper()
    result = await db.execute(
        select(User).where(func.upper(User.account_code) == code)
    )
    return result.scalar_one_or_none()


async def create_pairing_request(
    db: AsyncSession, user_id: int, device_id: str, sender_id: int | None = None
) -> PairingRequest:
    """
    Create a new pairing request or return existing pending/approved one.
    If the paired vehicle was deleted or previous request rejected, allow re-requesting.
    """
    # Check for existing vehicle
    v_res = await db.execute(
        select(Vehicle).where(Vehicle.device_id == device_id, Vehicle.user_id == user_id)
    )
    vehicle = v_res.scalar_one_or_none()

    # Check for existing pending request from this device to this user
    result = await db.execute(
        select(PairingRequest).where(
            PairingRequest.user_id == user_id,
            PairingRequest.device_id == device_id,
            PairingRequest.status == "pending",
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Check if already approved
    result = await db.execute(
        select(PairingRequest).where(
            PairingRequest.user_id == user_id,
            PairingRequest.device_id == device_id,
            PairingRequest.status == "approved",
        )
    )
    approved = result.scalar_one_or_none()
    if approved:
        if vehicle is not None:
            return approved
        else:
            # Vehicle was deleted! Reset/delete old approved request so user can create a new one
            await db.delete(approved)
            await db.flush()

    # Create new request
    req = PairingRequest(
        user_id=user_id,
        device_id=device_id,
        sender_id=sender_id,
        status="pending",
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    return req


async def list_pairing_requests(
    db: AsyncSession, user_id: int, status_filter: str | None = None
) -> list[PairingRequest]:
    """List pairing requests for a user, optionally filtered by status."""
    stmt = select(PairingRequest).where(PairingRequest.user_id == user_id)
    if status_filter:
        stmt = stmt.where(PairingRequest.status == status_filter)
    stmt = stmt.order_by(desc(PairingRequest.created_at))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def approve_pairing_request(
    db: AsyncSession, request_id: int, user_id: int, vehicle_name: str
) -> PairingRequest:
    """
    Approve a pairing request: create or reuse a vehicle linked to the user,
    bind the device_id, and mark the request as approved.
    """
    result = await db.execute(
        select(PairingRequest).where(
            PairingRequest.id == request_id,
            PairingRequest.user_id == user_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError("Pairing request not found.")
    if req.status != "pending":
        raise ValueError(f"Request already {req.status}.")

    # Check if a vehicle with this device_id already exists
    existing = await db.execute(
        select(Vehicle).where(Vehicle.device_id == req.device_id)
    )
    vehicle = existing.scalar_one_or_none()

    if vehicle:
        # Reuse existing vehicle — update ownership, driver, and name
        vehicle.user_id = user_id
        vehicle.driver_id = req.sender_id
        vehicle.name = vehicle_name.strip()
        await db.flush()
    else:
        # Create a new vehicle for this device, linked to the user
        vehicle = Vehicle(
            device_id=req.device_id,
            name=vehicle_name.strip(),
            user_id=user_id,
            driver_id=req.sender_id,
            pairing_code=generate_pairing_code(),
            share_code=generate_share_code(),
        )
        db.add(vehicle)
        await db.flush()

    # Update the request
    req.status = "approved"
    req.vehicle_id = vehicle.id
    await db.commit()
    await db.refresh(req)
    return req


async def reject_pairing_request(
    db: AsyncSession, request_id: int, user_id: int
) -> PairingRequest:
    """Reject a pairing request."""
    result = await db.execute(
        select(PairingRequest).where(
            PairingRequest.id == request_id,
            PairingRequest.user_id == user_id,
        )
    )
    req = result.scalar_one_or_none()
    if not req:
        raise ValueError("Pairing request not found.")
    if req.status != "pending":
        raise ValueError(f"Request already {req.status}.")

    req.status = "rejected"
    await db.commit()
    await db.refresh(req)
    return req


async def check_device_pairing_status(
    db: AsyncSession, device_id: str
) -> dict:
    """
    Check the pairing status of a device.
    Returns status info for the GPS sender to poll.
    """
    # Find the most recent request for this device
    result = await db.execute(
        select(PairingRequest).where(
            PairingRequest.device_id == device_id,
        ).order_by(desc(PairingRequest.created_at)).limit(1)
    )
    req = result.scalar_one_or_none()

    if not req:
        return {
            "status": "none",
            "vehicle_name": None,
            "message": "No pairing request found. Enter an account code to request pairing.",
        }

    if req.status == "pending":
        return {
            "status": "pending",
            "vehicle_name": None,
            "message": "Waiting for account owner to approve your device…",
        }

    if req.status == "approved":
        # Get vehicle name and check if it still exists
        vehicle = None
        if req.vehicle_id:
            v_result = await db.execute(
                select(Vehicle).where(Vehicle.id == req.vehicle_id)
            )
            vehicle = v_result.scalar_one_or_none()
        
        if not vehicle:
            v_result = await db.execute(
                select(Vehicle).where(Vehicle.device_id == device_id)
            )
            vehicle = v_result.scalar_one_or_none()

        if vehicle:
            return {
                "status": "approved",
                "vehicle_name": vehicle.name,
                "message": "Device approved! GPS tracking is active.",
            }

        # Vehicle was deleted by owner!
        return {
            "status": "none",
            "vehicle_name": None,
            "message": "Vehicle was deleted by account owner. Please request pairing again.",
        }

    if req.status == "rejected":
        return {
            "status": "rejected",
            "vehicle_name": None,
            "message": "Your pairing request was rejected by the account owner.",
        }

    return {
        "status": req.status,
        "vehicle_name": None,
        "message": f"Status: {req.status}",
    }


