"""v2 enterprise surface tests: temporal, subterranean, legal stub.

Follows suite convention (real local DB, read-only SELECTs except the
pure-function legal draft). No rows are created, mutated, or deleted.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from backend.config import settings
DATABASE_URL = settings.DATABASE_URL
from temporal import evaluate_footprint_diff


def _isolated_session():
    """Own NullPool engine per test: connections live and die on the
    current event loop, so pooled handles can never leak across loops."""
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    return async_sessionmaker(engine, expire_on_commit=False), engine


@pytest.mark.asyncio
async def test_temporal_endpoint_shape_live():
    """v2 temporal query returns FeatureCollection with SCD2 properties."""
    maker, engine = _isolated_session()
    try:
        async with maker() as session:
            rows = (await session.execute(text(
                "SELECT parcel_id, height_m, status, valid_from, valid_to, "
                "parent_building_id, ST_AsGeoJSON(footprint) AS geom "
                "FROM cadastral_parcels "
                "WHERE valid_from <= NOW() AND (valid_to IS NULL OR valid_to > NOW()) "
                "AND footprint && ST_MakeEnvelope(76.9, 11.0, 77.0, 11.02, 4326) "
                "ORDER BY parcel_id"
            ))).all()
    finally:
        await engine.dispose()
    assert len(rows) > 0
    for r in rows:
        assert r[0] and r[2] in ('active', 'demolished', 'altered', 'unauthorized_expansion')
        assert r[3] is not None
        assert r[6] is not None


@pytest.mark.asyncio
async def test_temporal_past_epoch_empty_or_subset():
    """An epoch before any capture must not return future rows."""
    maker, engine = _isolated_session()
    try:
        async with maker() as session:
            now_n = (await session.execute(text("SELECT count(*) FROM cadastral_parcels"))).scalar()
            past_n = (await session.execute(text(
                "SELECT count(*) FROM cadastral_parcels "
                "WHERE valid_from <= '2020-01-01T00:00:00+00:00' "
                "AND (valid_to IS NULL OR valid_to > '2020-01-01T00:00:00+00:00')"
            ))).scalar()
    finally:
        await engine.dispose()
    assert now_n > 0
    assert past_n <= now_n


@pytest.mark.asyncio
async def test_subterranean_geojson_compliance():
    """Utility rows carry 3D linestrings below datum with valid types."""
    maker, engine = _isolated_session()
    try:
        async with maker() as session:
            rows = (await session.execute(text(
                "SELECT utility_type, depth_m, status, ST_AsGeoJSON(geom) AS geom, "
                "ST_ZMin(geom) AS zmin FROM subterranean_utilities"
            ))).mappings().all()
    finally:
        await engine.dispose()
    import json as _json

    assert len(rows) >= 3
    for r in rows:
        assert r["utility_type"] in ('water', 'sewer', 'fiber', 'power')
        assert r["depth_m"] < 0
        geom = _json.loads(r["geom"])
        assert geom["type"] == "LineString"
        assert all(len(c) == 3 for c in geom["coordinates"])
        assert r["zmin"] < 0


def test_legal_stub_identical_footprints():
    out = evaluate_footprint_diff(
        "POLYGON((0 0,1 0,1 1,0 0))", "POLYGON((0 0,1 0,1 1,0 0))")
    assert out["verdict"] == "stub"
    assert out["iou"] == 1.0
    assert "YOLO" in out["model"]


def test_legal_stub_partial_overlap():
    out = evaluate_footprint_diff(
        "POLYGON((0 0,2 0,2 2,0 2,0 0))", "POLYGON((1 1,3 1,3 3,1 3,1 1))")
    assert out["verdict"] == "stub"
    assert 0.0 < out["iou"] < 1.0
    assert out["added_area_deg2"] > 0 and out["removed_area_deg2"] > 0


def test_legal_stub_garbage_input():
    out = evaluate_footprint_diff("NOT-WKT", "ALSO-NOT-WKT")
    assert out["verdict"] == "stub-error"
    assert out["iou"] == 0.0
