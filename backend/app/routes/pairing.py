"""
Pairing routes — device request/approval workflow.

POST /pairing/request          — GPS sender submits a pairing request
GET  /pairing/requests         — (auth) list pending requests for current user
POST /pairing/requests/{id}/approve — (auth) approve a request
POST /pairing/requests/{id}/reject  — (auth) reject a request
GET  /pairing/check/{device_id}     — GPS sender polls pairing status
"""

import logging
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models import User
from app.routes.auth import require_current_user, get_current_user
from app.schemas import (
    PairingRequestCreate,
    PairingRequestResponse,
    PairingApprovePayload,
    PairingCheckResponse,
    ConnectedOwner,
)
from app.services import (
    find_user_by_account_code,
    create_pairing_request,
    list_pairing_requests,
    approve_pairing_request,
    reject_pairing_request,
    check_device_pairing_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pairing", tags=["Pairing"])


@router.post(
    "/request",
    response_model=PairingRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a pairing request from GPS sender",
)
async def submit_pairing_request(
    payload: PairingRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """
    Called by the GPS sender page when a user enters an account code or vehicle pairing code.
    If it's a vehicle pairing code, it binds the device to that vehicle directly.
    If it's an account code, it creates a pending pairing request (or auto-approves if owner).
    """
    from sqlalchemy import select
    from app.models import Vehicle
    from datetime import datetime, timezone

    # 1. Check if the provided code is actually a specific vehicle's pairing code
    v_res = await db.execute(select(Vehicle).options(joinedload(Vehicle.user)).where(Vehicle.pairing_code == payload.account_code))
    vehicle = v_res.scalar_one_or_none()
    
    if vehicle:
        # Block owner from pairing their own vehicle to themselves
        if current_user and vehicle.user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot use your own vehicle's pairing code on the GPS sender. Share it with a driver's phone instead.",
            )

        # Bind this device to the existing vehicle
        vehicle.device_id = payload.device_id
        if current_user:
            vehicle.driver_id = current_user.id
        await db.commit()
        await db.refresh(vehicle)
        
        logger.info("Bound device %s to vehicle %s via pairing code", payload.device_id, vehicle.id)
        
        return PairingRequestResponse(
            id=0,
            user_id=vehicle.user_id or 0,
            device_id=payload.device_id,
            status="approved",
            created_at=datetime.now(timezone.utc),
            vehicle_name=vehicle.name,
            owner_name=vehicle.user.full_name if vehicle.user else None,
            owner_avatar_url=vehicle.user.avatar_url if vehicle.user else None,
            sender_name=current_user.full_name if current_user else None,
        )

    # 2. Otherwise, treat it as an account code
    user = await find_user_by_account_code(db, payload.account_code)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid code. Please check and try again.",
        )

    # Block self-pairing: a user cannot use the GPS sender on their own account
    if current_user and current_user.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot pair your own device to your own account. Share your account code with someone else's phone.",
        )

    sender_id = current_user.id if current_user else None
    req = await create_pairing_request(db, user.id, payload.device_id, sender_id)

    vehicle_name = None
    if req.status == "approved" and req.vehicle_id:
        from sqlalchemy import select
        from app.models import Vehicle
        v_res = await db.execute(select(Vehicle).where(Vehicle.id == req.vehicle_id))
        veh = v_res.scalar_one_or_none()
        if veh:
            vehicle_name = veh.name

    logger.info(
        "Pairing request %s | device=%s -> user=%s (status=%s)",
        "created" if req.status == "pending" else "found",
        payload.device_id,
        user.email,
        req.status,
    )
    
    return PairingRequestResponse(
        id=req.id,
        user_id=req.user_id,
        device_id=req.device_id,
        status=req.status,
        vehicle_id=req.vehicle_id,
        vehicle_name=vehicle_name,
        owner_name=user.full_name,
        owner_avatar_url=user.avatar_url,
        sender_name=current_user.full_name if current_user else None,
        created_at=req.created_at,
    )


@router.get(
    "/requests",
    response_model=list[PairingRequestResponse],
    summary="List pairing requests for current user",
)
async def get_pairing_requests(
    status_filter: Literal["pending", "approved", "rejected"] | None = Query(
        default=None,
        description="Filter pairing requests by status (pending, approved, or rejected).",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Return pairing requests for the logged-in user, optionally filtered by status."""
    from sqlalchemy.orm import joinedload
    from sqlalchemy import select
    from app.models import PairingRequest, Vehicle

    stmt = select(PairingRequest).options(joinedload(PairingRequest.sender)).where(PairingRequest.user_id == current_user.id)
    if status_filter:
        stmt = stmt.where(PairingRequest.status == status_filter)
    stmt = stmt.order_by(PairingRequest.created_at.desc())
    result = await db.execute(stmt)
    requests = result.scalars().all()
    
    response = []
    for req in requests:
        vehicle_name = None
        if req.vehicle_id:
            v_res = await db.execute(select(Vehicle).where(Vehicle.id == req.vehicle_id))
            veh = v_res.scalar_one_or_none()
            if veh:
                vehicle_name = veh.name

        response.append({
            "id": req.id,
            "user_id": req.user_id,
            "device_id": req.device_id,
            "status": req.status,
            "vehicle_id": req.vehicle_id,
            "vehicle_name": vehicle_name,
            "owner_name": current_user.full_name,
            "owner_avatar_url": current_user.avatar_url,
            "sender_name": req.sender.full_name if req.sender else None,
            "created_at": req.created_at,
        })
    return response


@router.post(
    "/requests/{request_id}/approve",
    response_model=PairingRequestResponse,
    summary="Approve a pairing request",
)
async def approve_request(
    request_id: int,
    payload: PairingApprovePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Approve a pending pairing request — creates a vehicle and links the device."""
    try:
        req = await approve_pairing_request(
            db, request_id, current_user.id, payload.vehicle_name
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    logger.info(
        "Pairing request #%d approved | device=%s vehicle=%s",
        request_id, req.device_id, payload.vehicle_name,
    )
    return req


@router.post(
    "/requests/{request_id}/reject",
    response_model=PairingRequestResponse,
    summary="Reject a pairing request",
)
async def reject_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    """Reject a pending pairing request."""
    try:
        req = await reject_pairing_request(db, request_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    logger.info("Pairing request #%d rejected | device=%s", request_id, req.device_id)
    return req


@router.get(
    "/check/{device_id}",
    response_model=PairingCheckResponse,
    summary="Check pairing status for a device (GPS sender polls this)",
)
async def check_pairing(
    device_id: str,
    db: AsyncSession = Depends(get_db),
):
    """GPS sender polls this endpoint to check if the device has been approved."""
    result = await check_device_pairing_status(db, device_id.strip())
    return result


@router.get(
    "/history/{device_id}",
    response_model=list[ConnectedOwner],
    summary="Get previously connected owners for a device"
)
async def get_device_history(
    device_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Return a list of unique owners this device has successfully paired with."""
    from sqlalchemy import select
    from app.models import PairingRequest, User
    
    stmt = (
        select(User)
        .join(PairingRequest, PairingRequest.user_id == User.id)
        .where(
            PairingRequest.device_id == device_id.strip(),
            PairingRequest.status == "approved",
            PairingRequest.vehicle_id.isnot(None)
        )
        .distinct()
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    return users
