"""
SIH26011 - Import Service
Handles file parsing and persist pipeline
"""
import io
import csv
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text as _sa_text
from geoalchemy2.shape import from_shape
from shapely.geometry import shape as shapely_shape
import geojson

from ..models import (
    LandParcel, Building, Floor, PropertyUnit, 
    SpatialIdentifier, ImportSession, ValidationRun, AuditLog, AppUser
)
from ..services.geometry_service import (
    generate_polyhedral_solid, hash_geometry, footprint_area_m2,
    validate_footprint_geometry, validate_unit_properties, solid_to_ewkt
)
from ..services.spatial_id_service import generate_spatial_identifier
from ..services.topology_service import rebuild_solids


async def analyze_import_files(
    parcel_file: Optional[bytes] = None,
    buildings_file: Optional[bytes] = None,
    floors_file: Optional[bytes] = None,
    units_file: Optional[bytes] = None
) -> Dict[str, Any]:
    """Analyze uploaded cadastral files without persisting."""
    parcel_count = 0
    building_count = 0
    floor_count = 0
    unit_count = 0
    warnings = []
    
    if parcel_file:
        data = geojson.loads(parcel_file)
        if data.get("type") == "FeatureCollection":
            parcel_count = len(data.get("features", []))
    
    if buildings_file:
        data = geojson.loads(buildings_file)
        if data.get("type") == "FeatureCollection":
            building_count = len(data.get("features", []))
    
    if floors_file:
        reader = csv.DictReader(io.StringIO(floors_file.decode('utf-8')))
        floor_count = sum(1 for _ in reader)
    
    if units_file:
        data = geojson.loads(units_file)
        if data.get("type") == "FeatureCollection":
            unit_count = len(data.get("features", []))
    
    return {
        "parcel_count": parcel_count,
        "building_count": building_count,
        "floor_count": floor_count,
        "unit_count": unit_count,
        "detected_crs": "EPSG:4326",
        "geometry_types": ["MultiPolygon", "Polygon"],
        "warnings": warnings
    }


async def persist_import(
    parcel_file: Optional[bytes] = None,
    buildings_file: Optional[bytes] = None,
    floors_file: Optional[bytes] = None,
    units_file: Optional[bytes] = None,
    user_role: str = "surveyor",
    session: AsyncSession = None
) -> Dict[str, Any]:
    """Persist imported cadastral data to database."""
    if user_role == "viewer":
        raise ValueError("viewer role cannot persist cadastral data")
    
    session_id = f"imp-{int(datetime.utcnow().timestamp())}"
    parcels_created = 0
    buildings_created = 0
    floors_created = 0
    units_created = 0
    identifiers_generated = 0
    parcel_ids = []
    
    try:
        # Parse and persist parcel
        if parcel_file:
            data = geojson.loads(parcel_file)
            if data.get("type") == "FeatureCollection":
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    geom = feature.get("geometry")
                    
                    shapely_geom = shapely_shape(geom)
                    geom_wkb = from_shape(shapely_geom, srid=4326)
                    
                    parcel_id = props.get("parcel_id") or props.get("id") or f"parcel-{parcels_created}"
                    
                    parcel_record = LandParcel(
                        id=parcel_id,
                        ulpin=props.get("ulpin") or "00000000000000",
                        name=props.get("name") or "Unnamed Parcel",
                        area_sqm=float(props.get("area_sqm") or 0.0),
                        srid=4326,
                        geometry=geom_wkb
                    )
                    session.add(parcel_record)
                    parcel_ids.append(parcel_id)
                    parcels_created += 1
        
        # Flush parcels so they can be referenced by buildings
        await session.flush()
        
        # Parse and persist buildings
        if buildings_file:
            data = geojson.loads(buildings_file)
            if data.get("type") == "FeatureCollection":
                for i, feature in enumerate(data.get("features", [])):
                    props = feature.get("properties", {})
                    geom = feature.get("geometry")
                    
                    shapely_geom = shapely_shape(geom)
                    footprint_wkb = from_shape(shapely_geom, srid=4326)
                    
                    parcel_ref = parcel_ids[i] if i < len(parcel_ids) else "parcel-0"
                    
                    height_source_val = props.get("height_source") or "ESTIMATED"
                    if isinstance(height_source_val, str):
                        height_source_val = height_source_val.upper()
                    
                    building_record = Building(
                        id=props.get("id") or props.get("building_code") or f"bldg-{buildings_created}",
                        parcel_id=parcel_ref,
                        name=props.get("name") or "Unnamed Building",
                        height_m=float(props.get("height_m") or 10.0),
                        height_source=height_source_val,
                        floors_count=int(props.get("floors_count") or 1),
                        footprint=footprint_wkb,
                        solid_geom=None
                    )
                    session.add(building_record)
                    buildings_created += 1
        
        # Parse and persist floors from CSV
        if floors_file:
            reader = csv.DictReader(io.StringIO(floors_file.decode('utf-8')))
            for row in reader:
                floor_record = Floor(
                    id=row.get("floor_id") or row.get("id") or f"floor-{floors_created}",
                    building_id=row.get("building_id") or row.get("building_code") or "bldg-0",
                    floor_code=row.get("floor_code") or "F00",
                    floor_label=row.get("display_name") or row.get("floor_label") or "Ground Floor",
                    z_min=float(row.get("z_min") or row.get("z_min_m") or 0.0),
                    z_max=float(row.get("z_max") or row.get("z_max_m") or 3.0),
                    area_sqm=float(row.get("floor_height") or row.get("area_sqm") or 100.0),
                    solid_geom=None
                )
                session.add(floor_record)
                floors_created += 1
        
        # Flush floors so they can be referenced by units
        await session.flush()
        
        # Derive floors_count from actual linked floors
        for bid, n in (await session.execute(
            select(Floor.building_id, func.count(Floor.id)).group_by(Floor.building_id)
        )).all():
            bres = await session.execute(select(Building).where(Building.id == bid))
            bldg = bres.scalar_one_or_none()
            if bldg is not None:
                bldg.floors_count = n
        
        # Parse and persist property units
        if units_file:
            data = geojson.loads(units_file)
            if data.get("type") == "FeatureCollection":
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    geom = feature.get("geometry")
                    
                    shapely_geom = shapely_shape(geom)
                    
                    # Validate footprint geometry
                    geom_error = validate_footprint_geometry(shapely_geom)
                    if geom_error:
                        raise ValueError(f"Invalid footprint geometry: {geom_error}")
                    
                    # Validate required properties
                    prop_error = validate_unit_properties(props)
                    if prop_error:
                        raise ValueError(prop_error)
                    
                    footprint_wkb = from_shape(shapely_geom, srid=4326)
                    
                    # Get floor reference
                    floor_ref = props.get("floor_id") or "floor-0"
                    
                    # Get floor Z-range for inheritance
                    floor_result = await session.execute(
                        select(Floor).where(Floor.id == floor_ref)
                    )
                    floor_obj = floor_result.scalar_one_or_none()
                    if not floor_obj:
                        raise ValueError(f"Referenced floor {floor_ref} not found")
                    
                    # Generate 3D solid (inherit Z-range from floor if not provided)
                    coords = list(shapely_geom.exterior.coords)
                    z_min = float(props.get("z_min_m") or floor_obj.z_min)
                    z_max = float(props.get("z_max_m") or floor_obj.z_max)
                    
                    solid = generate_polyhedral_solid(coords[:-1], z_min, z_max)
                    geom_hash = hash_geometry(solid)
                    solid_wkb = None  # Skip solid storage for now
                    
                    # Generate unique unit ID
                    unit_code = props.get("unit_code") or f"U{units_created:04d}"
                    unique_unit_id = f"{floor_ref}-{unit_code}"
                    
                    unit_record = PropertyUnit(
                        id=unique_unit_id,
                        floor_id=floor_ref,
                        unit_code=unit_code,
                        unit_type=props.get("unit_type") or "apartment",
                        label=props.get("label") or f"Unit {units_created}",
                        area_sqm=float(props.get("area_sqm") or 50.0),
                        volume_cum=footprint_area_m2(list(shapely_geom.exterior.coords)) * max(z_max - z_min, 0),
                        footprint=footprint_wkb,
                        solid_geom=solid_wkb,
                        geometry_hash=geom_hash,
                        geometry_version=1,
                        z_min=z_min,
                        z_max=z_max
                    )
                    session.add(unit_record)
                    units_created += 1
                    
                    # Generate spatial identifier
                    floor_result = await session.execute(
                        select(Floor).where(Floor.id == floor_ref)
                    )
                    floor = floor_result.scalar_one_or_none()
                    
                    if floor:
                        building_result = await session.execute(
                            select(Building).where(Building.id == floor.building_id)
                        )
                        building = building_result.scalar_one_or_none()
                        
                        if building:
                            parcel_result = await session.execute(
                                select(LandParcel).where(LandParcel.id == building.parcel_id)
                            )
                            parcel = parcel_result.scalar_one_or_none()
                            
                            if parcel:
                                await generate_spatial_identifier(
                                    session, parcel, building, floor, unit_record, geom_hash
                                )
                                identifiers_generated += 1
        
        # Rebuild stored 3D solids for native validation
        await rebuild_solids(session)
        
        await session.commit()
        
        # Run validation
        from ..services.topology_service import validate_topology
        validation_result = await validate_topology(session)
        
        return {
            "session_id": session_id,
            "status": "PERSISTED",
            "parcels_created": parcels_created,
            "buildings_created": buildings_created,
            "floors_created": floors_created,
            "units_created": units_created,
            "identifiers_generated": identifiers_generated,
            "validation_passed": validation_result["valid"],
            "validation_issues": len(validation_result["issues"])
        }
        
    except Exception as e:
        await session.rollback()
        raise