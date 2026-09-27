"""
SIH26011 - Health Check Routes
"""
from fastapi import APIRouter
from datetime import datetime
from ..schemas.health import HealthResponse


router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat()
    )