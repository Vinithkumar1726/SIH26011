"""
SIH26011 - Search Routes
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from ..database import get_session
from ..models import LandParcel, Building, PropertyUnit


router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search")
async def search(query: str, session: AsyncSession = Depends(get_session)):
    """Global search across all entities"""
    results = []
    
    # Search parcels
    parcels = await session.execute(
        select(LandParcel).where(
            or_(
                LandParcel.id.ilike(f"%{query}%"),
                LandParcel.ulpin.ilike(f"%{query}%"),
                LandParcel.name.ilike(f"%{query}%")
            )
        ).limit(10)
    )
    for p in parcels.scalars().all():
        results.append({
            "type": "parcel",
            "id": p.id,
            "label": p.name,
            "ulpin": p.ulpin
        })
    
    # Search buildings
    buildings = await session.execute(
        select(Building).where(
            or_(
                Building.id.ilike(f"%{query}%"),
                Building.name.ilike(f"%{query}%")
            )
        ).limit(10)
    )
    for b in buildings.scalars().all():
        results.append({
            "type": "building",
            "id": b.id,
            "label": b.name
        })
    
    # Search units
    units = await session.execute(
        select(PropertyUnit).where(
            or_(
                PropertyUnit.id.ilike(f"%{query}%"),
                PropertyUnit.unit_code.ilike(f"%{query}%"),
                PropertyUnit.label.ilike(f"%{query}%")
            )
        ).limit(10)
    )
    for u in units.scalars().all():
        results.append({
            "type": "property_unit",
            "id": u.id,
            "label": u.label,
            "unit_code": u.unit_code
        })
    
    return results