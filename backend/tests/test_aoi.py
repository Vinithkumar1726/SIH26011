"""AOI service tests: validation, tile grid, mosaic (1 live Esri fetch)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from aoi_service import _lonlat_to_xy, _xy_to_lonlat, cache_key, mosaic_aoi, tile_grid, validate_aoi

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


def test_slippy_roundtrip_coimbatore():
    # Exact inverse-Mercator roundtrip at Coimbatore for several zooms.
    for zoom in (17, 18, 19):
        for lon, lat in ((76.9605, 11.0095), (76.961, 11.010), (76.958, 11.008)):
            fx, fy = _lonlat_to_xy(lon, lat, zoom)
            lo2, la2 = _xy_to_lonlat(fx, fy, zoom)
            assert abs(lo2 - lon) < 1e-9 and abs(la2 - lat) < 1e-9


def test_mosaic_corners_align_with_bounds():
    # Mosaic pixel (0,0) is the AOI NW corner (within rounding), and the
    # mosaic window covers the AOI box on every side.
    from aoi_service import _lonlat_to_xy as fwd

    v = validate_aoi({"type": "rectangle", "min_lon": 76.960, "min_lat": 11.009, "max_lon": 76.961, "max_lat": 11.010})
    img, meta = mosaic_aoi(v, 18)
    zoom = 18
    fx0 = meta["min_tx"] + meta["px0"] / 256.0
    fy0 = meta["min_ty"] + meta["py0"] / 256.0
    nw_lon, nw_lat = _xy_to_lonlat(fx0, fy0, zoom)
    se_lon, se_lat = _xy_to_lonlat(
        fx0 + img.shape[1] / 256.0, fy0 + img.shape[0] / 256.0, zoom)
    # Sub-pixel crop rounding: edges match the AOI box to < 1 px (~0.6 m).
    assert abs(nw_lon - v["min_lon"]) < 3e-6 and abs(nw_lat - v["max_lat"]) < 3e-6
    assert abs(se_lon - v["max_lon"]) < 3e-6 and abs(se_lat - v["min_lat"]) < 3e-6
    # Crop origin in canvas pixels reproduces the AOI NW corner exactly.
    fx_box, fy_box = fwd(v["min_lon"], v["max_lat"], zoom)
    assert abs((fx_box - meta["min_tx"]) * 256.0 - meta["px0"]) < 0.5001
    assert abs((fy_box - meta["min_ty"]) * 256.0 - meta["py0"]) < 0.5001


def test_segment_mosaic_returns_valid_wkts():
    from shapely.wkt import loads

    from vision_engine import segment_mosaic

    v = validate_aoi({"type": "rectangle", "min_lon": 76.960, "min_lat": 11.009, "max_lon": 76.961, "max_lat": 11.010})
    img, meta = mosaic_aoi(v, 18)
    wkts = segment_mosaic(img, meta["min_tx"], meta["min_ty"], 18,
                           px0=meta.get("px0", 0), py0=meta.get("py0", 0))
    assert isinstance(wkts, list)
    # 5e-6 deg ≈ 0.5 m: sub-pixel crop-rounding slack, not distortion.
    tol = 5e-6
    for wkt in wkts:
        poly = loads(wkt)
        assert poly.is_valid and not poly.is_empty
        lo, la, hi_lo, hi_la = poly.bounds
        # Every detection must lie inside the AOI box it was segmented from.
        assert v["min_lon"] - tol <= lo and hi_lo <= v["max_lon"] + tol
        assert v["min_lat"] - tol <= la and hi_la <= v["max_lat"] + tol
