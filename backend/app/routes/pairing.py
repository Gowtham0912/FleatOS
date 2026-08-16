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

from app.database import get_db
from app.models import User
from app.routes.auth import require_current_user, get_current_user
from app.schemas import (
    PairingRequestCreate,
    PairingRequestResponse,
    PairingApprovePayload,
    PairingCheckResponse,
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
    Called by the GPS sender page when a user enters an account code.
    Finds the account owner and creates a pending pairing request.
    If the requester is already logged in as the account owner, it auto-approves.
    """
    user = await find_user_by_account_code(db, payload.account_code)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid account code. Please check and try again.",
        )

    sender_id = current_user.id if current_user else None
    req = await create_pairing_request(db, user.id, payload.device_id, sender_id)

    # Auto-approve if the requester is the account owner
    if current_user and current_user.id == user.id and req.status == "pending":
        req = await approve_pairing_request(db, req.id, user.id, f"Device {payload.device_id[:6]}")

    logger.info(
        "Pairing request %s | device=%s -> user=%s (status=%s)",
        "created" if req.status == "pending" else "found",
        payload.device_id,
        user.email,
        req.status,
    )
    return req


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
    requests = await list_pairing_requests(db, current_user.id, status_filter)
    return requests


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
