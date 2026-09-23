"""Real-DB integration test for the PUT unit-geometry conflict gate.

Drives update_unit_geometry directly (no HTTP server needed) against the
local sih26011 database. U0001's row is snapshotted first and restored
afterwards, so the test leaves no trace.
"""
import json
import sys
from datetime import datetime
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import HTTPException
from sqlalchemy import text

import app
from app import UnitGeometryUpdateRequest, async_session

UNIT = "U0001"
DONOR = "U0002"


async def _snapshot(session, unit_id):
    unit = (
        await session.execute(
            text(
                "SELECT z_min, z_max, geometry_hash, geometry_version, "
                "volume_cum, ST_AsGeoJSON(footprint) FROM property_unit "
                "WHERE id = :i"
            ),
            {"i": unit_id},
        )
    ).fetchone()
    sid = (
        await session.execute(
            text(
                "SELECT id, version, geometry_hash, identifier_string "
                "FROM spatial_identifier WHERE property_unit_id = :i"
            ),
            {"i": unit_id},
        )
    ).fetchone()
    return unit, sid


@pytest.mark.asyncio
async def test_put_geometry_gate_conflict_and_clean():
    started = datetime.utcnow()
    async with async_session() as session:
        unit_before, sid_before = await _snapshot(session, UNIT)
        donor, _ = await _snapshot(session, DONOR)
    assert unit_before is not None and donor is not None
    donor_fp = json.loads(donor[5])
    donor_zmin, donor_zmax = float(donor[0]), float(donor[1])

    try:
        # 1. Genuine new conflict: U0001 takes U0002's exact footprint+z.
        with pytest.raises(HTTPException) as exc:
            await app.update_unit_geometry(
                UNIT,
                UnitGeometryUpdateRequest(
                    footprint=donor_fp,
                    z_min_m=donor_zmin,
                    z_max_m=donor_zmax,
                    user_role="surveyor",
                    reason="gate-test conflict",
                ),
            )
        assert exc.value.status_code == 422
        assert "spatial conflict" in exc.value.detail

        # Rejected write must not have touched the stored row.
        async with async_session() as session:
            after_reject, _ = await _snapshot(session, UNIT)
        assert float(after_reject[0]) == float(unit_before[0])
        assert float(after_reject[1]) == float(unit_before[1])

        # 2. Conflict-free change: nudge z_max slightly; footprints differ
        # so no new overlap with any neighbour is created.
        clean_zmax = float(unit_before[1]) + 0.1
        resp = await app.update_unit_geometry(
            UNIT,
            UnitGeometryUpdateRequest(
                z_max_m=clean_zmax, user_role="surveyor", reason="gate-test clean"
            ),
        )
        assert resp.status == "UPDATED"
        assert resp.new_version == resp.old_version + 1
        async with async_session() as session:
            after_clean, sid_after = await _snapshot(session, UNIT)
        assert float(after_clean[1]) == clean_zmax
        assert sid_after[1] == sid_before[1] + 1
    finally:
        # Restore U0001 + its spatial id exactly; drop test history/audit.
        async with async_session() as session:
            await session.execute(
                text(
                    "UPDATE property_unit SET z_min = :zmin, z_max = :zmax, "
                    "footprint = ST_GeomFromGeoJSON(:fp), "
                    "solid_geom = ST_Translate(ST_Extrude(ST_Force3D("
                    "ST_GeomFromGeoJSON(:fp)), 0, 0, :dz), 0, 0, :zmin), "
                    "geometry_hash = :gh, geometry_version = :gv, "
                    "volume_cum = :vol WHERE id = :i"
                ),
                {
                    "zmin": float(unit_before[0]),
                    "zmax": float(unit_before[1]),
                    "dz": float(unit_before[1]) - float(unit_before[0]),
                    "fp": unit_before[5],
                    "gh": unit_before[2],
                    "gv": unit_before[3],
                    "vol": unit_before[4],
                    "i": UNIT,
                },
            )
            await session.execute(
                text(
                    "UPDATE spatial_identifier SET version = :v, "
                    "geometry_hash = :gh, identifier_string = :ids "
                    "WHERE id = :i"
                ),
                {
                    "v": sid_before[1],
                    "gh": sid_before[2],
                    "ids": sid_before[3],
                    "i": sid_before[0],
                },
            )
            await session.execute(
                text(
                    "DELETE FROM spatial_identifier_history "
                    "WHERE identifier_id = :i AND retired_at >= :t"
                ),
                {"i": sid_before[0], "t": started},
            )
            await session.execute(
                text(
                    "DELETE FROM audit_log WHERE entity_type = 'property_unit' "
                    "AND entity_id = :i AND timestamp >= :t"
                ),
                {"i": UNIT, "t": started},
            )
            await session.commit()
