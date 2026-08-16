"""
Vehicle routes.

GET /vehicles              — list tracked devices (scoped to user if logged in)
POST /vehicles             — create a new vehicle with pairing code & share code
GET /vehicles/share/{code} — public lookup for shared live tracking
GET /vehicles/{id}         — latest location for a single vehicle (auth required)
GET /vehicles/{id}/history — last N locations (auth required)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User, Vehicle, PairingRequest
from app.routes.auth import get_current_user, require_current_user
from app.schemas import VehicleResponse, VehicleDetail, VehicleCreate, LocationResponse, VehicleUpdate
from app.services import (
    list_vehicles,
    create_user_vehicle,
    get_vehicle_by_share_code,
    get_vehicle_by_id,
    get_latest_location,
    get_location_history,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get(
    "",
    response_model=list[VehicleResponse],
    summary="List tracked vehicles",
)
async def get_vehicles(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """Return vehicles owned by logged-in user. Returns [] if unauthenticated."""
    if not current_user:
        return []
    vehicles = await list_vehicles(db, user_id=current_user.id)
    return vehicles


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a personalized vehicle with pairing code",
)
async def create_vehicle(
    payload: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Create a new vehicle for the logged in user."""
    vehicle = await create_user_vehicle(db, current_user.id, payload)
    return vehicle


@router.patch(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Update a vehicle's details (name, type)",
)
async def update_vehicle_details(
    vehicle_id: int,
    payload: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Update vehicle name or type."""
    from app.services import update_vehicle
    vehicle = await update_vehicle(db, vehicle_id, current_user.id, payload)
    if not vehicle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found or permission denied.",
        )
    return vehicle


@router.get(
    "/share/{share_code}",
    response_model=VehicleDetail,
    summary="Public tracking link lookup by share code",
)
async def get_shared_vehicle(
    share_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Return a vehicle and its latest location by share code."""
    vehicle = await get_vehicle_by_share_code(db, share_code)
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared tracking link not found or expired.",
        )

    latest = await get_latest_location(db, vehicle.id)
    return VehicleDetail(
        id=vehicle.id,
        device_id=vehicle.device_id,
        name=vehicle.name,
        pairing_code=vehicle.pairing_code,
        share_code=vehicle.share_code,
        user_id=vehicle.user_id,
        vehicle_type=vehicle.vehicle_type,
        latest_location=latest,
    )


@router.get(
    "/{vehicle_id}",
    response_model=VehicleDetail,
    summary="Get a vehicle with its latest location (auth required)",
)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Return a single vehicle and its most recent GPS ping. Requires authentication."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if vehicle is None or vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found.",
        )

    latest = await get_latest_location(db, vehicle_id)
    return VehicleDetail(
        id=vehicle.id,
        device_id=vehicle.device_id,
        name=vehicle.name,
        pairing_code=vehicle.pairing_code,
        share_code=vehicle.share_code,
        user_id=vehicle.user_id,
        vehicle_type=vehicle.vehicle_type,
        latest_location=latest,
    )


@router.get(
    "/{vehicle_id}/history",
    response_model=list[LocationResponse],
    summary="Get recent location history for a vehicle (auth required)",
)
async def get_vehicle_history(
    vehicle_id: int,
    limit: int = Query(default=100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Return the last `limit` GPS pings for a vehicle (newest first). Requires authentication."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if vehicle is None or vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found.",
        )
    history = await get_location_history(db, vehicle_id, limit=limit)
    return history


@router.delete(
    "/unlinked",
    summary="Delete all vehicles not linked to any user account (auth required)",
)
async def delete_unlinked_vehicles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Purge all unclaimed vehicles. Requires authentication."""
    await db.execute(delete(Vehicle).where(Vehicle.user_id.is_(None)))
    await db.commit()
    return {"message": "Unlinked vehicles deleted successfully."}


@router.delete(
    "/{vehicle_id}",
    summary="Delete a specific vehicle (auth required)",
)
async def delete_vehicle_by_id(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Delete a vehicle by ID. Only the owning user can delete their vehicle."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if vehicle is None or vehicle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found or permission denied.",
        )
    # Clear pairing requests for this device so it can be re-paired
    await db.execute(delete(PairingRequest).where(PairingRequest.device_id == vehicle.device_id))
    await db.delete(vehicle)
    await db.commit()
    return {"message": f"Vehicle {vehicle_id} deleted successfully."}


