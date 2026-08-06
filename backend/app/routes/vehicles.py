"""
Vehicle routes.

GET /vehicles              — list tracked devices (scoped to user if logged in)
POST /vehicles             — create a new vehicle with pairing code & share code
GET /vehicles/share/{code} — public lookup for shared live tracking
GET /vehicles/{id}         — latest location for a single vehicle
GET /vehicles/{id}/history — last N locations
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import User
from app.routes.auth import get_current_user, require_current_user
from app.schemas import VehicleResponse, VehicleDetail, VehicleCreate, LocationResponse
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
    """Return vehicles (filtered by user if authenticated)."""
    user_id = current_user.id if current_user else None
    vehicles = await list_vehicles(db, user_id=user_id)
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
        latest_location=latest,
    )


@router.get(
    "/{vehicle_id}",
    response_model=VehicleDetail,
    summary="Get a vehicle with its latest location",
)
async def get_vehicle(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Return a single vehicle and its most recent GPS ping."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if vehicle is None:
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
        latest_location=latest,
    )


@router.get(
    "/{vehicle_id}/history",
    response_model=list[LocationResponse],
    summary="Get recent location history for a vehicle",
)
async def get_vehicle_history(
    vehicle_id: int,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Return the last `limit` GPS pings for a vehicle (newest first)."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found.",
        )

from sqlalchemy import delete

@router.delete(
    "/unlinked",
    summary="Delete all vehicles not linked to any user account",
)
async def delete_unlinked_vehicles(db: AsyncSession = Depends(get_db)):
    """Purge all vehicles where user_id IS NULL."""
    from app.models import Vehicle
    await db.execute(delete(Vehicle).where(Vehicle.user_id.is_(None)))
    await db.commit()
    return {"message": "Unlinked vehicles deleted successfully."}


@router.delete(
    "/{vehicle_id}",
    summary="Delete a specific vehicle",
)
async def delete_vehicle_by_id(
    vehicle_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a specific vehicle by ID."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if vehicle is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vehicle {vehicle_id} not found.",
        )
    await db.delete(vehicle)
    await db.commit()
    return {"message": f"Vehicle {vehicle_id} deleted successfully."}


