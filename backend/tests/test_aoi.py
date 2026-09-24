"""AOI service tests: validation, tile grid, mosaic (1 live Esri fetch)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from aoi_service import cache_key, mosaic_aoi, tile_grid, validate_aoi

RECT = {"type": "rectangle", "min_lon": 76.958, "min_lat": 11.008, "max_lon": 76.962, "max_lat": 11.011}


def test_rectangle_valid():
    v = validate_aoi(dict(RECT))
    assert v["crs"] == "EPSG:4326"
    assert v["area_sqm"] > 0
    assert len(v["polygon"]) == 5


def test_rectangle_bad_order():
    with pytest.raises(ValueError):
        validate_aoi({"type": "rectangle", "min_lon": 1.0, "min_lat": 1.0, "max_lon": 0.0, "max_lat": 2.0})


def test_polygon_closed_and_area():
    poly = [[76.958, 11.008], [76.962, 11.008], [76.962, 11.011], [76.958, 11.011]]
    v = validate_aoi({"type": "polygon", "polygon": poly})
    assert v["polygon"][0] == v["polygon"][-1]
    assert abs(v["area_sqm"] - validate_aoi(dict(RECT))["area_sqm"]) < 1.0


def test_crs_rejected():
    with pytest.raises(ValueError):
        validate_aoi(dict(RECT, crs="EPSG:3857"))


def test_area_cap():
    with pytest.raises(ValueError):
        validate_aoi({"type": "rectangle", "min_lon": 76.0, "min_lat": 10.0, "max_lon": 78.0, "max_lat": 12.0})


def test_tile_grid_deterministic():
    v = validate_aoi(dict(RECT))
    assert tile_grid(v, 18) == tile_grid(v, 18)
    assert len(tile_grid(v, 18)) >= 1


def test_tile_cap():
    v = validate_aoi(dict(RECT))
    with pytest.raises(ValueError):
        tile_grid(v, 22)


def test_cache_key_stable():
    v = validate_aoi(dict(RECT))
    assert cache_key("esri-world-imagery", 18, v) == cache_key("esri-world-imagery", 18, v)


def test_mosaic_live_esri():
    v = validate_aoi({"type": "rectangle", "min_lon": 76.960, "min_lat": 11.009, "max_lon": 76.961, "max_lat": 11.010})
    img, meta = mosaic_aoi(v, 18)
    assert img is not None and img.ndim == 3
    assert meta["provider"] == "esri-world-imagery"
    assert meta["tiles"] >= 1
