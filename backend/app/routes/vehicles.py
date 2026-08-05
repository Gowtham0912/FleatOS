"""
Vehicle routes.

GET /vehicles          — list all tracked devices
GET /vehicle/{id}      — latest location for a single vehicle
GET /vehicle/{id}/history — last N locations
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import VehicleResponse, VehicleDetail, LocationResponse
from app.services import (
    list_vehicles,
    get_vehicle_by_id,
    get_latest_location,
    get_location_history,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get(
    "",
    response_model=list[VehicleResponse],
    summary="List all tracked vehicles",
)
async def get_vehicles(db: AsyncSession = Depends(get_db)):
    """Return every vehicle currently registered in the system."""
    vehicles = await list_vehicles(db)
    return vehicles


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

    history = await get_location_history(db, vehicle_id, limit=limit)
    return history
