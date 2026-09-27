"""
SIH26011 - Auth Routes
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from ..database import get_session
from ..models import AppUser
from ..services.auth_service import verify_password, get_password_hash, create_access_token
from ..middleware.auth_middleware import get_current_user


router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, session: AsyncSession = Depends(get_session)):
    """Authenticate user and return JWT token."""
    result = await session.execute(
        select(AppUser).where(AppUser.username == request.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    # Update last_login
    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    await session.commit()
    
    access_token = create_access_token(user.id, user.role)
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "display_name": user.display_name
        }
    )


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(current_user: AppUser = Depends(get_current_user)):
    """Refresh JWT token."""
    access_token = create_access_token(current_user.id, current_user.role)
    return RefreshResponse(access_token=access_token, token_type="bearer")


@router.get("/me")
async def get_current_user_info(current_user: AppUser = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "display_name": current_user.display_name,
        "is_active": current_user.is_active
    }