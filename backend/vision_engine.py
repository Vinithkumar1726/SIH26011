"""YOLOv11-ONNX vision engine for live building footprint extraction.

Attempts to segment a real building contour from a satellite tile around
a clicked map point. Every failure mode (missing model file, bad weights,
inference errors) returns None so callers can fall back to the synthetic
10m bounding-box footprint.
"""

import math
import os
import urllib.request

import cv2
import numpy as np
import onnxruntime as ort
from shapely.geometry import Polygon
from shapely.validation import make_valid

TILE_PX = 640
TILE_HALF_M = 25.0

_OSM_CATALOG = None


def _osm_paths():
    here = os.path.dirname(os.path.abspath(__file__))
    base = os.path.join(here, "..", "public", "coimbatore")
    return (
        os.path.join(base, "buildings_catalog.json"),
        os.path.join(base, "meta.json"),
    )


def _load_osm_catalog():
    """Cached OSM live-map buildings + origin; None if files are missing."""
    global _OSM_CATALOG
    if _OSM_CATALOG is None:
        try:
            import json

            cat_path, meta_path = _osm_paths()
            meta = json.load(open(meta_path, encoding="utf-8"))
            buildings = json.load(open(cat_path, encoding="utf-8"))
            _OSM_CATALOG = (meta["origin"], buildings)
        except Exception:
            return None
    return _OSM_CATALOG


def _point_in_ring(x: float, z: float, ring) -> bool:
    inside = False
    n = len(ring)
    for i in range(n):
        x1, z1 = ring[i]
        x2, z2 = ring[(i + 1) % n]
        if (z1 > z) != (z2 > z):
            if x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
                inside = not inside
    return inside


def detect_osm_building(lat: float, lon: float):
    """Find the live-map OSM building containing (lat, lon).

    Returns (wkt, height_m_or_None, osm_id) for the smallest containing
    footprint, or None when the click hits no mapped building.
    """
    try:
        loaded = _load_osm_catalog()
        if not loaded:
            return None
        origin, buildings = loaded
        cos_lat = max(float(np.cos(np.radians(origin["lat"]))), 1e-6)
        # lon/lat -> GLB-local metres (east, -north frame of the catalog).
        x = (lon - origin["lon"]) * 111320.0 * cos_lat
        z = -((lat - origin["lat"]) * 111320.0)
        best = None
        best_area = None
        for b in buildings:
            ring = b.get("footprint") or []
            if len(ring) < 3:
                continue
            xs = [p[0] for p in ring]
            zs = [p[1] for p in ring]
            if not (min(xs) <= x <= max(xs) and min(zs) <= z <= max(zs)):
                continue
            if not _point_in_ring(x, z, ring):
                continue
            area = abs(b.get("area") or 0) or 1.0
            if best is None or area < best_area:
                best, best_area = b, area
        if best is None:
            return None
        coords = [
            (
                origin["lon"] + (px / (111320.0 * cos_lat)),
                origin["lat"] - (pz / 111320.0),
            )
            for px, pz in best["footprint"]
        ]
        coords.append(coords[0])
        wkt = "POLYGON((%s))" % ", ".join(f"{a} {b}" for a, b in coords)
        height = best.get("height")
        height = float(height) if isinstance(height, (int, float)) and height > 0 else None
        return wkt, height, best.get("id")
    except Exception:
        return None


def _mercator_bbox(lat: float, lon: float, half_m: float = TILE_HALF_M):
    """~50m x 50m Web-Mercator-style box around (lat, lon), in degrees."""
    cos_lat = max(float(np.cos(np.radians(lat))), 1e-6)
    d_lat = half_m / 111320.0
    d_lon = half_m / (111320.0 * cos_lat)
    return lon - d_lon, lat - d_lat, lon + d_lon, lat + d_lat


def _fetch_satellite_tile(lat: float, lon: float, zoom: int = 19) -> np.ndarray | None:
    """Fetches a live satellite tile from Esri World Imagery and resizes it for YOLO."""
    try:
        lat_rad = math.radians(lat)
        n = 2.0 ** zoom
        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)

        url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{y}/{x}"
        req = urllib.request.Request(url, headers={'User-Agent': 'CadastralAI-SIH26012/1.0'})

        with urllib.request.urlopen(req, timeout=5) as resp:
            arr = np.frombuffer(resp.read(), np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is not None:
                # Resize to the 640x640 resolution expected by YOLOv11
                return cv2.resize(img, (TILE_PX, TILE_PX))
    except Exception:
        pass
    return None


def extract_building_wkt(
    lat: float, lon: float, model_path: str = "test-data/yolo-seg.onnx"
) -> str | None:
    """Segment a building contour near (lat, lon); None on any failure."""
    try:
        if not os.path.exists(model_path):
            return None

        min_lon, min_lat, max_lon, max_lat = _mercator_bbox(lat, lon)

        tile = _fetch_satellite_tile(lat, lon)
        if tile is None:
            return None

        session = ort.InferenceSession(model_path)
        # Convert BGR to RGB, transpose to (C, H, W), and normalize
        rgb_tile = cv2.cvtColor(tile, cv2.COLOR_BGR2RGB)
        feed = {session.get_inputs()[0].name: rgb_tile.transpose(2, 0, 1)[None].astype(np.float32) / 255.0}
        outputs = session.run(None, feed)

        mask = np.asarray(outputs[0]).squeeze()
        if mask.ndim != 2:
            # Take the strongest class channel if the head returns per-class maps.
            mask = mask.reshape(mask.shape[-2], mask.shape[-1]) if mask.size == TILE_PX * TILE_PX else None
            if mask is None:
                return None
        gray = (np.clip(mask, 0, 1) * 255).astype(np.uint8)
        if gray.shape != (TILE_PX, TILE_PX):
            gray = cv2.resize(gray, (TILE_PX, TILE_PX))

        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(contour) < 4:
            return None

        # Simplify the raw detector boundary: jagged pixel zigzags become
        # self-intersecting rings that PostGIS rejects at ST_Extrude time.
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.01 * perimeter, True)
        if len(approx) < 3:
            return None

        pts = approx.squeeze(1).astype(np.float64)  # (N, 2) pixel xy
        span_lon = max_lon - min_lon
        span_lat = max_lat - min_lat
        coords = [
            (
                min_lon + (float(x) / TILE_PX) * span_lon,
                max_lat - (float(y) / TILE_PX) * span_lat,
            )
            for x, y in pts
        ]
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = make_valid(poly)
            if poly.geom_type == "MultiPolygon":
                poly = max(poly.geoms, key=lambda g: g.area)
            if poly.geom_type != "Polygon":
                return None
        if poly.is_empty or poly.area == 0:
            return None
        ring = list(poly.exterior.coords)
        if len(ring) < 4:
            return None
        return "POLYGON((%s))" % ", ".join(f"{x} {y}" for x, y in ring)
    except Exception:
        return None
