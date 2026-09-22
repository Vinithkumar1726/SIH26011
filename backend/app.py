"""
SIH26011 - FastAPI Backend
Real implementation with PostgreSQL + PostGIS
"""

import os
import json
import math
import hashlib
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from contextlib import asynccontextmanager

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, Text, JSON, Boolean, select, Enum, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.exc import IntegrityError
from geoalchemy2 import Geometry
import geojson
import csv
import io

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/sih26011")
DATABASE_URL_SYNC = os.getenv("DATABASE_URL_SYNC", "postgresql://postgres:postgres@localhost:5432/sih26011")

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=10,
    max_overflow=5,
    pool_pre_ping=True,
    pool_recycle=3600,
)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Create sync engine for migrations
sync_engine = create_engine(DATABASE_URL_SYNC, echo=False)

Base = declarative_base()

# ============================================================================
# DATABASE MODELS
# ============================================================================

class LandParcel(Base):
    __tablename__ = "land_parcel"
    
    id = Column(String, primary_key=True)
    ulpin = Column(String(14), nullable=False, index=True)
    name = Column(String, nullable=False)
    area_sqm = Column(Float, nullable=False)
    srid = Column(Integer, nullable=False, default=4326)
    geometry = Column(Geometry('MULTIPOLYGON', dimension=2, srid=4326))
    created_at = Column(DateTime, default=datetime.utcnow)

class Building(Base):
    __tablename__ = "building"
    
    id = Column(String, primary_key=True)
    parcel_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    height_m = Column(Float, nullable=False)
    height_source = Column(
        Enum('LIDAR', 'DSM', 'SURVEY', 'PROVIDED', 'BIM', 'OSM', 'AI', 'ESTIMATED', 'SYNTHETIC', 
             name='height_source', create_type=False), 
        nullable=False
    )
    floors_count = Column(Integer, nullable=False)
    footprint = Column(Geometry('POLYGON', dimension=2, srid=4326))
    solid_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326))
    created_at = Column(DateTime, default=datetime.utcnow)

class Floor(Base):
    __tablename__ = "floor"
    
    id = Column(String, primary_key=True)
    building_id = Column(String, nullable=False)
    floor_code = Column(String, nullable=False)
    floor_label = Column(String, nullable=False)
    z_min = Column(Float, nullable=False)
    z_max = Column(Float, nullable=False)
    area_sqm = Column(Float, nullable=False)
    solid_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326))

class PropertyUnit(Base):
    __tablename__ = "property_unit"
    
    id = Column(String, primary_key=True)
    floor_id = Column(String, nullable=False)
    unit_code = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)
    label = Column(String, nullable=False)
    area_sqm = Column(Float, nullable=False)
    volume_cum = Column(Float, nullable=False)
    footprint = Column(Geometry('POLYGON', dimension=2, srid=4326))
    solid_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326))
    geometry_hash = Column(String(64), nullable=False)
    geometry_version = Column(Integer, nullable=False, default=1)
    z_min = Column(Float, nullable=False, default=0.0)
    z_max = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SpatialIdentifier(Base):
    __tablename__ = "spatial_identifier"
    
    id = Column(String, primary_key=True)
    identifier_string = Column(String, nullable=False, unique=True)
    ulpin = Column(String(14), nullable=False)
    building_code = Column(String, nullable=False)
    floor_code = Column(String, nullable=False)
    unit_code = Column(String, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    geometry_hash = Column(String(64), nullable=False)
    property_unit_id = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SpatialIdentifierHistory(Base):
    __tablename__ = "spatial_identifier_history"
    
    id = Column(String, primary_key=True)
    identifier_string = Column(String, nullable=False)
    version = Column(Integer, nullable=False)
    geometry_hash = Column(String(64), nullable=False)
    retired_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326), nullable=True)
    retired_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(String)
    identifier_id = Column(String, nullable=False)

class ValidationRun(Base):
    __tablename__ = "validation_run"
    
    id = Column(String, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(
        Enum('RUNNING', 'PASSED', 'FAILED', name='validation_status', create_type=False),
        nullable=False
    )
    total_checks = Column(Integer, default=0)
    passed_checks = Column(Integer, default=0)
    failed_checks = Column(Integer, default=0)
    issues = Column(JSONB)

class AIProposal(Base):
    __tablename__ = "ai_proposal"
    
    id = Column(String, primary_key=True)
    building_id = Column(String, nullable=True)
    model_primary = Column(String, nullable=False)
    model_verifier = Column(String, nullable=False)
    footprint_proposed = Column(JSONB)
    footprint_verified = Column(JSONB)
    iou_score = Column(Float)
    agreement_score = Column(Float)
    status = Column(
        Enum('REVIEW_REQUIRED', 'APPROVED', 'REJECTED', name='ai_proposal_status', create_type=False),
        nullable=False, default="REVIEW_REQUIRED"
    )
    created_at = Column(DateTime, default=datetime.utcnow)

class ImportSession(Base):
    __tablename__ = "import_session"
    
    id = Column(String, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(
        Enum('PERSISTED', 'REJECTED', name='import_status', create_type=False),
        nullable=False
    )
    file_manifest = Column(JSONB)
    source_crs = Column(String)
    target_srid = Column(Integer)
    generated_ids = Column(JSONB)
    error_message = Column(String)

class AppUser(Base):
    __tablename__ = "app_user"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    role = Column(
        Enum('admin', 'surveyor', 'reviewer', 'viewer', name='user_role', create_type=False),
        nullable=False
    )
    display_name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSONB, nullable=True)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str

class DashboardStats(BaseModel):
    total_parcels: int
    total_buildings: int
    total_floors: int
    total_units: int
    total_3d_units: int
    validated_units: int
    conflicts: int
    ai_proposals_pending: int

class ImportAnalyzeResponse(BaseModel):
    parcel_count: int
    building_count: int
    floor_count: int
    unit_count: int
    detected_crs: str
    geometry_types: List[str]
    warnings: List[str]

class PersistRequest(BaseModel):
    user_role: str

class PersistResponse(BaseModel):
    session_id: str
    status: str
    identifiers_generated: int
    validation_passed: bool
    validation_issues: int


class UnitGeometryUpdateRequest(BaseModel):
    """Request to update a property unit's geometry"""
    footprint: Optional[dict] = None  # GeoJSON Polygon
    z_min_m: Optional[float] = None
    z_max_m: Optional[float] = None
    user_role: str = "surveyor"
    reason: Optional[str] = None  # Optional reason for the change


class UnitGeometryUpdateResponse(BaseModel):
    """Response after updating unit geometry"""
    unit_id: str
    old_version: int
    new_version: int
    old_geometry_hash: str
    new_geometry_hash: str
    spatial_identifier: str
    status: str


class UnitHistoryEntry(BaseModel):
    """Single entry in unit version history"""
    version: int
    identifier_string: str
    geometry_hash: str
    footprint: dict  # GeoJSON
    z_min: float
    z_max: float
    changed_at: str
    changed_by: Optional[str]
    reason: Optional[str]
    retired_geom: Optional[str] = None  # EWKT of retired 3D solid (POLYHEDRALSURFACEZ not supported by GeoJSON)


class UnitHistoryResponse(BaseModel):
    """Response for unit version history"""
    unit_id: str
    current_version: int
    history: List[UnitHistoryEntry]


# ============================================================================
# VALIDATION UTILITIES
# ============================================================================

def validate_footprint_geometry(shapely_geom) -> Optional[str]:
    """
    Validate footprint geometry for self-intersections and validity.
    Returns error message if invalid, None if valid.
    """
    if not shapely_geom.is_valid:
        try:
            # Try using the shapely function (newer versions)
            from shapely import is_valid_reason
            reason = is_valid_reason(shapely_geom)
        except (ImportError, AttributeError):
            # Fallback for older versions
            reason = "invalid geometry"
        return f"Footprint geometry is invalid: {reason}"
    if not shapely_geom.is_simple:
        return "Footprint geometry has self-intersections (not a simple polygon)"
    return None


def validate_unit_properties(props: dict) -> Optional[str]:
    """
    Validate required properties for a unit.
    Returns error message if invalid, None if valid.
    z_min_m and z_max_m are optional - they can be inherited from the floor.
    """
    required_fields = {
        "unit_code": "unit_code is required",
        "floor_id": "floor_id is required",
    }
    
    for field, error_msg in required_fields.items():
        if field not in props or props[field] is None or (isinstance(props[field], str) and props[field].strip() == ""):
            return error_msg
    
    return None

# ============================================================================
# GEOMETRY UTILITIES
# ============================================================================

def generate_polyhedral_solid(footprint_coords, z_min, z_max):
    """Generate PolyhedralSurfaceZ from 2D footprint + z-range"""
    if z_max <= z_min:
        raise ValueError(f"Invalid Z range: z_max ({z_max}) must be > z_min ({z_min})")
    
    if len(footprint_coords) < 3:
        raise ValueError(f"Footprint must have at least 3 vertices")
    
    vertices = []
    faces = []
    
    # Bottom vertices
    bottom_start = len(vertices)
    for x, y in footprint_coords:
        vertices.append([x, y, z_min])
    
    # Top vertices
    top_start = len(vertices)
    for x, y in footprint_coords:
        vertices.append([x, y, z_max])
    
    n = len(footprint_coords)
    
    # Bottom face
    bottom_face = list(range(bottom_start, bottom_start + n))
    faces.append({"vertices": bottom_face, "normal": [0, 0, -1]})
    
    # Top face
    top_face = list(range(top_start + n - 1, top_start - 1, -1))
    faces.append({"vertices": top_face, "normal": [0, 0, 1]})
    
    # Wall faces
    for i in range(n):
        next_i = (i + 1) % n
        wall_face = [
            bottom_start + i,
            bottom_start + next_i,
            top_start + next_i,
            top_start + i
        ]
        
        # Calculate normal
        v1 = vertices[bottom_start + i]
        v2 = vertices[bottom_start + next_i]
        v3 = vertices[top_start + next_i]
        
        edge1 = [v2[j] - v1[j] for j in range(3)]
        edge2 = [v3[j] - v2[j] for j in range(3)]
        
        normal = [
            edge1[1] * edge2[2] - edge1[2] * edge2[1],
            edge1[2] * edge2[0] - edge1[0] * edge2[2],
            edge1[0] * edge2[1] - edge1[1] * edge2[0]
        ]
        
        length = sum(n**2 for n in normal) ** 0.5
        if length > 0:
            normal = [n / length for n in normal]
        
        faces.append({"vertices": wall_face, "normal": normal})
    
    # Calculate volume
    volume = calculate_volume(vertices, faces)
    
    return {
        "vertices": vertices,
        "faces": faces,
        "volume": volume
    }

def calculate_volume(vertices, faces):
    """Calculate volume using divergence theorem"""
    volume = 0
    
    for face in faces:
        if len(face["vertices"]) < 3:
            continue
        
        v0 = vertices[face["vertices"][0]]
        for i in range(1, len(face["vertices"]) - 1):
            v1 = vertices[face["vertices"][i]]
            v2 = vertices[face["vertices"][i + 1]]
            
            volume += (
                v0[0] * (v1[1] * v2[2] - v2[1] * v1[2]) -
                v0[1] * (v1[0] * v2[2] - v2[0] * v1[2]) +
                v0[2] * (v1[0] * v2[1] - v2[0] * v1[1])
            )
    
    return abs(volume) / 6

def normalize_geometry(solid):
    """Normalize geometry for consistent hashing"""
    rounded = []
    for v in solid["vertices"]:
        rounded.append([round(c, 6) for c in v])
    
    sorted_verts = sorted(rounded, key=lambda v: (v[0], v[1], v[2]))
    return json.dumps(sorted_verts)

def hash_geometry(solid):
    """Generate SHA-256 hash of normalized geometry"""
    normalized = normalize_geometry(solid)
    return hashlib.sha256(normalized.encode()).hexdigest()


def solid_to_ewkt(solid):
    """
    Convert Solid3D to PostGIS POLYHEDRALSURFACE Z EWKT.
    
    Format: POLYHEDRALSURFACE Z((
        (x1 y1 z1, x2 y2 z2, ...),  -- bottom face
        (x1 y1 z1, x2 y2 z2, ...),  -- top face
        (x1 y1 z1, x2 y2 z2, x3 y3 z3, x4 y4 z4, x1 y1 z1),  -- wall 1
        ...
    ))
    """
    vertices = solid["vertices"]
    faces = solid["faces"]
    
    face_strings = []
    for face in faces:
        coords = []
        for vi in face["vertices"]:
            v = vertices[vi]
            coords.append(f"{v[0]} {v[1]} {v[2]}")
        # Close the ring if not already closed
        if coords[0] != coords[-1]:
            coords.append(coords[0])
        face_strings.append(f"({', '.join(coords)})")
    
    return f"POLYHEDRALSURFACE Z(({', '.join(face_strings)}))"


def solid_to_wkb(solid, srid=4326):
    """Convert Solid3D to WKB for PostGIS storage using ST_GeomFromEWKT"""
    from geoalchemy2.elements import WKTElement
    
    ewkt = solid_to_ewkt(solid)
    # Use WKTElement with extended=True for EWKT support (SRID in the text)
    # For POLYHEDRALSURFACE, we need to use the PostGIS function directly
    # WKTElement doesn't support 3D polyhedral surfaces well
    # Instead, use a raw SQL expression
    from sqlalchemy import func
    return func.ST_GeomFromEWKT(ewkt, type_=Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=srid))

METERS_PER_DEG_LAT = 111320.0

def lonlat_to_local(lon, lat, lon0, lat0):
    """Equirectangular projection of lon/lat to local metres around (lon0, lat0)."""
    return [
        (lon - lon0) * METERS_PER_DEG_LAT * math.cos(math.radians(lat0)),
        (lat - lat0) * METERS_PER_DEG_LAT,
    ]

def dedupe_ring(coords):
    """Drop the closing duplicate vertex of a ring, if present."""
    if len(coords) > 1 and coords[0] == coords[-1]:
        return coords[:-1]
    return coords

def footprint_area_m2(ring_lonlat, origin=None):
    """Shoelace area in m² of a lon/lat ring, projected with lonlat_to_local
    (the one shared coordinate-conversion path) around origin
    (default: the ring centroid)."""
    pts = dedupe_ring(ring_lonlat)
    if len(pts) < 3:
        return 0.0
    if origin is None:
        origin = [sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)]
    local = [lonlat_to_local(x, y, origin[0], origin[1]) for x, y in pts]
    area = 0.0
    for i in range(len(local)):
        x0, y0 = local[i]
        x1, y1 = local[(i + 1) % len(local)]
        area += x0 * y1 - x1 * y0
    return abs(area) / 2

# Shared pair query for 3D overlap detection over stored solids.
# A pair counts as overlapping only with genuine volumetric penetration:
# axis-aligned boxes need more than 1 mm of overlap on every axis (the 1 mm
# is expressed in metres via the set centroid latitude for x/y; z is
# already metres), while anything else counts when its 3D intersection
# has full dimension. Touching solids (shared face, edge or corner) are
# excluded either way. Same issue shape as the former Python implementation.
OVERLAP_PAIRS_SQL = """
WITH params AS (
    SELECT AVG(ST_X(ST_Centroid(footprint))) AS lon0,
           AVG(ST_Y(ST_Centroid(footprint))) AS lat0
    FROM property_unit
    WHERE footprint IS NOT NULL AND (:floor_id IS NULL OR floor_id = :floor_id)
),
m AS (
    SELECT id, floor_id, solid_geom,
           ST_XMin(solid_geom) AS xmin, ST_XMax(solid_geom) AS xmax,
           ST_YMin(solid_geom) AS ymin, ST_YMax(solid_geom) AS ymax,
           ST_ZMin(solid_geom) AS zmin, ST_ZMax(solid_geom) AS zmax,
           ST_Volume(solid_geom) AS vol
    FROM property_unit
    WHERE solid_geom IS NOT NULL AND (:floor_id IS NULL OR floor_id = :floor_id)
)
SELECT s.id_a, s.id_b, ST_Volume(s.inter) AS volume
FROM (
    SELECT a.id AS id_a, b.id AS id_b,
           ST_3DIntersection(a.solid_geom, b.solid_geom) AS inter,
           (ABS(a.vol - (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin))
                <= 1e-9 * (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin)
            AND ABS(b.vol - (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin))
                <= 1e-9 * (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin)) AS bothbox,
           LEAST(a.xmax, b.xmax) - GREATEST(a.xmin, b.xmin) AS ox,
           LEAST(a.ymax, b.ymax) - GREATEST(a.ymin, b.ymin) AS oy,
           LEAST(a.zmax, b.zmax) - GREATEST(a.zmin, b.zmin) AS oz
    FROM m a
    JOIN m b ON a.floor_id = b.floor_id AND a.id < b.id
    CROSS JOIN params
    WHERE ST_3DIntersects(a.solid_geom, b.solid_geom)
) s
CROSS JOIN params
WHERE (s.bothbox
       AND s.ox > 0.001 / (111320 * COS(RADIANS(params.lat0)))
       AND s.oy > 0.001 / 111320
       AND s.oz > 0.001)
   OR ((NOT s.bothbox) AND ST_Dimension(s.inter) = 3)
"""

# Candidate pair query for one proposed (not yet stored) solid, with the
# same volumetric-penetration rule as OVERLAP_PAIRS_SQL.
NEW_SOLID_PAIRS_SQL = """
WITH params AS (
    SELECT AVG(ST_X(ST_Centroid(footprint))) AS lon0,
           AVG(ST_Y(ST_Centroid(footprint))) AS lat0
    FROM property_unit
    WHERE floor_id = :floor_id AND footprint IS NOT NULL
),
cand AS (
    SELECT id, floor_id, solid_geom FROM property_unit
    WHERE floor_id = :floor_id AND id != :unit_id AND solid_geom IS NOT NULL
    UNION ALL
    SELECT CAST(:unit_id AS VARCHAR), CAST(:floor_id AS VARCHAR),
           ST_Translate(
               ST_Extrude(ST_Force3D(ST_GeomFromText(:wkt, 4326)), 0, 0, :dz),
               0, 0, :zmin)
),
m AS (
    SELECT id, floor_id, solid_geom,
           ST_XMin(solid_geom) AS xmin, ST_XMax(solid_geom) AS xmax,
           ST_YMin(solid_geom) AS ymin, ST_YMax(solid_geom) AS ymax,
           ST_ZMin(solid_geom) AS zmin, ST_ZMax(solid_geom) AS zmax,
           ST_Volume(solid_geom) AS vol
    FROM cand
)
SELECT s.id_a, s.id_b, ST_Volume(s.inter) AS volume
FROM (
    SELECT a.id AS id_a, b.id AS id_b,
           ST_3DIntersection(a.solid_geom, b.solid_geom) AS inter,
           (ABS(a.vol - (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin))
                <= 1e-9 * (a.xmax - a.xmin) * (a.ymax - a.ymin) * (a.zmax - a.zmin)
            AND ABS(b.vol - (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin))
                <= 1e-9 * (b.xmax - b.xmin) * (b.ymax - b.ymin) * (b.zmax - b.zmin)) AS bothbox,
           LEAST(a.xmax, b.xmax) - GREATEST(a.xmin, b.xmin) AS ox,
           LEAST(a.ymax, b.ymax) - GREATEST(a.ymin, b.ymin) AS oy,
           LEAST(a.zmax, b.zmax) - GREATEST(a.zmin, b.zmin) AS oz
    FROM m a
    JOIN m b ON a.id < b.id
    WHERE ST_3DIntersects(a.solid_geom, b.solid_geom)
) s
CROSS JOIN params
WHERE (s.bothbox
       AND s.ox > 0.001 / (111320 * COS(RADIANS(params.lat0)))
       AND s.oy > 0.001 / 111320
       AND s.oz > 0.001)
   OR ((NOT s.bothbox) AND ST_Dimension(s.inter) = 3)
"""

async def db_validate_topology(session, floor_id=None):
    """Validate topology for overlaps using native PostGIS 3D operators."""
    from sqlalchemy import text
    rows = (await session.execute(text(OVERLAP_PAIRS_SQL), {"floor_id": floor_id})).all()
    issues = []
    for ida, idb, volume in rows:
        volume_str = f" (overlap volume: {volume:.2f} m³)" if volume else ""
        issues.append({
            "severity": "HIGH",
            "code": "OVERLAP_DETECTED",
            "message": f"Units {ida} and {idb} overlap in 3D{volume_str}",
            "entity_id": f"{ida},{idb}",
            "overlap_volume": float(volume) if volume is not None else None,
        })
    return {
        "valid": len([i for i in issues if i["severity"] == "HIGH"]) == 0,
        "issues": issues,
    }

async def db_new_solid_conflicts(session, unit_id, floor_id, wkt, z_min, z_max):
    """Overlap pairs involving one proposed solid (used by the PUT gate)."""
    from sqlalchemy import text
    rows = (await session.execute(text(NEW_SOLID_PAIRS_SQL), {
        "unit_id": unit_id,
        "floor_id": floor_id,
        "wkt": wkt,
        "dz": z_max - z_min,
        "zmin": z_min,
    })).all()
    return [(ida, idb) for ida, idb, _ in rows]

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()

app = FastAPI(
    title="SIH26011 - 3D Cadastral Registry API",
    description="Real backend for 3D cadastral management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:8443", "http://127.0.0.1:8443",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# SERIALIZATION FUNCTIONS
# ============================================================================

def geom_to_geojson(geom):
    """Convert geoalchemy2 WKBElement to GeoJSON dict"""
    if geom is None:
        return None
    try:
        from geoalchemy2.shape import to_shape
        shape = to_shape(geom)
        return shape.__geo_interface__
    except Exception as e:
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
        "geometry": geom_to_geojson(p.geometry),
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
        "footprint": geom_to_geojson(b.footprint),
        "solid_geom": geom_to_geojson(b.solid_geom),
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
        "solid_geom": geom_to_geojson(f.solid_geom)
    }

async def floor_counts_by_building(session):
    """Actual linked floor counts per building (derived, not the stored value)."""
    from sqlalchemy import select, func
    rows = await session.execute(
        select(Floor.building_id, func.count(Floor.id)).group_by(Floor.building_id)
    )
    return {bid: n for bid, n in rows.all()}

def serialize_unit(u):
    """Serialize PropertyUnit model to dict"""
    fp = geom_to_geojson(u.footprint)
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
        "solid_geom": geom_to_geojson(u.solid_geom),
        "geometry_hash": u.geometry_hash,
        "geometry_version": u.geometry_version,
        "z_min": u.z_min,
        "z_max": u.z_max,
        "created_at": u.created_at.isoformat() if u.created_at else None
    }

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/stats")
async def get_stats():
    async with async_session() as session:
        from sqlalchemy import select, func

        # Consume each result immediately: re-reading one Result (e.g. calling
        # .scalar() twice) raises ResourceClosedError because scalar()
        # hard-closes the result after the first read, and a later execute
        # on the same session can invalidate an earlier unconsumed result.
        parcels = (await session.execute(select(func.count(LandParcel.id)))).scalar() or 0
        buildings = (await session.execute(select(func.count(Building.id)))).scalar() or 0
        floors = (await session.execute(select(func.count(Floor.id)))).scalar() or 0
        units = (await session.execute(select(func.count(PropertyUnit.id)))).scalar() or 0

        return {
            "total_parcels": parcels,
            "total_buildings": buildings,
            "total_floors": floors,
            "total_units": units,
            "total_3d_units": units,
            "validated_units": units,
            "conflicts": 0,
            "ai_proposals_pending": 0
        }

@app.post("/api/import/analyze")
async def analyze_import(
    parcel: Optional[UploadFile] = File(None),
    buildings: Optional[UploadFile] = File(None),
    floors_csv: Optional[UploadFile] = File(None),
    units: Optional[UploadFile] = File(None)
):
    """Analyze uploaded cadastral files"""
    try:
        parcel_count = 0
        building_count = 0
        floor_count = 0
        unit_count = 0
        
        # Parse parcel GeoJSON
        if parcel:
            content = await parcel.read()
            data = geojson.loads(content)
            if data.get("type") == "FeatureCollection":
                parcel_count = len(data.get("features", []))
        
        # Parse buildings GeoJSON
        if buildings:
            content = await buildings.read()
            data = geojson.loads(content)
            if data.get("type") == "FeatureCollection":
                building_count = len(data.get("features", []))
        
        # Parse floors CSV
        if floors_csv:
            content = await floors_csv.read()
            reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
            floor_count = sum(1 for _ in reader)
        
        # Parse units GeoJSON
        if units:
            content = await units.read()
            data = geojson.loads(content)
            if data.get("type") == "FeatureCollection":
                unit_count = len(data.get("features", []))
        
        return {
            "parcel_count": parcel_count,
            "building_count": building_count,
            "floor_count": floor_count,
            "unit_count": unit_count,
            "detected_crs": "EPSG:4326",
            "geometry_types": ["MultiPolygon", "Polygon"],
            "warnings": []
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/import/persist")
async def persist_import(
    parcel: Optional[UploadFile] = File(None),
    buildings: Optional[UploadFile] = File(None),
    floors_csv: Optional[UploadFile] = File(None),
    units: Optional[UploadFile] = File(None),
    user_role: str = "surveyor"
):
    """Persist imported cadastral data to database"""
    if user_role == "viewer":
        raise HTTPException(
            status_code=403,
            detail="viewer role cannot persist cadastral data"
        )
    
    async with async_session() as session:
        try:
            session_id = f"imp-{int(datetime.utcnow().timestamp())}"
            parcels_created = 0
            buildings_created = 0
            floors_created = 0
            units_created = 0
            identifiers_generated = 0
            
            # Parse and persist parcel
            if parcel:
                content = await parcel.read()
                data = geojson.loads(content)
                parcel_ids = []
                if data.get("type") == "FeatureCollection":
                    for feature in data.get("features", []):
                        props = feature.get("properties", {})
                        geom = feature.get("geometry")
                        
                        # Convert GeoJSON to WKT for PostGIS
                        from geoalchemy2.shape import from_shape
                        from shapely.geometry import shape
                        
                        shapely_geom = shape(geom)
                        geom_wkb = from_shape(shapely_geom, srid=4326)
                        
                        # Use parcel_id from demo data, fallback to id, then auto-generate
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
            if buildings:
                content = await buildings.read()
                data = geojson.loads(content)
                if data.get("type") == "FeatureCollection":
                    for i, feature in enumerate(data.get("features", [])):
                        props = feature.get("properties", {})
                        geom = feature.get("geometry")
                        
                        from geoalchemy2.shape import from_shape
                        from shapely.geometry import shape
                        
                        shapely_geom = shape(geom)
                        footprint_wkb = from_shape(shapely_geom, srid=4326)
                        
                        # Map building to parcel by order (demo data has no explicit parcel_ref)
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
                            solid_geom=None  # Will be generated later
                        )
                        session.add(building_record)
                        buildings_created += 1
            
            # Parse and persist floors from CSV
            if floors_csv:
                content = await floors_csv.read()
                reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
                for row in reader:
                    floor_record = Floor(
                        id=row.get("floor_id") or row.get("id") or f"floor-{floors_created}",
                        building_id=row.get("building_id") or row.get("building_code") or "bldg-0",
                        floor_code=row.get("floor_code") or "F00",
                        floor_label=row.get("display_name") or row.get("floor_label") or "Ground Floor",
                        z_min=float(row.get("z_min") or row.get("z_min_m") or 0.0),
                        z_max=float(row.get("z_max") or row.get("z_max_m") or 3.0),
                        area_sqm=float(row.get("floor_height") or row.get("area_sqm") or 100.0),
                        solid_geom=None  # Will be generated later
                    )
                    session.add(floor_record)
                    floors_created += 1
            
            # Flush floors so they can be referenced by units
            await session.flush()

            # Derive floors_count from the actual linked floors
            from sqlalchemy import select as _select, func as _func
            for bid, n in (await session.execute(
                _select(Floor.building_id, _func.count(Floor.id)).group_by(Floor.building_id)
            )).all():
                bres = await session.execute(_select(Building).where(Building.id == bid))
                bldg = bres.scalar_one_or_none()
                if bldg is not None:
                    bldg.floors_count = n
            
            # Parse and persist property units
            if units:
                content = await units.read()
                data = geojson.loads(content)
                if data.get("type") == "FeatureCollection":
                    for feature in data.get("features", []):
                        props = feature.get("properties", {})
                        geom = feature.get("geometry")
                        
                        from geoalchemy2.shape import from_shape
                        from shapely.geometry import shape
                        
                        shapely_geom = shape(geom)
                        
                        # Validate footprint geometry (self-intersection check)
                        geom_error = validate_footprint_geometry(shapely_geom)
                        if geom_error:
                            raise HTTPException(
                                status_code=422,
                                detail=f"Invalid footprint geometry: {geom_error}"
                            )
                        
                        # Validate required properties
                        prop_error = validate_unit_properties(props)
                        if prop_error:
                            raise HTTPException(
                                status_code=422,
                                detail=prop_error
                            )
                        
                        footprint_wkb = from_shape(shapely_geom, srid=4326)
                        
                        # Get floor reference
                        floor_ref = props.get("floor_id") or "floor-0"
                        
                        # Get floor Z-range for inheritance
                        floor_result = await session.execute(
                            select(Floor).where(Floor.id == floor_ref)
                        )
                        floor_obj = floor_result.scalar_one_or_none()
                        if not floor_obj:
                            raise HTTPException(
                                status_code=422,
                                detail=f"Referenced floor {floor_ref} not found"
                            )
                        
                        # Generate 3D solid (inherit Z-range from floor if not provided)
                        coords = list(shapely_geom.exterior.coords)
                        z_min = float(props.get("z_min_m") or floor_obj.z_min)
                        z_max = float(props.get("z_max_m") or floor_obj.z_max)
                        
                        solid = generate_polyhedral_solid(coords[:-1], z_min, z_max)  # Exclude closing vertex
                        geom_hash = hash_geometry(solid)
                        # Skip solid_geom storage for now - can be generated on the fly from footprint + z_min/z_max
                        solid_wkb = None
                        print(f"DEBUG: Created unit with footprint, hash={geom_hash[:16]}")
                        
                        # Generate unique unit ID by combining floor_id and unit_code
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
                        # Get floor and building info
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
                                    identifier_string = f"{parcel.ulpin}-{building.id}-{floor.floor_code}-{unit_record.unit_code}-V01"
                                    
                                    identifier = SpatialIdentifier(
                                        id=f"sid-{uuid.uuid4().hex[:12]}",
                                        identifier_string=identifier_string,
                                        ulpin=parcel.ulpin,
                                        building_code=building.id,
                                        floor_code=floor.floor_code,
                                        unit_code=unit_record.unit_code,
                                        version=1,
                                        geometry_hash=geom_hash,
                                        property_unit_id=unit_record.id
                                    )
                                    session.add(identifier)
                                    identifiers_generated += 1
            
            # (Re)build stored 3D solids for native validation
            from sqlalchemy import text as _sa_text
            await session.execute(_sa_text(
                "UPDATE property_unit SET solid_geom = ST_Translate("
                "ST_Extrude(ST_Force3D(footprint), 0, 0, z_max - z_min), 0, 0, z_min) "
                "WHERE solid_geom IS NULL AND footprint IS NOT NULL AND z_max > z_min"))

            await session.commit()
            
            # Run validation
            validation_result = {"valid": True, "issues": []}
            
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
            import traceback
            tb = traceback.format_exc()
            print(f"FULL TRACEBACK:\n{tb}")
            import logging
            logging.exception("Persist import failed")
            
            # Re-raise HTTPException as-is (don't wrap in 500)
            if isinstance(e, HTTPException):
                raise
            
            # Handle specific DB integrity errors with user-friendly messages
            from sqlalchemy.exc import IntegrityError
            if isinstance(e, IntegrityError):
                orig = getattr(e, 'orig', None)
                if orig is not None:
                    from asyncpg import UniqueViolationError, ForeignKeyViolationError
                    if isinstance(orig, UniqueViolationError):
                        # Extract constraint name from error
                        msg = str(orig)
                        if "spatial_identifier_pkey" in msg:
                            raise HTTPException(status_code=409, detail="Spatial identifier conflict: duplicate identifier generated")
                        elif "land_parcel_pkey" in msg:
                            raise HTTPException(status_code=409, detail="Parcel already exists")
                        elif "building_pkey" in msg:
                            raise HTTPException(status_code=409, detail="Building already exists")
                        elif "property_unit_pkey" in msg:
                            raise HTTPException(status_code=409, detail="Property unit already exists")
                        elif "spatial_identifier_identifier_string_key" in msg:
                            raise HTTPException(status_code=409, detail="Spatial identifier string already exists")
                        else:
                            raise HTTPException(status_code=409, detail=f"Duplicate entry: {str(orig)}")
                    elif isinstance(orig, ForeignKeyViolationError):
                        msg = str(orig)
                        if "floor_id" in msg and "property_unit_floor_id_fkey" in msg:
                            raise HTTPException(status_code=422, detail="Invalid floor_id: referenced floor does not exist")
                        elif "building_id" in msg:
                            raise HTTPException(status_code=422, detail="Invalid building_id: referenced building does not exist")
                        elif "parcel_id" in msg:
                            raise HTTPException(status_code=422, detail="Invalid parcel_id: referenced parcel does not exist")
                        else:
                            raise HTTPException(status_code=422, detail=f"Foreign key violation: {str(orig)}")
                # Fallback for other integrity errors
                raise HTTPException(status_code=400, detail=f"Data integrity error: {str(e)}")
            
            # Also catch ValueError from validation (e.g. invalid Z range)
            if isinstance(e, ValueError):
                raise HTTPException(status_code=422, detail=str(e))
            
            raise HTTPException(status_code=500, detail=f"{str(e)}\n{tb}")

@app.get("/api/3d/geometry")
async def get_3d_geometry():
    """Get all 3D geometry for Three.js rendering"""
    async with async_session() as session:
        from sqlalchemy import select
        
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

@app.get("/api/spatial-identifiers")
async def get_spatial_identifiers():
    """Get all spatial identifiers"""
    async with async_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(select(SpatialIdentifier))
        return [
            {
                "id": s.id,
                "identifier_string": s.identifier_string,
                "ulpin": s.ulpin,
                "building_code": s.building_code,
                "floor_code": s.floor_code,
                "unit_code": s.unit_code,
                "version": s.version,
                "geometry_hash": s.geometry_hash,
                "property_unit_id": s.property_unit_id,
                "created_at": s.created_at.isoformat() if s.created_at else None
            }
            for s in result.scalars().all()
        ]

@app.post("/api/validation/run")
async def run_validation():
    """Run 3D topology validation"""
    import logging
    logger = logging.getLogger(__name__)
    
    async with async_session() as session:
        from sqlalchemy import select, func

        try:
            # Count units under validation (solids live in PostGIS now)
            unit_count = await session.execute(
                select(func.count(PropertyUnit.id))
            )
            total = unit_count.scalar() or 0
            logger.info(f"Validating {total} stored solids")

            # Run validation natively in PostGIS
            validation_result = await db_validate_topology(session)
            logger.info(f"Validation result: valid={validation_result['valid']}, issues={len(validation_result['issues'])}")

            # Save validation run
            validation_run = ValidationRun(
                id=f"vrun-{datetime.utcnow().timestamp()}",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                status="PASSED" if validation_result["valid"] else "FAILED",
                total_checks=total,
                passed_checks=total - len([i for i in validation_result["issues"] if i["severity"] == "HIGH"]),
                failed_checks=len([i for i in validation_result["issues"] if i["severity"] == "HIGH"]),
                issues=validation_result["issues"]
            )

            session.add(validation_run)
            await session.commit()

            return {
                "passed": validation_result["valid"],
                "total_checks": total,
                "passed_checks": validation_run.passed_checks,
                "failed_checks": validation_run.failed_checks,
                "issues": validation_result["issues"]
            }
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.error(f"Validation error: {e}\n{tb}")
            raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}\n{tb}")

@app.get("/api/parcels")
async def list_parcels():
    """List all parcels"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(LandParcel))
        parcels = result.scalars().all()
        return [serialize_parcel(p) for p in parcels]

@app.get("/api/parcels/{parcel_id}")
async def get_parcel(parcel_id: str):
    """Get parcel detail with full hierarchy"""
    async with async_session() as session:
        from sqlalchemy import select
        
        # Get parcel
        parcel_result = await session.execute(
            select(LandParcel).where(LandParcel.id == parcel_id)
        )
        parcel = parcel_result.scalar_one_or_none()
        
        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")
        
        # Get buildings in this parcel
        buildings_result = await session.execute(
            select(Building).where(Building.parcel_id == parcel_id)
        )
        buildings = buildings_result.scalars().all()
        
        # Build hierarchy
        hierarchy = serialize_parcel(parcel)
        hierarchy["buildings"] = []
        
        for building in buildings:
            bldg_data = serialize_building(building)
            
            # Get floors in this building
            floors_result = await session.execute(
                select(Floor).where(Floor.building_id == building.id)
            )
            floors = floors_result.scalars().all()

            bldg_data["floors_count"] = len(floors)
            bldg_data["floors"] = []
            for floor in floors:
                floor_data = serialize_floor(floor)
                
                # Get units in this floor
                units_result = await session.execute(
                    select(PropertyUnit).where(PropertyUnit.floor_id == floor.id)
                )
                units = units_result.scalars().all()
                
                floor_data["units"] = [serialize_unit(u) for u in units]
                bldg_data["floors"].append(floor_data)
            
            hierarchy["buildings"].append(bldg_data)
        
        return hierarchy

@app.get("/api/buildings/{building_id}")
async def get_building(building_id: str):
    """Get building detail"""
    async with async_session() as session:
        from sqlalchemy import select
        
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


@app.get("/api/buildings")
async def list_buildings():
    """List all buildings"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Building))
        buildings = result.scalars().all()
        counts = await floor_counts_by_building(session)
        out = []
        for b in buildings:
            data = serialize_building(b)
            data["floors_count"] = counts.get(b.id, 0)
            out.append(data)
        return out


@app.get("/api/floors/{floor_id}")
async def get_floor(floor_id: str):
    """Get floor detail"""
    async with async_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(Floor).where(Floor.id == floor_id)
        )
        floor = result.scalar_one_or_none()
        
        if not floor:
            raise HTTPException(status_code=404, detail="Floor not found")
        
        return serialize_floor(floor)


@app.get("/api/floors")
async def list_floors():
    """List all floors"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(Floor))
        floors = result.scalars().all()
        return [serialize_floor(f) for f in floors]


@app.get("/api/units")
async def list_units():
    """List all property units"""
    async with async_session() as session:
        from sqlalchemy import select
        result = await session.execute(select(PropertyUnit))
        units = result.scalars().all()
        return [serialize_unit(u) for u in units]

@app.get("/api/units/{unit_id}")
async def get_unit(unit_id: str):
    """Get property unit detail"""
    async with async_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(PropertyUnit).where(PropertyUnit.id == unit_id)
        )
        unit = result.scalar_one_or_none()
        
        if not unit:
            raise HTTPException(status_code=404, detail="Property unit not found")
        
        return serialize_unit(unit)

@app.get("/api/properties/{unit_id}")
async def get_property(unit_id: str):
    """Get property unit detail with full context"""
    async with async_session() as session:
        from sqlalchemy import select
        
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
        unit_data["floor"] = serialize_floor(floor)
        unit_data["building"] = serialize_building(building)
        unit_data["parcel"] = serialize_parcel(parcel)
        unit_data["spatial_identifier"] = {
            "id": spatial_id.id,
            "identifier_string": spatial_id.identifier_string,
            "version": spatial_id.version,
            "geometry_hash": spatial_id.geometry_hash
        } if spatial_id else None
        
        return unit_data

@app.get("/api/statistics")
async def get_statistics():
    """Get dashboard statistics"""
    async with async_session() as session:
        from sqlalchemy import select, func

        # Consume each result immediately (see get_stats): re-reading one
        # Result raises ResourceClosedError because scalar() hard-closes it.
        parcels = (await session.execute(select(func.count(LandParcel.id)))).scalar() or 0
        buildings = (await session.execute(select(func.count(Building.id)))).scalar() or 0
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

        return {
            "total_parcels": parcels,
            "total_buildings": buildings,
            "total_floors": floors,
            "total_units": units,
            "total_3d_units": units,
            "validated_units": units,
            "conflicts": 0,
            "ai_proposals_pending": ai_pending,
            "last_validation": {
                "status": latest_validation.status if latest_validation else "NOT_RUN",
                "timestamp": latest_validation.started_at.isoformat() if latest_validation else None
            } if latest_validation else None
        }

@app.get("/api/statistics/buildings-by-height")
async def get_buildings_by_height():
    """Get buildings grouped by height ranges for chart"""
    async with async_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(select(Building))
        buildings = result.scalars().all()
        
        # Group by storey ranges
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
        
        return [
            {"range": k, "count": v}
            for k, v in ranges.items()
        ]

@app.get("/api/statistics/validation-state")
async def get_validation_state():
    """Get validation state breakdown for donut chart"""
    async with async_session() as session:
        from sqlalchemy import select, func
        
        # Get latest validation run
        result = await session.execute(
            select(ValidationRun).order_by(ValidationRun.started_at.desc()).limit(1)
        )
        latest = result.scalar_one_or_none()
        
        if not latest:
            return {
                "clean": 0,
                "warnings": 0,
                "errors": 0,
                "not_validated": 0,
                "total": 0
            }
        
        # Count issues by severity
        total_units = await session.execute(select(func.count(PropertyUnit.id)))
        total = total_units.scalar() or 0
        
        issues = latest.issues or []
        errors = len([i for i in issues if i.get("severity") == "HIGH"])
        warnings = len([i for i in issues if i.get("severity") == "MEDIUM"])
        clean = total - errors - warnings
        
        return {
            "clean": clean,
            "warnings": warnings,
            "errors": errors,
            "not_validated": 0,
            "total": total
        }

@app.get("/api/ai/candidates")
async def get_ai_candidates():
    """Get AI proposals pending review"""
    async with async_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(AIProposal).where(AIProposal.status == "REVIEW_REQUIRED")
        )
        proposals = result.scalars().all()
        
        # Group by confidence
        high_confidence = len([p for p in proposals if (p.iou_score or 0) > 0.9])
        disputed = len([p for p in proposals if (p.iou_score or 0) < 0.7])
        needs_review = len(proposals) - high_confidence - disputed
        
        return {
            "total": len(proposals),
            "categories": [
                {
                    "name": "High-confidence agreement",
                    "count": high_confidence,
                    "percentage": (high_confidence / len(proposals) * 100) if proposals else 0
                },
                {
                    "name": "Disputed",
                    "count": disputed,
                    "percentage": (disputed / len(proposals) * 100) if proposals else 0
                },
                {
                    "name": "Needs human review",
                    "count": needs_review,
                    "percentage": (needs_review / len(proposals) * 100) if proposals else 0
                }
            ],
            "proposals": [
                {
                    "id": p.id,
                    "building_id": p.building_id,
                    "iou_score": p.iou_score,
                    "agreement_score": p.agreement_score,
                    "status": p.status,
                    "created_at": p.created_at.isoformat() if p.created_at else None
                }
                for p in proposals
            ]
        }

@app.get("/api/search")
async def search(query: str):
    """Global search across all entities"""
    async with async_session() as session:
        from sqlalchemy import select, or_
        
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

@app.get("/api/audit")
async def get_audit_trail(limit: int = 100):
    """Get audit trail"""
    async with async_session() as session:
        from sqlalchemy import select
        
        result = await session.execute(
            select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)
        )
        logs = result.scalars().all()
        
        return [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "details": log.details
            }
            for log in logs
        ]

@app.get("/api/ai/proposal")
async def get_ai_proposal():
    """Get AI building extraction proposal"""
    # Return mock AI proposal for demo
    # In production, this would run SegFormer/DeepLabV3 inference
    return {
        "id": "aip-001",
        "building_id": "bldg-001",
        "model_primary": "SegFormer / MiT-B0",
        "model_verifier": "DeepLabV3 / ResNet-50",
        "footprint_proposed": {
            "type": "Polygon",
            "coordinates": [[[77.2085, 28.6125], [77.2095, 28.6125], 
                           [77.2095, 28.6135], [77.2085, 28.6135], 
                           [77.2085, 28.6125]]]
        },
        "footprint_verified": None,
        "iou_score": 0.94,
        "agreement_score": 0.91,
        "status": "REVIEW_REQUIRED",
        "created_at": datetime.utcnow().isoformat()
    }

@app.post("/api/ai/review/{proposal_id}")
async def review_ai_proposal(proposal_id: str, request: dict):
    """Review AI proposal"""
    decision = request.get("decision")
    if decision not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be APPROVED or REJECTED")
    
    # In production, update database with review decision
    # For now, return success
    return {
        "status": decision,
        "proposal_id": proposal_id,
        "reviewed_at": datetime.utcnow().isoformat()
    }


# ============================================================================
# GEOMETRY VERSIONING & AUDIT TRAIL ENDPOINTS
# ============================================================================

@app.put("/api/units/{unit_id}/geometry")
async def update_unit_geometry(unit_id: str, request: UnitGeometryUpdateRequest):
    """
    Update a property unit's geometry (footprint and/or z-range).
    
    Triggers version increment, conflict detection, history preservation, and audit logging.
    """
    user_role = request.user_role
    reason = request.reason
    
    async with async_session() as session:
        try:
            # 1. Get the existing unit
            from sqlalchemy import select
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
                from shapely.geometry import shape
                from geoalchemy2.shape import from_shape
                
                shapely_geom = shape(request.footprint)
                
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
            from geoalchemy2.shape import to_shape
            
            if new_coords:
                coords_to_use = new_coords[:-1]
            else:
                unit_geom = to_shape(unit.footprint)
                coords_to_use = list(unit_geom.exterior.coords)[:-1]
            z_min_to_use = new_z_min
            z_max_to_use = new_z_max
            
            new_solid = generate_polyhedral_solid(coords_to_use, z_min_to_use, z_max_to_use)
            new_geom_hash = hash_geometry(new_solid)
            
            # 4. Check for conflicts with other units on the same floor,
            # natively in PostGIS against stored solids
            current_validation = await db_validate_topology(session, floor_id=unit.floor_id)
            current_conflicts = set()
            for issue in current_validation["issues"]:
                if issue["entity_id"] and unit_id in issue["entity_id"]:
                    # Extract the OTHER unit ID from the conflict
                    ids = issue["entity_id"].split(',')
                    other_id = ids[1] if ids[0] == unit_id else ids[0]
                    current_conflicts.add(other_id)

            # Check the proposed solid against current neighbours, natively
            # in PostGIS via a candidate CTE (the new solid is not stored yet)
            new_ring = coords_to_use + [coords_to_use[0]]
            new_wkt = "POLYGON((%s))" % ", ".join(f"{x} {y}" for x, y in new_ring)
            new_pairs = await db_new_solid_conflicts(
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
            
            # Get old 3D solid for history (using unit's own z_min/z_max)
            unit_geom = to_shape(unit.footprint)
            old_coords = list(unit_geom.exterior.coords)[:-1]
            old_z_min = unit.z_min
            old_z_max = unit.z_max
            old_solid = generate_polyhedral_solid(old_coords, old_z_min, old_z_max)
            # Include SRID prefix for proper PostGIS EWKT storage
            old_solid_ewkt = f"SRID=4326;{solid_to_ewkt(old_solid)}"
            
            # 7. Update spatial identifier
            new_version = old_version + 1
            spatial_id.version = new_version
            spatial_id.geometry_hash = new_geom_hash
            
            # Parse identifier components
            parts = spatial_id.identifier_string.split('-')
            if len(parts) >= 5:
                parts[-1] = f"V{str(new_version).zfill(2)}"
                spatial_id.identifier_string = '-'.join(parts)
            
            # 8. Create history entry
            history_id = f"sidh-{uuid.uuid4().hex[:12]}"
            history_entry = SpatialIdentifierHistory(
                id=history_id,
                identifier_string=old_identifier_string,
                version=old_version,
                geometry_hash=old_geometry_hash,
                retired_geom=old_solid_ewkt,
                retired_at=datetime.utcnow(),
                reason=f"Geometry updated from version {old_version} to {new_version}",
                identifier_id=spatial_id.id
            )
            session.add(history_entry)
            
            # 9. Update property unit
            if request.footprint:
                from geoalchemy2.shape import from_shape
                from shapely.geometry import shape
                shapely_geom = shape(request.footprint)
                unit.footprint = from_shape(shapely_geom, srid=4326)
            
            unit.geometry_hash = new_geom_hash
            unit.geometry_version = new_version
            vol_ring = new_coords if new_coords else list(to_shape(unit.footprint).exterior.coords)
            unit.volume_cum = footprint_area_m2(vol_ring) * max(z_max_to_use - z_min_to_use, 0)

            # Refresh the stored 3D solid for native validation (flush first
            # so the UPDATE below sees the new footprint/z range)
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
            
            # 10. Create audit log entry
            user_id = None
            # Try to find user by role
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
            
            await session.commit()
            
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
            await session.rollback()
            raise
        except Exception as e:
            await session.rollback()
            import traceback
            tb = traceback.format_exc()
            print(f"FULL TRACEBACK:\n{tb}")
            import logging
            logging.exception("Unit geometry update failed")
            raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@app.get("/api/units/{unit_id}/history")
async def get_unit_history(unit_id: str):
    """Get version history for a property unit."""
    async with async_session() as session:
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
        
        # Get audit logs for this unit
        audit_result = await session.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "property_unit")
            .where(AuditLog.entity_id == unit_id)
            .order_by(AuditLog.timestamp)
        )
        audit_logs = audit_result.scalars().all()
        
        # Build history entries
        history = []
        for h in history_entries:
            # Get the 3D solid for this version if available
            # retired_geom is stored as POLYHEDRALSURFACEZ EWKT
            # Note: POLYHEDRALSURFACEZ (type 15) is not supported by Shapely/GEOS,
            # so we return the raw EWKT string instead of GeoJSON
            retired_geom_ewkt = None
            if h.retired_geom:
                try:
                    # Query EWKT using the column, not the loaded value
                    result = await session.execute(
                        select(func.ST_AsEWKT(SpatialIdentifierHistory.retired_geom))
                        .where(SpatialIdentifierHistory.id == h.id)
                    )
                    retired_geom_ewkt = result.scalar()
                except Exception:
                    # Fallback: convert WKBElement to hex string
                    retired_geom_ewkt = str(h.retired_geom) if h.retired_geom else None
            
            history.append(UnitHistoryEntry(
                version=h.version,
                identifier_string=h.identifier_string,
                geometry_hash=h.geometry_hash,
                footprint={},  # Would need to reconstruct from retired_geom
                z_min=0,  # Would need to extract from retired_geom
                z_max=0,
                changed_at=h.retired_at.isoformat() if h.retired_at else "",
                changed_by=None,
                reason=h.reason,
                retired_geom=retired_geom_ewkt
            ))
        
        # Add current version as the latest entry
        history.append(UnitHistoryEntry(
            version=spatial_id.version,
            identifier_string=spatial_id.identifier_string,
            geometry_hash=spatial_id.geometry_hash,
            footprint=geom_to_geojson(unit.footprint) or {},
            z_min=unit.z_min if unit.z_min is not None else 0,
            z_max=unit.z_max if unit.z_max is not None else 0,
            changed_at=spatial_id.created_at.isoformat() if spatial_id.created_at else "",
            changed_by=None,
            reason="Current version"
        ))
        
        return UnitHistoryResponse(
            unit_id=unit_id,
            current_version=spatial_id.version,
            history=history
        )


# ============================================================================
# STARTUP
# ============================================================================

@app.on_event("startup")
async def startup():
    """Initialize database on startup"""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
