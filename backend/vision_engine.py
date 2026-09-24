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


def _resolve_model_path(model_path: str) -> str:
    """Accept CWD-relative paths and backend-relative paths alike."""
    if os.path.exists(model_path):
        return model_path
    here = os.path.dirname(os.path.abspath(__file__))
    sibling = os.path.join(here, model_path)
    return sibling if os.path.exists(sibling) else model_path


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
    """Fetches a live satellite tile via the configured imagery provider."""
    try:
        from imagery_providers import get_provider

        lat_rad = math.radians(lat)
        n = 2.0 ** zoom
        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)

        img = get_provider().fetch_tile(x, y, zoom)
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
        model_path = _resolve_model_path(model_path)
        if not os.path.exists(model_path):
            return None

        min_lon, min_lat, max_lon, max_lat = _mercator_bbox(lat, lon)

        tile = _fetch_satellite_tile(lat, lon)
        if tile is None:
            return None

        session = ort.InferenceSession(model_path)
        gray = _infer_mask(session, tile)
        if gray is None:
            return None

        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return None
        contour = max(contours, key=cv2.contourArea)
        if cv2.contourArea(contour) < 4:
            return None

        # Linear map over this 50 m box (preserved legacy behavior for the
        # single-click path; the mosaic path uses exact inverse-Mercator).
        span_lon = max_lon - min_lon
        span_lat = max_lat - min_lat
        wkts = _contours_to_wkts(
            [contour],
            lambda x, y: (min_lon + (x / TILE_PX) * span_lon, max_lat - (y / TILE_PX) * span_lat),
            4,
        )
        return wkts[0] if wkts else None
    except Exception:
        return None


def _infer_mask(session, img_bgr_640):
    """Run one 640x640 BGR image through YOLO; return uint8 mask or None."""
    rgb = cv2.cvtColor(img_bgr_640, cv2.COLOR_BGR2RGB)
    feed = {session.get_inputs()[0].name: rgb.transpose(2, 0, 1)[None].astype(np.float32) / 255.0}
    outputs = session.run(None, feed)
    mask = np.asarray(outputs[0]).squeeze()
    if mask.ndim != 2:
        mask = mask.reshape(mask.shape[-2], mask.shape[-1]) if mask.size == TILE_PX * TILE_PX else None
        if mask is None:
            return None
    gray = (np.clip(mask, 0, 1) * 255).astype(np.uint8)
    if gray.shape != (TILE_PX, TILE_PX):
        gray = cv2.resize(gray, (TILE_PX, TILE_PX))
    return gray


def _area_sqm(poly, coords) -> float:
    _clat = sum(y for _, y in coords) / len(coords)
    return poly.area * (111320.0 ** 2) * math.cos(math.radians(_clat))


def _contours_to_wkts(contours, to_lonlat, min_area_px: float) -> list:
    """Shared contour -> validated WKT pipeline.

    to_lonlat(x, y) maps mask-pixel coordinates to (lon, lat), so every
    caller (single tile, batch tile, mosaic window) owns its projection.
    """
    wkts = []
    for contour in contours:
        if cv2.contourArea(contour) <= min_area_px:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.01 * perimeter, True)
        if len(approx) < 3:
            continue
        pts = approx.squeeze(1).astype(np.float64)
        coords = [to_lonlat(float(x), float(y)) for x, y in pts]
        poly = Polygon(coords)
        if not poly.is_valid:
            poly = make_valid(poly)
            if poly.geom_type == "MultiPolygon":
                poly = max(poly.geoms, key=lambda g: g.area)
            if poly.geom_type != "Polygon":
                continue
        if poly.is_empty or poly.area == 0:
            continue
        # Drop slivers: < ~4 m^2 can never be a building and their
        # extrusions produce invalid PostGIS solids.
        if _area_sqm(poly, coords) < 4.0:
            continue
        ring = list(poly.exterior.coords)
        if len(ring) < 4:
            continue
        wkts.append("POLYGON((%s))" % ", ".join(f"{x} {y}" for x, y in ring))
    return wkts


def segment_mosaic(mosaic_bgr, min_tx: int, min_ty: int, zoom: int,
                   model_path: str = "test-data/yolo-seg.onnx",
                   px0: int = 0, py0: int = 0) -> list:
    """Run YOLO over an actual provider mosaic; return validated WKTs.

    The mosaic is split into 640px inference windows. Each mask pixel maps
    back through exact inverse-Web-Mercator math
    (mosaic px -> canvas px -> slippy float -> lon/lat), so no
    linear-latitude approximation is involved. px0/py0 is the mosaic
    origin inside the tile canvas (see aoi_service.crop_origin).
    """
    from aoi_service import _xy_to_lonlat

    model_path = _resolve_model_path(model_path)
    if not os.path.exists(model_path):
        return []
    if mosaic_bgr is None or mosaic_bgr.size == 0:
        return []
    try:
        session = ort.InferenceSession(model_path)
        H, W = mosaic_bgr.shape[0], mosaic_bgr.shape[1]

        def to_lonlat(mx: float, my: float):
            return _xy_to_lonlat(min_tx + (px0 + mx) / 256.0, min_ty + (py0 + my) / 256.0, zoom)

        wkts: list = []
        for oy in range(0, max(H, 1), TILE_PX):
            for ox in range(0, max(W, 1), TILE_PX):
                win = np.zeros((TILE_PX, TILE_PX, 3), dtype=np.uint8)
                h = min(TILE_PX, H - oy)
                w = min(TILE_PX, W - ox)
                if h <= 0 or w <= 0:
                    continue
                win[0:h, 0:w] = mosaic_bgr[oy:oy + h, ox:ox + w]
                gray = _infer_mask(session, win)
                if gray is None:
                    continue
                # Kill the zero-padded margin: YOLO fires on the hard
                # image-vs-padding edge, producing garbage contours that
                # would map hundreds of metres outside the AOI.
                gray[h:, :] = 0
                gray[:, w:] = 0
                contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                wkts.extend(_contours_to_wkts(
                    contours, lambda x, y, _ox=ox, _oy=oy: to_lonlat(_ox + x, _oy + y), 10,
                ))
        return wkts
    except Exception:
        return []


def extract_batch_building_wkts(
    lat: float, lon: float, model_path: str = "test-data/yolo-seg.onnx"
) -> list:
    """Segment every building contour near (lat, lon); [] on any failure."""
    try:
        model_path = _resolve_model_path(model_path)
        if not os.path.exists(model_path):
            return []

        min_lon, min_lat, max_lon, max_lat = _mercator_bbox(lat, lon)

        tile = _fetch_satellite_tile(lat, lon)
        if tile is None:
            return []

        session = ort.InferenceSession(model_path)
        gray = _infer_mask(session, tile)
        if gray is None:
            return []

        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        span_lon = max_lon - min_lon
        span_lat = max_lat - min_lat
        return _contours_to_wkts(
            contours,
            lambda x, y: (min_lon + (x / TILE_PX) * span_lon, max_lat - (y / TILE_PX) * span_lat),
            10,
        )
    except Exception:
        return []
