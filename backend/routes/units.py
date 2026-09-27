"""
SIH26011 - Unit Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from ..database import get_session
from ..models import PropertyUnit, Floor, Building, LandParcel, SpatialIdentifier, SpatialIdentifierHistory, AuditLog, AppUser
from ..schemas.unit_schemas import UnitGeometryUpdateRequest, UnitGeometryUpdateResponse, UnitHistoryResponse
from ..services.geometry_service import (
    generate_polyhedral_solid, hash_geometry, footprint_area_m2,
    validate_footprint_geometry, validate_unit_properties, solid_to_ewkt
)
from ..services.spatial_id_service import update_spatial_identifier
import uuid
from datetime import datetime
from geoalchemy2.shape import to_shape, from_shape
from shapely.geometry import shape as shapely_shape


router = APIRouter(prefix="/api", tags=["units"])


def serialize_unit(u):
    """Serialize PropertyUnit model to dict"""
    from ..routes.parcels import _geom_to_geojson
    fp = _geom_to_geojson(u.footprint)
    ring = fp["coordinates"][0] if fp and fp.get("coordinates") else None
    if ring and u.z_min is not None and u.z_max is not None:
        volume = footprint_area_m2(ring) * max(u.z_max - u.z_min, 0)
    else:
        volume = u.volume_cum
    return {
        "id": u.id,
        "floor_id": u.floor_id,
        "unit_code": u.unit_code,
        "unit_type": u.unit_type,
        "label": u.label,
        "area_sqm": u.area_sqm,
        "volume_cum": volume,
        "footprint": fp,
        "solid_geom": _geom_to_geojson(u.solid_geom),
        "geometry_hash": u.geometry_hash,
        "geometry_version": u.geometry_version,
        "z_min": u.z_min,
        "z_max": u.z_max,
        "created_at": u.created_at.isoformat() if u.created_at else None
    }


@router.get("/units")
async def list_units(session: AsyncSession = Depends(get_session)):
    """List all property units"""
    result = await session.execute(select(PropertyUnit))
    units = result.scalars().all()
    return [serialize_unit(u) for u in units]


@router.get("/units/{unit_id}")
async def get_unit(unit_id: str, session: AsyncSession = Depends(get_session)):
    """Get property unit detail"""
    result = await session.execute(
        select(PropertyUnit).where(PropertyUnit.id == unit_id)
    )
    unit = result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Property unit not found")
    
    return serialize_unit(unit)


@router.get("/properties/{unit_id}")
async def get_property(unit_id: str, session: AsyncSession = Depends(get_session)):
    """Get property unit detail with full context"""
    # Get unit
    unit_result = await session.execute(
        select(PropertyUnit).where(PropertyUnit.id == unit_id)
    )
    unit = unit_result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Property unit not found")
    
    # Get floor
    floor_result = await session.execute(
        select(Floor).where(Floor.id == unit.floor_id)
    )
    floor = floor_result.scalar_one_or_none()
    
    # Get building
    building_result = await session.execute(
        select(Building).where(Building.id == floor.building_id)
    )
    building = building_result.scalar_one_or_none()
    
    # Get parcel
    parcel_result = await session.execute(
        select(LandParcel).where(LandParcel.id == building.parcel_id)
    )
    parcel = parcel_result.scalar_one_or_none()
    
    # Get spatial identifier
    sid_result = await session.execute(
        select(SpatialIdentifier).where(SpatialIdentifier.property_unit_id == unit_id)
    )
    spatial_id = sid_result.scalar_one_or_none()
    
    # Build response
    unit_data = serialize_unit(unit)
    from ..routes.parcels import serialize_parcel, serialize_building as serialize_b, serialize_floor as serialize_f
    unit_data["floor"] = serialize_f(floor)
    unit_data["building"] = serialize_b(building)
    unit_data["parcel"] = serialize_parcel(parcel)
    unit_data["spatial_identifier"] = {
        "id": spatial_id.id,
        "identifier_string": spatial_id.identifier_string,
        "version": spatial_id.version,
        "geometry_hash": spatial_id.geometry_hash
    } if spatial_id else None
    
    return unit_data


# Use a sentinel to allow both FastAPI Depends and direct test calls
_UNSET = object()

@router.put("/units/{unit_id}/geometry", response_model=UnitGeometryUpdateResponse)
async def update_unit_geometry(
    unit_id: str, 
    request: UnitGeometryUpdateRequest,
    session=_UNSET
):
    """Update a property unit's geometry (footprint and/or z-range)."""
    user_role = request.user_role
    reason = request.reason
    
    # Allow session to be passed directly for testing (bypassing Depends)
    owns_session = False
    if session is _UNSET or session is None:
        from backend.database import async_session
        session = async_session()
        owns_session = True
    
    try:
        # 1. Get the existing unit
        unit_result = await session.execute(
            select(PropertyUnit).where(PropertyUnit.id == unit_id)
        )
        unit = unit_result.scalar_one_or_none()
        
        if not unit:
            raise HTTPException(status_code=404, detail="Property unit not found")
        
        # Get current floor
        floor_result = await session.execute(
            select(Floor).where(Floor.id == unit.floor_id)
        )
        floor = floor_result.scalar_one_or_none()
        
        if not floor:
            raise HTTPException(status_code=404, detail="Associated floor not found")
        
        # 2. Validate the new geometry if provided
        new_footprint_geom = None
        new_coords = None
        new_z_min = request.z_min_m if request.z_min_m is not None else unit.z_min
        new_z_max = request.z_max_m if request.z_max_m is not None else unit.z_max
        
        if request.footprint:
            shapely_geom = shapely_shape(request.footprint)
            
            # Validate footprint geometry
            geom_error = validate_footprint_geometry(shapely_geom)
            if geom_error:
                raise HTTPException(status_code=422, detail=f"Invalid footprint geometry: {geom_error}")
            
            # Extract coordinates
            new_coords = list(shapely_geom.exterior.coords)
            new_footprint_geom = from_shape(shapely_geom, srid=4326)
        
        # Validate Z range
        if new_z_max <= new_z_min:
            raise HTTPException(status_code=422, detail=f"Invalid Z range: z_max ({new_z_max}) must be > z_min ({new_z_min})")
        
        # 3. Generate new solid for conflict detection
        if new_coords:
            coords_to_use = new_coords[:-1]
        else:
            unit_geom = to_shape(unit.footprint)
            coords_to_use = list(unit_geom.exterior.coords)[:-1]
        z_min_to_use = new_z_min
        z_max_to_use = new_z_max
        
        new_solid = generate_polyhedral_solid(coords_to_use, z_min_to_use, z_max_to_use)
        new_geom_hash = hash_geometry(new_solid)
        
        # 4. Check for conflicts with other units on the same floor
        from ..services.topology_service import validate_topology, check_new_solid_conflicts
        
        current_validation = await validate_topology(session, floor_id=unit.floor_id)
        current_conflicts = set()
        for issue in current_validation["issues"]:
            if issue["entity_id"] and unit_id in issue["entity_id"]:
                ids = issue["entity_id"].split(',')
                other_id = ids[1] if ids[0] == unit_id else ids[0]
                current_conflicts.add(other_id)

        # Check the proposed solid against current neighbours
        new_ring = coords_to_use + [coords_to_use[0]]
        new_wkt = "POLYGON((%s))" % ", ".join(f"{x} {y}" for x, y in new_ring)
        new_pairs = await check_new_solid_conflicts(
            session, unit_id, unit.floor_id, new_wkt, z_min_to_use, z_max_to_use)

        # Check new conflicts
        new_conflicts = set()
        for ida, idb in new_pairs:
            if unit_id in (ida, idb):
                new_conflicts.add(idb if ida == unit_id else ida)
        
        # Only reject if there are NEW conflicts (conflicts that didn't exist before)
        new_conflicts_only = new_conflicts - current_conflicts
        
        if new_conflicts_only:
            conflict_msg = "; ".join(
                f"Update would create new spatial conflict with {other_id}"
                for other_id in sorted(new_conflicts_only)
            )
            raise HTTPException(
                status_code=422,
                detail=conflict_msg
            )
        
        # 5. Get current spatial identifier
        sid_result = await session.execute(
            select(SpatialIdentifier).where(SpatialIdentifier.property_unit_id == unit_id)
        )
        spatial_id = sid_result.scalar_one_or_none()
        
        if not spatial_id:
            raise HTTPException(status_code=404, detail="Spatial identifier not found for this unit")
        
        # 6. Store old values for history/audit
        old_version = spatial_id.version
        old_identifier_string = spatial_id.identifier_string
        old_geometry_hash = spatial_id.geometry_hash
        
        # Get old 3D solid for history
        unit_geom = to_shape(unit.footprint)
        old_coords = list(unit_geom.exterior.coords)[:-1]
        old_z_min = unit.z_min
        old_z_max = unit.z_max
        old_solid = generate_polyhedral_solid(old_coords, old_z_min, old_z_max)
        old_solid_ewkt = f"SRID=4326;{solid_to_ewkt(old_solid)}"
        
        # 7. Update spatial identifier
        new_version = old_version + 1
        spatial_id = await update_spatial_identifier(
            session, spatial_id, unit, new_geom_hash, new_version, reason
        )
        
        # 8. Update property unit
        if request.footprint:
            shapely_geom = shapely_shape(request.footprint)
            unit.footprint = from_shape(shapely_geom, srid=4326)
        
        unit.geometry_hash = new_geom_hash
        unit.geometry_version = new_version
        vol_ring = new_coords if new_coords else list(to_shape(unit.footprint).exterior.coords)
        unit.volume_cum = footprint_area_m2(vol_ring) * max(z_max_to_use - z_min_to_use, 0)

        # Refresh the stored 3D solid for native validation
        await session.flush()
        from sqlalchemy import text as _sa_text2
        await session.execute(_sa_text2(
            "UPDATE property_unit SET solid_geom = ST_Translate("
            "ST_Extrude(ST_Force3D(footprint), 0, 0, z_max - z_min), 0, 0, z_min) "
            "WHERE id = :i AND footprint IS NOT NULL AND z_max > z_min"),
            {"i": unit_id})
        
        # Update unit's own z_min/z_max if changed (NOT floor's)
        if request.z_min_m is not None:
            unit.z_min = new_z_min
        if request.z_max_m is not None:
            unit.z_max = new_z_max
        
        # 9. Create audit log entry
        user_id = None
        user_result = await session.execute(
            select(AppUser).where(AppUser.role == request.user_role)
        )
        user = user_result.scalar_one_or_none()
        if user:
            user_id = user.id
        
        audit_details = {
            "old_geometry_hash": old_geometry_hash,
            "new_geometry_hash": new_geom_hash,
            "old_version": old_version,
            "new_version": new_version,
            "old_identifier": old_identifier_string,
            "new_identifier": spatial_id.identifier_string,
            "changed_fields": {
                "footprint": request.footprint is not None,
                "z_min": request.z_min_m is not None,
                "z_max": request.z_max_m is not None,
            },
            "reason": reason,
        }
        
        audit_entry = AuditLog(
            id=f"audit-{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            action="GEOMETRY_UPDATED",
            entity_type="property_unit",
            entity_id=unit_id,
            timestamp=datetime.utcnow(),
            details=audit_details
        )
        session.add(audit_entry)
        
        if owns_session:
            await session.commit()
        else:
            # For external session, let the caller handle commit/rollback
            await session.flush()
        
        return UnitGeometryUpdateResponse(
            unit_id=unit_id,
            old_version=old_version,
            new_version=new_version,
            old_geometry_hash=old_geometry_hash,
            new_geometry_hash=new_geom_hash,
            spatial_identifier=spatial_id.identifier_string,
            status="UPDATED"
        )
        
    except HTTPException:
        if owns_session:
            await session.rollback()
        raise
    except Exception as e:
        if owns_session:
            await session.rollback()
        import traceback
        tb = traceback.format_exc()
        print(f"FULL TRACEBACK:\n{tb}")
        import logging
        logging.exception("Unit geometry update failed")
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")
    finally:
        if owns_session:
            await session.close()


@router.get("/units/{unit_id}/history", response_model=UnitHistoryResponse)
async def get_unit_history(unit_id: str, session: AsyncSession = Depends(get_session)):
    """Get version history for a property unit."""
    # Verify unit exists
    unit_result = await session.execute(
        select(PropertyUnit).where(PropertyUnit.id == unit_id)
    )
    unit = unit_result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(status_code=404, detail="Property unit not found")
    
    # Get spatial identifier
    sid_result = await session.execute(
        select(SpatialIdentifier).where(SpatialIdentifier.property_unit_id == unit_id)
    )
    spatial_id = sid_result.scalar_one_or_none()
    
    if not spatial_id:
        raise HTTPException(status_code=404, detail="Spatial identifier not found for this unit")
    
    # Get history entries
    history_result = await session.execute(
        select(SpatialIdentifierHistory)
        .where(SpatialIdentifierHistory.identifier_id == spatial_id.id)
        .order_by(SpatialIdentifierHistory.version)
    )
    history_entries = history_result.scalars().all()
    
    # Build history entries
    history = []
    for h in history_entries:
        retired_geom_ewkt = None
        if h.retired_geom:
            try:
                result = await session.execute(
                    select(func.ST_AsEWKT(SpatialIdentifierHistory.retired_geom))
                    .where(SpatialIdentifierHistory.id == h.id)
                )
                retired_geom_ewkt = result.scalar()
            except Exception:
                retired_geom_ewkt = str(h.retired_geom) if h.retired_geom else None
        
        history.append({
            "version": h.version,
            "identifier_string": h.identifier_string,
            "geometry_hash": h.geometry_hash,
            "footprint": {},
            "z_min": 0,
            "z_max": 0,
            "changed_at": h.retired_at.isoformat() if h.retired_at else "",
            "changed_by": None,
            "reason": h.reason,
            "retired_geom": retired_geom_ewkt
        })
    
    # Add current version as the latest entry
    from ..routes.parcels import _geom_to_geojson
    history.append({
        "version": spatial_id.version,
        "identifier_string": spatial_id.identifier_string,
        "geometry_hash": spatial_id.geometry_hash,
        "footprint": _geom_to_geojson(unit.footprint) or {},
        "z_min": unit.z_min if unit.z_min is not None else 0,
        "z_max": unit.z_max if unit.z_max is not None else 0,
        "changed_at": spatial_id.created_at.isoformat() if spatial_id.created_at else "",
        "changed_by": None,
        "reason": "Current version"
    })
    
    return UnitHistoryResponse(
        unit_id=unit_id,
        current_version=spatial_id.version,
        history=history
    )