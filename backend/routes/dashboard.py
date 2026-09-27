"""
SIH26011 - Dashboard Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Dict, Any

from ..database import get_session
from ..models import LandParcel, Building, Floor, PropertyUnit, ValidationRun, AIProposal
from ..schemas.dashboard import DashboardStats, BuildingHeightRange, ValidationState


router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(session: AsyncSession = Depends(get_session)):
    """Get dashboard statistics (cadastral-only, excludes OSM synthetic data)."""
    # Consume each result immediately: re-reading one Result raises ResourceClosedError
    parcels = (await session.execute(
        select(func.count(LandParcel.id)).where(LandParcel.id != 'parcel-osm-coimbatore')
    )).scalar() or 0
    
    buildings = (await session.execute(
        select(func.count(Building.id)).where(
            Building.parcel_id != 'parcel-osm-coimbatore',
            ~Building.id.like('w%'),
        )
    )).scalar() or 0
    
    floors = (await session.execute(select(func.count(Floor.id)))).scalar() or 0
    units = (await session.execute(select(func.count(PropertyUnit.id)))).scalar() or 0
    
    return DashboardStats(
        total_parcels=parcels,
        total_buildings=buildings,
        total_floors=floors,
        total_units=units,
        total_3d_units=units,
        validated_units=units,
        conflicts=0,
        ai_proposals_pending=0
    )


@router.get("/statistics", response_model=DashboardStats)
async def get_statistics(session: AsyncSession = Depends(get_session)):
    """Get dashboard statistics with additional validation and AI info."""
    parcels = (await session.execute(
        select(func.count(LandParcel.id)).where(LandParcel.id != 'parcel-osm-coimbatore')
    )).scalar() or 0
    
    buildings = (await session.execute(
        select(func.count(Building.id)).where(
            Building.parcel_id != 'parcel-osm-coimbatore',
            ~Building.id.like('w%'),
        )
    )).scalar() or 0
    
    floors = (await session.execute(select(func.count(Floor.id)))).scalar() or 0
    units = (await session.execute(select(func.count(PropertyUnit.id)))).scalar() or 0
    
    # Get validation stats
    validation_result = await session.execute(
        select(ValidationRun).order_by(ValidationRun.started_at.desc()).limit(1)
    )
    latest_validation = validation_result.scalar_one_or_none()
    
    # Get AI proposals pending
    ai_pending = (await session.execute(
        select(func.count(AIProposal.id)).where(AIProposal.status == "REVIEW_REQUIRED")
    )).scalar() or 0
    
    return DashboardStats(
        total_parcels=parcels,
        total_buildings=buildings,
        total_floors=floors,
        total_units=units,
        total_3d_units=units,
        validated_units=units,
        conflicts=0,
        ai_proposals_pending=ai_pending,
        last_validation={
            "status": latest_validation.status if latest_validation else "NOT_RUN",
            "timestamp": latest_validation.started_at.isoformat() if latest_validation else None
        } if latest_validation else None
    )


@router.get("/statistics/buildings-by-height", response_model=List[BuildingHeightRange])
async def get_buildings_by_height(session: AsyncSession = Depends(get_session)):
    """Get buildings grouped by height ranges for chart."""
    result = await session.execute(select(Building))
    buildings = result.scalars().all()
    
    ranges = {
        "1-5": 0,
        "6-10": 0,
        "11-20": 0,
        "21-30": 0,
        "31-40": 0,
        "41+": 0
    }
    
    for building in buildings:
        floors = building.floors_count
        if floors <= 5:
            ranges["1-5"] += 1
        elif floors <= 10:
            ranges["6-10"] += 1
        elif floors <= 20:
            ranges["11-20"] += 1
        elif floors <= 30:
            ranges["21-30"] += 1
        elif floors <= 40:
            ranges["31-40"] += 1
        else:
            ranges["41+"] += 1
    
    return [{"range": k, "count": v} for k, v in ranges.items()]


@router.get("/statistics/validation-state", response_model=ValidationState)
async def get_validation_state(session: AsyncSession = Depends(get_session)):
    """Get validation state breakdown for donut chart."""
    result = await session.execute(
        select(ValidationRun).order_by(ValidationRun.started_at.desc()).limit(1)
    )
    latest = result.scalar_one_or_none()
    
    if not latest:
        return ValidationState(clean=0, warnings=0, errors=0, not_validated=0, total=0)
    
    total_units = await session.execute(select(func.count(PropertyUnit.id)))
    total = total_units.scalar() or 0
    
    issues = latest.issues or []
    errors = len([i for i in issues if i.get("severity") == "HIGH"])
    warnings = len([i for i in issues if i.get("severity") == "MEDIUM"])
    clean = total - errors - warnings
    
    return ValidationState(
        clean=clean,
        warnings=warnings,
        errors=errors,
        not_validated=0,
        total=total
    )