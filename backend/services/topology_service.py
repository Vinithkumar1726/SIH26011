"""
SIH26011 - Topology Service
Wraps the PostGIS overlap detection SQL for topology validation
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from .geometry_service import db_validate_topology, db_new_solid_conflicts


async def validate_topology(session: AsyncSession, floor_id: str = None):
    """Validate topology for overlaps using native PostGIS 3D operators."""
    return await db_validate_topology(session, floor_id)


async def check_new_solid_conflicts(
    session: AsyncSession, 
    unit_id: str, 
    floor_id: str, 
    wkt: str, 
    z_min: float, 
    z_max: float
):
    """Check for conflicts with a proposed new solid."""
    return await db_new_solid_conflicts(session, unit_id, floor_id, wkt, z_min, z_max)


async def rebuild_solids(session: AsyncSession):
    """Rebuild stored 3D solids for native validation from footprint + z-range."""
    from sqlalchemy import text as _sa_text
    await session.execute(_sa_text(
        "UPDATE property_unit SET solid_geom = ST_Translate("
        "ST_Extrude(ST_Force3D(footprint), 0, 0, z_max - z_min), 0, 0, z_min) "
        "WHERE solid_geom IS NULL AND footprint IS NOT NULL AND z_max > z_min"))