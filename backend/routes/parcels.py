"""
SIH26011 - Parcel Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Dict, Any
import json as _json

from ..database import get_session
from ..models import LandParcel, Building, Floor, PropertyUnit, SpatialIdentifier
from ..schemas.dashboard import DashboardStats


router = APIRouter(prefix="/api", tags=["parcels"])


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
    """Serialize LandParcel model to dict"""
    return {
        "id": p.id,
        "ulpin": p.ulpin,
        "name": p.name,
        "area_sqm": p.area_sqm,
        "srid": p.srid,
        "geometry": _geom_to_geojson(p.geometry),
        "created_at": p.created_at.isoformat() if p.created_at else None
    }


def serialize_building(b):
    """Serialize Building model to dict"""
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


def serialize_floor(f):
    """Serialize Floor model to dict"""
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


def serialize_unit(u):
    """Serialize PropertyUnit model to dict"""
    from ..services.geometry_service import footprint_area_m2
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


@router.get("/parcels")
async def list_parcels(session: AsyncSession = Depends(get_session)):
    """List all parcels"""
    result = await session.execute(select(LandParcel))
    parcels = result.scalars().all()
    return [serialize_parcel(p) for p in parcels]


@router.get("/parcels/{parcel_id}")
async def get_parcel(parcel_id: str, session: AsyncSession = Depends(get_session)):
    """Parcel detail with full hierarchy as an RFC 7946 FeatureCollection."""
    async with session.begin():
        def _geom(g):
            return _json.loads(g) if g else None

        # Get parcel
        parcel_row = (await session.execute(
            select(LandParcel, func.ST_AsGeoJSON(LandParcel.geometry).label("geom"))
            .where(LandParcel.id == parcel_id)
        )).first()

        if not parcel_row:
            raise HTTPException(status_code=404, detail="Parcel not found")
        parcel, parcel_geom = parcel_row

        features = [{
            "type": "Feature",
            "geometry": _geom(parcel_geom),
            "properties": {
                "kind": "parcel",
                "id": parcel.id,
                "ulpin": parcel.ulpin,
                "name": parcel.name,
                "area_sqm": parcel.area_sqm,
                "srid": parcel.srid,
            },
        }]

        # Get buildings in this parcel
        buildings = (await session.execute(
            select(Building, func.ST_AsGeoJSON(Building.footprint).label("geom"))
            .where(Building.parcel_id == parcel_id)
        )).all()

        for building, building_geom in buildings:
            # Get floors in this building
            floors = (await session.execute(
                select(Floor).where(Floor.building_id == building.id)
            )).scalars().all()

            bldg_data = serialize_building(building)
            bldg_data.pop("footprint", None)
            bldg_data.pop("solid_geom", None)
            bldg_data["kind"] = "building"
            bldg_data["floors_count"] = len(floors)
            features.append({
                "type": "Feature",
                "geometry": _geom(building_geom),
                "properties": bldg_data,
            })

            for floor in floors:
                floor_data = serialize_floor(floor)
                floor_data["kind"] = "floor"
                features.append({
                    "type": "Feature",
                    "geometry": None,
                    "properties": floor_data,
                })

                # Get units in this floor
                units = (await session.execute(
                    select(PropertyUnit,
                           func.ST_AsGeoJSON(PropertyUnit.footprint).label("geom"))
                    .where(PropertyUnit.floor_id == floor.id)
                )).all()

                for unit, unit_geom in units:
                    unit_data = serialize_unit(unit)
                    unit_data.pop("footprint", None)
                    unit_data.pop("solid_geom", None)
                    unit_data["kind"] = "unit"
                    sid = (await session.execute(
                        select(SpatialIdentifier)
                        .where(SpatialIdentifier.property_unit_id == unit.id)
                    )).scalar_one_or_none()
                    unit_data["spatial_id"] = {
                        "id": sid.id,
                        "full": sid.identifier_string,
                        "ulpin": sid.ulpin,
                        "bldg": sid.building_code,
                        "floor": sid.floor_code,
                        "unit": sid.unit_code,
                        "version": sid.version,
                        "hash": sid.geometry_hash,
                        "unit_id": sid.property_unit_id,
                    } if sid else None
                    features.append({
                        "type": "Feature",
                        "geometry": _geom(unit_geom),
                        "properties": unit_data,
                    })

        return {"type": "FeatureCollection", "features": features}