"""
SIH26011 - Floor Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_session
from ..models import Floor


router = APIRouter(prefix="/api", tags=["floors"])


def serialize_floor(f):
    """Serialize Floor model to dict"""
    from ..routes.parcels import _geom_to_geojson
    return {
        "id": f.id,
        "building_id": f.building_id,
        "floor_code": f.floor_code,
        "floor_label": f.floor_label,
        "z_min": f.z_min,
        "z_max": f.z_max,
        "area_sqm": f.area_sqm,
        "solid_geom": _geom_to_geojson(f.solid_geom)
    }


@router.get("/floors")
async def list_floors(session: AsyncSession = Depends(get_session)):
    """List all floors"""
    result = await session.execute(select(Floor))
    floors = result.scalars().all()
    return [serialize_floor(f) for f in floors]


@router.get("/floors/{floor_id}")
async def get_floor(floor_id: str, session: AsyncSession = Depends(get_session)):
    """Get floor detail"""
    result = await session.execute(
        select(Floor).where(Floor.id == floor_id)
    )
    floor = result.scalar_one_or_none()
    
    if not floor:
        raise HTTPException(status_code=404, detail="Floor not found")
    
    return serialize_floor(floor)