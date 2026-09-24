"""Area-of-Interest service for the live-map capture pipeline.

Responsibilities:
  - Validate rectangle / polygon AOIs (CRS, bounds, winding, max area).
  - Compute deterministic slippy-map tile grids for an AOI + zoom.
  - Download + mosaic tiles through the configured ImageryProvider.
  - Disk-cache mosaics keyed by (provider, zoom, rounded bounds).
  - Preserve provider metadata for traceability.

No screenshots: every pixel comes from provider tile endpoints.
"""
import hashlib
import math
import os

import cv2
import numpy as np

MAX_AOI_AREA_SQM = 4_000_000  # 2km x 2km cap: keeps tile counts sane
MAX_TILES = 36  # 6x6 grid cap at any zoom
CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".aoi_cache")


def _lonlat_to_xy(lon: float, lat: float, zoom: int) -> tuple:
    n = 2.0 ** zoom
    x = (lon + 180.0) / 360.0 * n
    lat_rad = math.radians(max(min(lat, 85.0511), -85.0511))
    y = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return x, y


def _xy_to_lonlat(x: float, y: float, zoom: int) -> tuple:
    n = 2.0 ** zoom
    lon = x / n * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1.0 - 2.0 * y / n))))
    return lon, lat


def _ring_area_sqm(ring) -> float:
    """Equirectangular-projected polygon area in m^2."""
    if len(ring) < 4:
        return 0.0
    lat0 = sum(p[1] for p in ring) / len(ring)
    kx = 111320.0 * math.cos(math.radians(lat0))
    ky = 111320.0
    pts = [((x * kx), (y * ky)) for x, y in ring]
    area = 0.0
    for i in range(len(pts) - 1):
        area += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
    return abs(area) / 2.0


def validate_aoi(aoi: dict) -> dict:
    """Validate an AOI dict. Returns normalized {bounds, polygon, crs, area_sqm}.

    Raises ValueError with a human-readable reason when invalid.
    """
    if not isinstance(aoi, dict):
        raise ValueError("AOI must be an object")
    crs = str(aoi.get("crs") or "EPSG:4326").upper()
    if crs != "EPSG:4326":
        raise ValueError(f"Unsupported CRS {crs}: only EPSG:4326 is accepted")
    kind = str(aoi.get("type") or "rectangle").lower()

    if kind == "rectangle":
        try:
            min_lon = float(aoi["min_lon"])
            min_lat = float(aoi["min_lat"])
            max_lon = float(aoi["max_lon"])
            max_lat = float(aoi["max_lat"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("Rectangle AOI needs min_lon/min_lat/max_lon/max_lat numbers")
        if not (min_lon < max_lon and min_lat < max_lat):
            raise ValueError("Rectangle corners out of order: need min < max on both axes")
        polygon = [
            [min_lon, min_lat], [max_lon, min_lat], [max_lon, max_lat],
            [min_lon, max_lat], [min_lon, min_lat],
        ]
    elif kind == "polygon":
        polygon = aoi.get("polygon")
        if not isinstance(polygon, list) or len(polygon) < 4:
            raise ValueError("Polygon AOI needs at least 4 positions (closed ring)")
        try:
            polygon = [[float(p[0]), float(p[1])] for p in polygon]
        except (TypeError, ValueError, IndexError):
            raise ValueError("Polygon positions must be [lon, lat] number pairs")
        if polygon[0] != polygon[-1]:
            polygon = polygon + [polygon[0]]
        lons = [p[0] for p in polygon]
        lats = [p[1] for p in polygon]
        min_lon, max_lon, min_lat, max_lat = min(lons), max(lons), min(lats), max(lats)
    else:
        raise ValueError(f"Unsupported AOI type {kind!r}: use rectangle or polygon")

    for v, name, lo, hi in ((min_lon, "min_lon", -180, 180), (max_lon, "max_lon", -180, 180),
                            (min_lat, "min_lat", -85.0511, 85.0511), (max_lat, "max_lat", -85.0511, 85.0511)):
        if not (lo <= v <= hi):
            raise ValueError(f"{name}={v} outside Web-Mercator range [{lo}, {hi}]")

    area_sqm = _ring_area_sqm(polygon)
    if area_sqm <= 0:
        raise ValueError("AOI has zero area")
    if area_sqm > MAX_AOI_AREA_SQM:
        raise ValueError(f"AOI area {area_sqm:,.0f} m^2 exceeds cap {MAX_AOI_AREA_SQM:,.0f} m^2")

    return {
        "type": kind,
        "crs": "EPSG:4326",
        "min_lon": min_lon, "min_lat": min_lat,
        "max_lon": max_lon, "max_lat": max_lat,
        "polygon": polygon,
        "area_sqm": area_sqm,
    }


def tile_grid(bounds: dict, zoom: int) -> list:
    """Deterministic row-major tile list covering bounds at zoom."""
    if not (0 <= zoom <= 22):
        raise ValueError(f"zoom {zoom} out of range 0..22")
    x0, y0 = _lonlat_to_xy(bounds["min_lon"], bounds["max_lat"], zoom)
    x1, y1 = _lonlat_to_xy(bounds["max_lon"], bounds["min_lat"], zoom)
    xs = range(math.floor(x0), math.floor(x1) + 1)
    ys = range(math.floor(y0), math.floor(y1) + 1)
    tiles = [(x, y) for y in ys for x in xs]
    if len(tiles) > MAX_TILES:
        raise ValueError(f"AOI needs {len(tiles)} tiles at z{zoom}: exceeds cap {MAX_TILES} (zoom out or shrink AOI)")
    return tiles


def cache_key(provider: str, zoom: int, bounds: dict) -> str:
    raw = f"{provider}|{zoom}|{bounds['min_lon']:.6f}|{bounds['min_lat']:.6f}|{bounds['max_lon']:.6f}|{bounds['max_lat']:.6f}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def mosaic_aoi(bounds: dict, zoom: int, provider=None) -> tuple:
    """Download + stitch all tiles for bounds. Returns (mosaic_bgr, metadata).

    Tiles are 256px Web-Mercator; mosaic is cropped exactly to the AOI box.
    Results are cached on disk by provider/zoom/rounded-bounds.
    """
    from imagery_providers import get_provider

    provider = provider or get_provider()
    tiles = tile_grid(bounds, zoom)
    key = cache_key(provider.name, zoom, bounds)
    os.makedirs(CACHE_DIR, exist_ok=True)
    hit_path = os.path.join(CACHE_DIR, f"{key}.png")
    if os.path.exists(hit_path):
        return cv2.imread(hit_path), {
            "provider": provider.name, "zoom": zoom, "tiles": len(tiles),
            "cache": "hit", "cache_key": key,
        }

    min_tx = min(t[0] for t in tiles)
    min_ty = min(t[1] for t in tiles)
    max_tx = max(t[0] for t in tiles)
    max_ty = max(t[1] for t in tiles)
    W = H = 256
    canvas = np.zeros(((max_ty - min_ty + 1) * H, (max_tx - min_tx + 1) * W, 3), dtype=np.uint8)
    fetched = 0
    for x, y in tiles:
        img = provider.fetch_tile(x, y, zoom)
        if img is None:
            raise RuntimeError(f"Tile provider {provider.name} failed at z{zoom}/{x}/{y}")
        if img.shape[0] != H or img.shape[1] != W:
            img = cv2.resize(img, (W, H))
        canvas[(y - min_ty) * H:(y - min_ty + 1) * H, (x - min_tx) * W:(x - min_tx + 1) * W] = img
        fetched += 1

    # Crop canvas exactly to the AOI geographic box.
    fx0, fy0 = _lonlat_to_xy(bounds["min_lon"], bounds["max_lat"], zoom)
    fx1, fy1 = _lonlat_to_xy(bounds["max_lon"], bounds["min_lat"], zoom)
    px0 = int(round((fx0 - min_tx) * W))
    py0 = int(round((fy0 - min_ty) * H))
    px1 = int(round((fx1 - min_tx) * W))
    py1 = int(round((fy1 - min_ty) * H))
    mosaic = canvas[py0:py1, px0:px1]
    if mosaic.size == 0:
        raise RuntimeError("Mosaic crop is empty; check AOI bounds")

    cv2.imwrite(hit_path, mosaic)
    return mosaic, {
        "provider": provider.name, "zoom": zoom, "tiles": fetched,
        "cache": "miss", "cache_key": key,
        "width_px": int(mosaic.shape[1]), "height_px": int(mosaic.shape[0]),
    }
