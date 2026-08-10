"""
Location routes.

POST /location   — receive a GPS ping from the mobile app
                   and broadcast it to all WebSocket clients.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import LocationCreate, LocationResponse
from app.services import record_location
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/location", tags=["Location"])


@router.post(
    "",
    response_model=LocationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Receive a GPS ping from the mobile app",
)
async def post_location(
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Called every 5 seconds by the Android app.

    1. Verify device is approved.
    2. Insert a new location row.
    3. Broadcast the update to all connected WebSocket clients.
    4. Return the saved location object.
    """
    try:
        vehicle, location = await record_location(db, payload)
    except ValueError as exc:
        # Device not approved — clear message to GPS sender
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except Exception as exc:
        logger.exception("Failed to record location: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record location.",
        )

    # Fire-and-forget broadcast — dashboard clients get the update instantly
    broadcast_payload = {
        "event": "location_update",
        "device_id": vehicle.device_id,
        "vehicle_id": vehicle.id,
        "vehicle_name": vehicle.name,
        "latitude": location.latitude,
        "longitude": location.longitude,
        "timestamp": location.timestamp.isoformat(),
    }
    await manager.broadcast(broadcast_payload)
    logger.info(
        "Location recorded and broadcast | device=%s lat=%.6f lon=%.6f",
        vehicle.device_id,
        location.latitude,
        location.longitude,
    )

    return location

