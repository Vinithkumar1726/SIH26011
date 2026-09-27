"""
SIH26011 - Building Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_session
from ..models import Building, Floor


router = APIRouter(prefix="/api", tags=["buildings"])


async def floor_counts_by_building(session: AsyncSession):
    """Actual linked floor counts per building (derived, not the stored value)."""
    rows = await session.execute(
        select(Floor.building_id, func.count(Floor.id)).group_by(Floor.building_id)
    )
    return {bid: n for bid, n in rows.all()}


def serialize_building(b):
    """Serialize Building model to dict"""
    from ..routes.parcels import _geom_to_geojson
    return {
        "id": b.id,
        "parcel_id": b.parcel_id,
        "name": b.name,
        "height_m": b.height_m,
        "height_source": b.height_source,
        "floors_count": b.floors_count,
        "footprint": _geom_to_geojson(b.footprint),
        "solid_geom": _geom_to_geojson(b.solid_geom),
        "created_at": b.created_at.isoformat() if b.created_at else None
    }


@router.get("/buildings")
async def list_buildings(session: AsyncSession = Depends(get_session)):
    """List all buildings"""
    result = await session.execute(select(Building))
    buildings = result.scalars().all()
    counts = await floor_counts_by_building(session)
    out = []
    for b in buildings:
        data = serialize_building(b)
        data["floors_count"] = counts.get(b.id, 0)
        out.append(data)
    return out


@router.get("/buildings/{building_id}")
async def get_building(building_id: str, session: AsyncSession = Depends(get_session)):
    """Get building detail"""
    result = await session.execute(
        select(Building).where(Building.id == building_id)
    )
    building = result.scalar_one_or_none()
    
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")

    counts = await floor_counts_by_building(session)
    data = serialize_building(building)
    data["floors_count"] = counts.get(building.id, 0)
    return data