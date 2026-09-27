"""
SIH26011 - 3D Geometry Routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_session
from ..models import LandParcel, Building, Floor, PropertyUnit


router = APIRouter(prefix="/api/3d", tags=["geometry-3d"])


def _geom_to_geojson(geom):
    """Convert geoalchemy2 WKBElement to GeoJSON dict"""
    if geom is None:
        return None
    try:
        from geoalchemy2.shape import to_shape
        shape = to_shape(geom)
        return shape.__geo_interface__
    except Exception as e:
        if "Unknown WKB type" not in str(e):
            print(f"Geometry conversion error: {e}")
        return None


def serialize_parcel(p):
    return {
        "id": p.id, "ulpin": p.ulpin, "name": p.name,
        "area_sqm": p.area_sqm, "srid": p.srid,
        "geometry": _geom_to_geojson(p.geometry),
        "created_at": p.created_at.isoformat() if p.created_at else None
    }


def serialize_building(b):
    return {
        "id": b.id, "parcel_id": b.parcel_id, "name": b.name,
        "height_m": b.height_m, "height_source": b.height_source,
        "floors_count": b.floors_count,
        "footprint": _geom_to_geojson(b.footprint),
        "solid_geom": _geom_to_geojson(b.solid_geom),
        "created_at": b.created_at.isoformat() if b.created_at else None
    }


def serialize_floor(f):
    return {
        "id": f.id, "building_id": f.building_id,
        "floor_code": f.floor_code, "floor_label": f.floor_label,
        "z_min": f.z_min, "z_max": f.z_max, "area_sqm": f.area_sqm,
        "solid_geom": _geom_to_geojson(f.solid_geom)
    }


def serialize_unit(u):
    from ..services.geometry_service import footprint_area_m2
    fp = _geom_to_geojson(u.footprint)
    ring = fp["coordinates"][0] if fp and fp.get("coordinates") else None
    if ring and u.z_min is not None and u.z_max is not None:
        volume = footprint_area_m2(ring) * max(u.z_max - u.z_min, 0)
    else:
        volume = u.volume_cum
    return {
        "id": u.id, "floor_id": u.floor_id,
        "unit_code": u.unit_code, "unit_type": u.unit_type,
        "label": u.label, "area_sqm": u.area_sqm,
        "volume_cum": volume, "footprint": fp,
        "solid_geom": _geom_to_geojson(u.solid_geom),
        "geometry_hash": u.geometry_hash,
        "geometry_version": u.geometry_version,
        "z_min": u.z_min, "z_max": u.z_max,
        "created_at": u.created_at.isoformat() if u.created_at else None
    }


@router.get("/geometry")
async def get_3d_geometry(session: AsyncSession = Depends(get_session)):
    """Get all 3D geometry for Three.js rendering"""
    parcels = await session.execute(select(LandParcel))
    buildings = await session.execute(select(Building))
    floors = await session.execute(select(Floor))
    units = await session.execute(select(PropertyUnit))
    
    return {
        "parcels": [serialize_parcel(p) for p in parcels.scalars().all()],
        "buildings": [serialize_building(b) for b in buildings.scalars().all()],
        "floors": [serialize_floor(f) for f in floors.scalars().all()],
        "units": [serialize_unit(u) for u in units.scalars().all()]
    }