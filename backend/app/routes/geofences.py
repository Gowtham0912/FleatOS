from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.routes.auth import get_current_user
from app.models import User, Vehicle
from app.schemas import GeofenceCreate, GeofenceResponse, VehicleGeofenceAssign
from app.services import (
    create_geofence,
    list_geofences,
    delete_geofence,
    get_vehicle_by_id
)

router = APIRouter(prefix="/geofences", tags=["Geofences"])

@router.get("", response_model=List[GeofenceResponse])
async def get_my_geofences(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """List all geofences created by the current user."""
    return await list_geofences(db, user.id)

@router.post("", response_model=GeofenceResponse)
async def create_my_geofence(
    payload: GeofenceCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Create a new geofence for the current user."""
    if len(payload.coordinates) < 3:
        raise HTTPException(status_code=400, detail="Geofence must have at least 3 coordinates.")
    return await create_geofence(db, user.id, payload)

@router.delete("/{geofence_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_geofence(
    geofence_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Delete a geofence."""
    success = await delete_geofence(db, geofence_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Geofence not found or not owned by user.")
    return None

@router.post("/vehicles/{vehicle_id}/assign")
async def assign_vehicle_to_geofence(
    vehicle_id: int,
    payload: VehicleGeofenceAssign,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Assign or unassign a vehicle to a geofence."""
    vehicle = await get_vehicle_by_id(db, vehicle_id)
    if not vehicle or vehicle.user_id != user.id:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    vehicle.geofence_id = payload.geofence_id
    await db.commit()
    
    return {"message": "Geofence assigned successfully", "geofence_id": vehicle.geofence_id}
