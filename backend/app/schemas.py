"""
Pydantic schemas — request/response data transfer objects.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ── Location schemas ────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    """Payload the mobile app sends to POST /location."""

    device_id: str = Field(..., min_length=1, max_length=64, description="Unique device identifier")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS longitude")
    timestamp: datetime | None = Field(
        default=None,
        description="Device timestamp (UTC). Server time used if omitted.",
    )

    @field_validator("device_id")
    @classmethod
    def strip_device_id(cls, v: str) -> str:
        return v.strip()


class LocationResponse(BaseModel):
    """Single location record returned to the client."""

    id: int
    vehicle_id: int
    latitude: float
    longitude: float
    timestamp: datetime

    model_config = {"from_attributes": True}


# ── Vehicle schemas ─────────────────────────────────────────────────────────

class VehicleResponse(BaseModel):
    """Vehicle info returned to the client."""

    id: int
    device_id: str
    name: str

    model_config = {"from_attributes": True}


class VehicleDetail(VehicleResponse):
    """Vehicle info plus its latest location."""

    latest_location: LocationResponse | None = None


# ── WebSocket broadcast payload ─────────────────────────────────────────────

class LocationBroadcast(BaseModel):
    """Shape of the JSON pushed to all WebSocket clients."""

    event: str = "location_update"
    device_id: str
    vehicle_id: int
    vehicle_name: str
    latitude: float
    longitude: float
    timestamp: datetime
