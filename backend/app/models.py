"""
ORM models — Vehicle and Location tables.
"""

from datetime import datetime
from sqlalchemy import (
    BigInteger, String, Float, DateTime, ForeignKey, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Vehicle(Base):
    """Represents a tracked device / vehicle."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    device_id: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="Unknown Vehicle")

    # Relationship — one vehicle has many location records
    locations: Mapped[list["Location"]] = relationship(
        "Location", back_populates="vehicle", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Vehicle id={self.id} device_id={self.device_id!r}>"


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
