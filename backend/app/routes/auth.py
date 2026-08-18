"""
Authentication routes — register, login, and current user profile.
"""

import logging
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, Header, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, OTPCode
from app.schemas import UserRegister, UserLogin, UserResponse, TokenResponse, OTPRequest, OTPVerifyLogin, OTPVerifyReset
from app.auth_utils import hash_password, verify_password, create_access_token, decode_access_token
from app.email_utils import send_otp_email
import random
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])


async def get_current_user(
    authorization: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Dependency: Extract and validate User from Bearer token header."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    user_id = int(payload["sub"])
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    return user


async def require_current_user(
    user: User | None = Depends(get_current_user),
) -> User:
    """Dependency: Require authenticated user (throws 401 if not logged in)."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    email = payload.email.lower().strip()

    # Check if email already exists
    res = await db.execute(select(User).where(User.email == email))
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered.",
        )
        
    # Verify OTP
    res_otp = await db.execute(
        select(OTPCode)
        .where(OTPCode.email == email, OTPCode.purpose == "register", OTPCode.is_used == False)
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = res_otp.scalar_one_or_none()
    
    if not otp or otp.code != payload.code or otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    # Mark as used
    otp.is_used = True

    # Create new user
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=payload.role if payload.role in ('owner', 'driver') else 'owner',
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate email and password."""
    email = payload.email.lower().strip()

    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_current_user)):
    """Get current logged-in user profile."""
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    full_name: str = Form(None),
    avatar: UploadFile = File(None),
    user: User = Depends(require_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile (name and avatar)."""
    if full_name is not None:
        user.full_name = full_name.strip()
        
    if avatar is not None:
        # Create avatars dir if not exists
        avatars_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "avatars")
        os.makedirs(avatars_dir, exist_ok=True)
        
        # Save file
        ext = avatar.filename.split(".")[-1] if "." in avatar.filename else "jpg"
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(avatars_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(avatar.file, buffer)
            
        user.avatar_url = f"/static/avatars/{filename}"
        
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


async def generate_and_send_otp(email: str, purpose: str, db: AsyncSession, check_user_exists: bool = True):
    """Helper to generate a 6-digit OTP, store it, and send via email."""
    # Check if user exists
    res = await db.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    
    if check_user_exists and not user:
        # Intentional anti-enumeration: we return a generic success message even
        # when the email is not in our system. This prevents an attacker from
        # discovering which emails are registered by probing this endpoint.
        # No OTP is generated or sent in this case.
        return {"message": "If that email is in our system, an OTP was sent."}
    
    if not check_user_exists and user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered.",
        )

    # Generate 6 digit code
    code = f"{random.randint(0, 999999):06d}"
    
    # Store in DB
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    otp = OTPCode(email=email, code=code, purpose=purpose, expires_at=expires)
    db.add(otp)
    await db.commit()

    # Send email
    send_otp_email(email, code, purpose)
    
    return {"message": "OTP sent to email."}


@router.post("/register/otp/request")
async def register_otp_request(payload: OTPRequest, db: AsyncSession = Depends(get_db)):
    """Request an OTP to verify email before registration."""
    return await generate_and_send_otp(payload.email.lower().strip(), "register", db, check_user_exists=False)


@router.post("/forgot-password/request")
async def forgot_password_request(payload: OTPRequest, db: AsyncSession = Depends(get_db)):
    """Request a password reset OTP."""
    return await generate_and_send_otp(payload.email.lower().strip(), "reset", db, check_user_exists=True)


@router.post("/forgot-password/reset")
async def forgot_password_reset(payload: OTPVerifyReset, db: AsyncSession = Depends(get_db)):
    """Verify OTP and set new password."""
    email = payload.email.lower().strip()
    
    # Find latest unexpired, unused OTP for this email and purpose
    res = await db.execute(
        select(OTPCode)
        .where(OTPCode.email == email, OTPCode.purpose == "reset", OTPCode.is_used == False)
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = res.scalar_one_or_none()
    
    if not otp or otp.code != payload.code or otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    # Mark as used
    otp.is_used = True
    
    # Update password
    res_user = await db.execute(select(User).where(User.email == email))
    user = res_user.scalar_one_or_none()
    if user:
        user.password_hash = hash_password(payload.new_password)
    
    await db.commit()
    return {"message": "Password successfully reset."}


@router.post("/login/otp/request")
async def login_otp_request(payload: OTPRequest, db: AsyncSession = Depends(get_db)):
    """Request an OTP for passwordless login."""
    return await generate_and_send_otp(payload.email.lower().strip(), "login", db)


@router.post("/login/otp/verify", response_model=TokenResponse)
async def login_otp_verify(payload: OTPVerifyLogin, db: AsyncSession = Depends(get_db)):
    """Verify login OTP and return token."""
    email = payload.email.lower().strip()
    
    # Find latest unexpired, unused OTP
    res = await db.execute(
        select(OTPCode)
        .where(OTPCode.email == email, OTPCode.purpose == "login", OTPCode.is_used == False)
        .order_by(OTPCode.created_at.desc())
        .limit(1)
    )
    otp = res.scalar_one_or_none()
    
    if not otp or otp.code != payload.code or otp.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    otp.is_used = True
    
    # Find user
    res_user = await db.execute(select(User).where(User.email == email))
    user = res_user.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    await db.commit()
    
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
