"""
ORM models — User, Vehicle, and Location tables.
"""

import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    BigInteger, String, Float, DateTime, ForeignKey, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def generate_pairing_code() -> str:
    """Generate a unique 8-character pairing code like TRK-A1B2."""
    return f"TRK-{uuid.uuid4().hex[:6].upper()}"


def generate_share_code() -> str:
    """Generate a unique 8-character public share code like SHR-X9Y8."""
    return f"SHR-{uuid.uuid4().hex[:6].upper()}"


class User(Base):
    """Represents a registered user account."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    full_name: Mapped[str] = mapped_column(String(128), nullable=False, default="Fleet Owner")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Vehicles owned by this user
    vehicles: Mapped[list["Vehicle"]] = relationship(
        "Vehicle", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r}>"


class Vehicle(Base):
    """Represents a tracked device / vehicle."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="My Vehicle")

    # User ownership (optional for legacy/unclaimed vehicles)
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # Unique private pairing code for QR scanning & phone binding
    pairing_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=generate_pairing_code, nullable=False
    )

    # Unique share code for public shareable tracking links
    share_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, default=generate_share_code, nullable=False
    )

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="vehicles")
    locations: Mapped[list["Location"]] = relationship(
        "Location", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} name={self.name!r} code={self.pairing_code!r}>"


class Location(Base):
    """Stores a single GPS ping for a vehicle."""

    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    latitude: Mapped[float] = mapped_column(Float(precision=9), nullable=False)
    longitude: Mapped[float] = mapped_column(Float(precision=9), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationship back to vehicle
    vehicle: Mapped["Vehicle"] = relationship("Vehicle", back_populates="locations")

    def __repr__(self) -> str:
        return (
            f"<Location id={self.id} vehicle_id={self.vehicle_id} "
            f"lat={self.latitude} lon={self.longitude}>"
        )

