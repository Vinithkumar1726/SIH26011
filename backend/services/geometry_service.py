"""
SIH26011 - Geometry Service
Extracts all geometry algorithms from app.py
"""
import json
import math
import hashlib
from typing import List, Dict, Any, Optional
from sqlalchemy import func, text


# Constants
METERS_PER_DEG_LAT = 111320.0


def generate_polyhedral_solid(footprint_coords: List[List[float]], z_min: float, z_max: float) -> Dict[str, Any]:
    """Generate PolyhedralSurfaceZ from 2D footprint + z-range.
    
    Uses raw lon/lat for vertex positions (PostGIS expects EPSG:4326),
    but calculates volume in real m³ via equirectangular projection.
    """
    if z_max <= z_min:
        raise ValueError(f"Invalid Z range: z_max ({z_max}) must be > z_min ({z_min})")
    
    if len(footprint_coords) < 3:
        raise ValueError(f"Footprint must have at least 3 vertices")
    
    vertices = []
    faces = []
    
    # Bottom vertices (keep lon/lat for PostGIS)
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
        
        # Calculate normal using raw lon/lat
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
    
    # Calculate volume in REAL cubic metres (not degree³)
    # Use equirectangular projection around the footprint centroid
    origin = [sum(p[0] for p in footprint_coords) / len(footprint_coords),
              sum(p[1] for p in footprint_coords) / len(footprint_coords)]
    volume_m3 = calculate_volume_m3(footprint_coords, z_min, z_max, origin)
    
    return {
        "vertices": vertices,
        "faces": faces,
        "volume": volume_m3
    }


def calculate_volume(vertices: List[List[float]], faces: List[Dict[str, Any]]) -> float:
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


def normalize_geometry(solid: Dict[str, Any]) -> str:
    """Normalize geometry for consistent hashing"""
    rounded = []
    for v in solid["vertices"]:
        rounded.append([round(c, 6) for c in v])
    
    sorted_verts = sorted(rounded, key=lambda v: (v[0], v[1], v[2]))
    return json.dumps(sorted_verts)


def hash_geometry(solid: Dict[str, Any]) -> str:
    """Generate SHA-256 hash of normalized geometry"""
    normalized = normalize_geometry(solid)
    return hashlib.sha256(normalized.encode()).hexdigest()


def solid_to_ewkt(solid: Dict[str, Any]) -> str:
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


def solid_to_wkb(solid: Dict[str, Any], srid: int = 4326):
    """Convert Solid3D to WKB for PostGIS storage using ST_GeomFromEWKT"""
    from geoalchemy2.elements import WKTElement
    from sqlalchemy import func
    
    ewkt = solid_to_ewkt(solid)
    return func.ST_GeomFromEWKT(ewkt, type_=func.ST_GeometryType(func.ST_GeomFromEWKT(ewkt)))


def lonlat_to_local(lon: float, lat: float, lon0: float, lat0: float) -> List[float]:
    """Equirectangular projection of lon/lat to local metres around (lon0, lat0)."""
    return [
        (lon - lon0) * METERS_PER_DEG_LAT * math.cos(math.radians(lat0)),
        (lat - lat0) * METERS_PER_DEG_LAT,
    ]


def dedupe_ring(coords: List[List[float]]) -> List[List[float]]:
    """Drop the closing duplicate vertex of a ring, if present."""
    if len(coords) > 1 and coords[0] == coords[-1]:
        return coords[:-1]
    return coords


def footprint_area_m2(ring_lonlat: List[List[float]], origin: Optional[List[float]] = None) -> float:
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


def calculate_volume_m3(footprint_lonlat: List[List[float]], z_min: float, z_max: float, origin_lonlat: List[float]) -> float:
    """Volume in real cubic metres via equirectangular projection."""
    local_coords = [lonlat_to_local(lon, lat, origin_lonlat[0], origin_lonlat[1]) 
                    for lon, lat in footprint_lonlat]
    area_m2 = shoelace_area(local_coords)
    return area_m2 * (z_max - z_min)


def shoelace_area(coords: List[List[float]]) -> float:
    """Shoelace formula for polygon area."""
    area = 0.0
    n = len(coords)
    for i in range(n):
        x0, y0 = coords[i]
        x1, y1 = coords[(i + 1) % n]
        area += x0 * y1 - x1 * y0
    return abs(area) / 2


def generate_3d_ulpin(lat: float, lon: float, z_max: float) -> str:
    """Synthetic 14-char Bhu-Aadhaar-style parcel id (NOT an official ULPIN).

    Format: 33-XXXX-XXXXXX from an uppercase SHA-256 hex digest.
    """
    digest = hashlib.sha256(f"{lat}:{lon}:{z_max}".encode()).hexdigest().upper()
    return f"33-{digest[:4]}-{digest[4:10]}"


def fetch_srtm_elevation(lat: float, lon: float) -> float:
    """Fetch true ground elevation in meters MSL (NASA SRTM 30m).

    Returns 0.0 (flat ground) on any failure so capture never blocks.
    """
    try:
        url = f"https://api.opentopodata.org/v1/srtm30m?locations={lat},{lon}"
        req = urllib.request.Request(url, headers={'User-Agent': 'CadastralAI/1.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if data['results'] and data['results'][0]['elevation']:
                return float(data['results'][0]['elevation'])
    except Exception:
        pass
    return 0.0  # Fallback to flat ground


# PostGIS SQL for overlap detection - EXACT from app.py
OVERLAP_PAIRS_SQL = """
WITH params AS (
    SELECT AVG(ST_X(ST_Centroid(footprint))) AS lon0,
           AVG(ST_Y(ST_Centroid(footprint))) AS lat0
    FROM property_unit
    WHERE footprint IS NOT NULL AND (:floor_id IS NULL OR floor_id = :floor_id)
),
m AS (
    SELECT id, floor_id, solid_geom, footprint,
           ST_XMin(solid_geom) AS xmin, ST_XMax(solid_geom) AS xmax,
           ST_YMin(solid_geom) AS ymin, ST_YMax(solid_geom) AS ymax,
           ST_ZMin(solid_geom) AS zmin, ST_ZMax(solid_geom) AS zmax,
           ST_Volume(solid_geom) AS vol
    FROM property_unit
    WHERE solid_geom IS NOT NULL AND (:floor_id IS NULL OR floor_id = :floor_id)
)
-- Reported volume is analytic: 2D footprint-intersection area x overlapping
-- z-range. Exact for the vertical-prism extrusions stored here, and never
-- read off the ST_IsValid-invalid solid soup. Detection below unchanged.
SELECT s.id_a, s.id_b, ST_Area(ST_Intersection(s.fp_a, s.fp_b)::geography) * GREATEST(0.0, s.oz) AS volume
FROM (
    SELECT a.id AS id_a, b.id AS id_b,
           a.footprint AS fp_a, b.footprint AS fp_b,
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

# Candidate pair query for one proposed (not yet stored) solid
NEW_SOLID_PAIRS_SQL = """
WITH params AS (
    SELECT AVG(ST_X(ST_Centroid(footprint))) AS lon0,
           AVG(ST_Y(ST_Centroid(footprint))) AS lat0
    FROM property_unit
    WHERE floor_id = :floor_id AND footprint IS NOT NULL
),
cand AS (
    SELECT id, floor_id, solid_geom, footprint FROM property_unit
    WHERE floor_id = :floor_id AND id != :unit_id AND solid_geom IS NOT NULL
    UNION ALL
    SELECT CAST(:unit_id AS VARCHAR), CAST(:floor_id AS VARCHAR),
           ST_Translate(
               ST_Extrude(ST_Force3D(ST_GeomFromText(:wkt, 4326)), 0, 0, :dz),
               0, 0, :zmin),
           ST_GeomFromText(:wkt, 4326)
),
m AS (
    SELECT id, floor_id, solid_geom, footprint,
           ST_XMin(solid_geom) AS xmin, ST_XMax(solid_geom) AS xmax,
           ST_YMin(solid_geom) AS ymin, ST_YMax(solid_geom) AS ymax,
           ST_ZMin(solid_geom) AS zmin, ST_ZMax(solid_geom) AS zmax,
           ST_Volume(solid_geom) AS vol
    FROM cand
)
SELECT s.id_a, s.id_b, ST_Area(ST_Intersection(s.fp_a, s.fp_b)::geography) * GREATEST(0.0, s.oz) AS volume
FROM (
    SELECT a.id AS id_a, b.id AS id_b,
           a.footprint AS fp_a, b.footprint AS fp_b,
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
    from sqlalchemy import String, bindparam
    # Explicit bind type: with floor_id=None, asyncpg cannot infer the
    # parameter type for ":floor_id IS NULL" and raises
    # AmbiguousParameterError. The SQL text itself is unchanged.
    stmt = text(OVERLAP_PAIRS_SQL).bindparams(bindparam("floor_id", type_=String))
    rows = (await session.execute(stmt, {"floor_id": floor_id})).all()
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


async def db_new_solid_conflicts(session, unit_id: str, floor_id: str, wkt: str, z_min: float, z_max: float):
    """Overlap pairs involving one proposed solid (used by the PUT gate)."""
    rows = (await session.execute(text(NEW_SOLID_PAIRS_SQL), {
        "unit_id": unit_id,
        "floor_id": floor_id,
        "wkt": wkt,
        "dz": z_max - z_min,
        "zmin": z_min,
    })).all()
    return [(ida, idb) for ida, idb, _ in rows]


def validate_footprint_geometry(shapely_geom) -> Optional[str]:
    """
    Validate footprint geometry for self-intersections and validity.
    Returns error message if invalid, None if valid.
    """
    if not shapely_geom.is_valid:
        try:
            from shapely import is_valid_reason
            reason = is_valid_reason(shapely_geom)
        except (ImportError, AttributeError):
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