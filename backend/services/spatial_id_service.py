"""
SIH26011 - Spatial Identifier Service
Handles identifier generation, versioning logic
"""
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from ..models import (
    LandParcel, Building, Floor, PropertyUnit, 
    SpatialIdentifier, SpatialIdentifierHistory, AuditLog
)
from ..services.geometry_service import generate_polyhedral_solid, hash_geometry, solid_to_ewkt


async def generate_spatial_identifier(
    session: AsyncSession,
    parcel: LandParcel,
    building: Building,
    floor: Floor,
    unit: PropertyUnit,
    geometry_hash: str
) -> SpatialIdentifier:
    """Generate a new spatial identifier for a property unit."""
    identifier_string = f"{parcel.ulpin}-{building.id}-{floor.floor_code}-{unit.unit_code}-V01"
    
    identifier = SpatialIdentifier(
        id=f"sid-{uuid.uuid4().hex[:12]}",
        identifier_string=identifier_string,
        ulpin=parcel.ulpin,
        building_code=building.id,
        floor_code=floor.floor_code,
        unit_code=unit.unit_code,
        version=1,
        geometry_hash=geometry_hash,
        property_unit_id=unit.id
    )
    session.add(identifier)
    return identifier


async def update_spatial_identifier(
    session: AsyncSession,
    spatial_id: SpatialIdentifier,
    unit: PropertyUnit,
    new_geometry_hash: str,
    new_version: int,
    reason: str = None
) -> SpatialIdentifier:
    """Update spatial identifier with new version and geometry hash."""
    # Store old values for history
    old_version = spatial_id.version
    old_identifier_string = spatial_id.identifier_string
    old_geometry_hash = spatial_id.geometry_hash
    
    # Get old 3D solid for history
    from geoalchemy2.shape import to_shape
    from ..services.geometry_service import generate_polyhedral_solid, solid_to_ewkt
    
    unit_geom = to_shape(unit.footprint)
    old_coords = list(unit_geom.exterior.coords)[:-1]
    old_z_min = unit.z_min
    old_z_max = unit.z_max
    old_solid = generate_polyhedral_solid(old_coords, old_z_min, old_z_max)
    old_solid_ewkt = f"SRID=4326;{solid_to_ewkt(old_solid)}"
    
    # Update spatial identifier
    spatial_id.version = new_version
    spatial_id.geometry_hash = new_geometry_hash
    
    # Parse identifier components and update version
    parts = spatial_id.identifier_string.split('-')
    if len(parts) >= 5:
        parts[-1] = f"V{str(new_version).zfill(2)}"
        spatial_id.identifier_string = '-'.join(parts)
    
    # Create history entry
    history_id = f"sidh-{uuid.uuid4().hex[:12]}"
    history_entry = SpatialIdentifierHistory(
        id=history_id,
        identifier_string=old_identifier_string,
        version=old_version,
        geometry_hash=old_geometry_hash,
        retired_geom=old_solid_ewkt,
        retired_at=datetime.utcnow(),
        reason=reason or f"Geometry updated from version {old_version} to {new_version}",
        identifier_id=spatial_id.id
    )
    session.add(history_entry)
    
    return spatial_id


async def get_spatial_identifier(session: AsyncSession, unit_id: str):
    """Get spatial identifier for a property unit."""
    result = await session.execute(
        select(SpatialIdentifier).where(SpatialIdentifier.property_unit_id == unit_id)
    )
    return result.scalar_one_or_none()


async def get_identifier_history(session: AsyncSession, identifier_id: str):
    """Get version history for a spatial identifier."""
    result = await session.execute(
        select(SpatialIdentifierHistory)
        .where(SpatialIdentifierHistory.identifier_id == identifier_id)
        .order_by(SpatialIdentifierHistory.version)
    )
    return result.scalars().all()