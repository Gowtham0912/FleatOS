"""
Pydantic schemas — request/response data transfer objects.
"""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ── Auth schemas ────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    """User registration payload."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")
    full_name: str = Field(default="Fleet Owner", description="Display name")


class UserLogin(BaseModel):
    """User login payload."""
    email: str
    password: str


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    email: str
    full_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT Token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Location schemas ────────────────────────────────────────────────────────

class LocationCreate(BaseModel):
    """Payload sent by mobile app or web tracker to POST /location."""

    device_id: str = Field(..., min_length=1, max_length=64, description="Unique device identifier")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS longitude")
    pairing_code: str | None = Field(default=None, description="Optional private pairing code (TRK-XXXX)")
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

class VehicleCreate(BaseModel):
    """Payload to create a new vehicle for logged-in user."""
    name: str = Field(..., min_length=1, max_length=128, description="Vehicle name e.g. My Car")
    device_id: str | None = Field(default=None, description="Optional pre-assigned device ID")


class VehicleResponse(BaseModel):
    """Vehicle info returned to the client."""

    id: int
    device_id: str
    name: str
    pairing_code: str
    share_code: str
    user_id: int | None = None

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
    pairing_code: str | None = None
    share_code: str | None = None

