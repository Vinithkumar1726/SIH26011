"""
SIH26011 - Cadastral Parcels Routes (Live-capture parcel inspector)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, func
import json as _json

from ..database import get_session
from ..models import AIProposal


router = APIRouter(prefix="/api", tags=["cadastral-parcels"])


@router.get("/cadastral-parcels")
async def list_cadastral_parcels(session: AsyncSession = Depends(get_session)):
    """Approved live-captured parcels as GeoJSON footprints for the 3D scene."""
    rows = (await session.execute(text(
        "SELECT p.parcel_id, p.height_m, ST_AsGeoJSON(p.footprint) AS geom, "
        "EXISTS (SELECT 1 FROM cadastral_parcels q WHERE q.parcel_id != p.parcel_id "
        "AND ST_3DIntersects(q.solid_geom, p.solid_geom)) AS encroachment, "
        "ST_ZMin(p.solid_geom) AS elevation "
        "FROM cadastral_parcels p ORDER BY p.parcel_id"
    ))).all()
    return [
        {
            "parcel_id": r[0],
            "height_m": r[1],
            "footprint": _json.loads(r[2]) if r[2] else None,
            "encroachment": bool(r[3]),
            "elevation_msl_m": float(r[4]) if r[4] is not None else 0.0,
        }
        for r in rows
    ]


@router.get("/cadastral-parcels/{parcel_id}")
async def cadastral_parcel_detail(parcel_id: str, session: AsyncSession = Depends(get_session)):
    """Inspector detail: metrics, sources, and derived floor schedule."""
    row = (await session.execute(text(
        "SELECT parcel_id, height_m, ST_AsGeoJSON(footprint) AS geom, "
        "ST_Area(footprint::geography) AS area_sqm, "
        "ST_Perimeter(footprint::geography) AS perimeter_m, "
        "ST_AsGeoJSON(ST_Centroid(footprint)) AS centroid, "
        "ST_ZMin(solid_geom) AS zmin, ST_ZMax(solid_geom) AS zmax, "
        "ST_IsValid(footprint) AS fp_valid, "
        "ST_IsSimple(footprint) AS fp_simple, source_meta "
        "FROM cadastral_parcels WHERE parcel_id = :pid"
    ), {"pid": parcel_id})).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Parcel not found")
    meta = row["source_meta"] or {}
    height = float(row["height_m"] or 0)
    floors = max(int(round(height / 3.2)), 1) if height > 0 else 1
    zmin = float(row["zmin"]) if row["zmin"] is not None else 0.0
    floor_h = height / floors if floors else 0
    area = float(row["area_sqm"]) if row["area_sqm"] is not None else None
    volume = area * height if area is not None and height > 0 else None
    fp_ok = bool(row["fp_valid"] and row["fp_simple"])
    proposal = (await session.execute(
        select(AIProposal).where(AIProposal.status == "APPROVED").order_by(AIProposal.created_at.desc())
    )).scalars().all()
    ulpin_proposal = next((p for p in proposal if (p.proposal_data or {}).get("ulpin") == parcel_id), None)
    return {
        "parcel_id": row["parcel_id"],
        "height_m": height,
        "elevation_msl_m": zmin,
        "roof_elevation_msl_m": float(row["zmax"]) if row["zmax"] is not None else zmin + height,
        "footprint_area_sqm": area,
        "perimeter_m": float(row["perimeter_m"]) if row["perimeter_m"] is not None else None,
        "centroid": _json.loads(row["centroid"]) if row["centroid"] else None,
        "volume_cum": volume,
        "fp_valid": fp_ok,
        "geometry_version": 1,
        "height_source": meta.get("height_source", "ESTIMATED"),
        "geometry_source": meta.get("source", "live-capture"),
        "imagery_provider": meta.get("imagery_provider"),
        "model": meta.get("model"),
        "confidence": (ulpin_proposal.proposal_data or {}).get("confidence") if ulpin_proposal else None,
        "source_meta": meta,
        "floors_estimated": floors,
        "floor_schedule": [
            {"floor": f"F{i:02d}", "z_min_msl_m": zmin + (i - 1) * floor_h, "z_max_msl_m": zmin + i * floor_h}
            for i in range(1, floors + 1)
        ],
    }