"""
SIH26011 - Spatial Identifier Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_session
from ..models import SpatialIdentifier


router = APIRouter(prefix="/api", tags=["spatial-identifiers"])


@router.get("/spatial-identifiers")
async def get_spatial_identifiers(session: AsyncSession = Depends(get_session)):
    """Get all spatial identifiers"""
    result = await session.execute(select(SpatialIdentifier))
    return [
        {
            "id": s.id,
            "identifier_string": s.identifier_string,
            "ulpin": s.ulpin,
            "building_code": s.building_code,
            "floor_code": s.floor_code,
            "unit_code": s.unit_code,
            "version": s.version,
            "geometry_hash": s.geometry_hash,
            "property_unit_id": s.property_unit_id,
            "created_at": s.created_at.isoformat() if s.created_at else None
        }
        for s in result.scalars().all()
    ]