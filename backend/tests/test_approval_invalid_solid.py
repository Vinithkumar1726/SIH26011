"""Real-DB regression tests for the approval geometry gate.

Corrected understanding (verified live): ST_IsValid on extruded polygon
soups flags EVERYTHING including perfect rectangles (faces share edges),
so the enforceable boundary is the 2D footprint: valid, simple, >= 4 m²,
plus positive height. A concave-but-valid sliver must APPROVE; only
self-intersecting footprints are rejected, loudly, persisting nothing.
"""
import sys
import uuid
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import HTTPException
from sqlalchemy import text

import app
from app import AIProposal, async_session

# Concave arrowhead: 2D-valid, simple, 331 m². Approves fine.
SLIVER_WKT = (
    "POLYGON((76.955488496 11.010947521,76.95562434 11.010932081,"
    "76.955488496 11.010894184,76.95594536 11.010876639,"
    "76.95594393 11.010959452,76.955488496 11.010947521))"
)

# Bow-tie: self-intersecting, must be rejected.
BOWTIE_WKT = (
    "POLYGON((77.2091 28.6127,77.2093 28.6129,77.2093 28.6127,"
    "77.2091 28.6129,77.2091 28.6127))"
)


def test_staging_validator_accepts_sliver_rejects_bowtie():
    from app import _validate_proposal_wkt

    _validate_proposal_wkt(SLIVER_WKT)  # must not raise
    with pytest.raises(HTTPException) as exc:
        _validate_proposal_wkt(BOWTIE_WKT)
    assert exc.value.status_code == 422


async def _stage(wkt, height=12.0):
    ulpin = f"33-TST-{uuid.uuid4().hex[:6].upper()}"
    proposal_id = uuid.uuid4().hex
    async with async_session() as session:
        session.add(AIProposal(
            id=proposal_id,
            model_primary="regression-test",
            status="REVIEW_REQUIRED",
            proposal_data={
                "wkt": wkt, "height_m": height, "ulpin": ulpin,
                "lat": 11.0, "lon": 77.0, "source": "regression-test",
                "z_base_msl_m": 423.0, "height_source": "ESTIMATED",
            },
        ))
        await session.commit()
    return proposal_id, ulpin


async def _cleanup(proposal_id, ulpin):
    async with async_session() as session:
        await session.execute(
            text("DELETE FROM cadastral_parcels WHERE parcel_id = :u"), {"u": ulpin})
        await session.execute(
            text("DELETE FROM ai_proposal WHERE id = :i"), {"i": proposal_id})
        await session.commit()
    await app.engine.dispose()


@pytest.mark.asyncio
async def test_approval_rejects_self_intersecting_footprint():
    proposal_id, ulpin = await _stage(BOWTIE_WKT)
    try:
        with pytest.raises(HTTPException) as exc:
            await app.review_ai_proposal(proposal_id, {"decision": "APPROVED"})
        assert exc.value.status_code == 422
        assert "invalid" in exc.value.detail
        async with async_session() as session:
            n = (await session.execute(
                text("SELECT count(*) FROM cadastral_parcels WHERE parcel_id = :u"),
                {"u": ulpin},
            )).scalar()
            assert n == 0
            status = (await session.execute(
                text("SELECT status FROM ai_proposal WHERE id = :i"), {"i": proposal_id}
            )).scalar()
            assert status == "REVIEW_REQUIRED"
    finally:
        await _cleanup(proposal_id, ulpin)


CLEAN_WKT = (
    "POLYGON((76.9605 11.0095,76.9607 11.0095,76.9607 11.0097,76.9605 11.0097,76.9605 11.0095))"
)


@pytest.mark.asyncio
async def test_approval_persists_valid_rect_with_analytic_volume():
    """A clean rectangle approves with volume == area x height exactly."""
    proposal_id, ulpin = await _stage(CLEAN_WKT, height=10.0)
    try:
        out = await app.review_ai_proposal(proposal_id, {"decision": "APPROVED"})
        assert out["status"] == "APPROVED"
        async with async_session() as session:
            det = (await session.execute(
                text("SELECT ST_Area(footprint::geography) AS a, height_m FROM cadastral_parcels WHERE parcel_id = :u"),
                {"u": ulpin},
            )).mappings().first()
            assert det is not None
            assert abs(det["a"] * float(det["height_m"]) - det["a"] * 10.0) < 1e-6
    finally:
        await _cleanup(proposal_id, ulpin)
