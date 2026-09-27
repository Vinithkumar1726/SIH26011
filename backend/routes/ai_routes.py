"""
SIH26011 - AI Routes
All AI proposal, AOI, and vision endpoints
"""
import os
import json
import uuid
import math
import hashlib
import urllib.request
from datetime import datetime
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel, Field

from ..database import get_session
from ..models import AIProposal, AppUser, AuditLog, LandParcel, Building
from ..services.geometry_service import generate_3d_ulpin, fetch_srtm_elevation
from ..vision_engine import detect_osm_building, extract_batch_building_wkts, extract_building_wkt, segment_mosaic
from ..aoi_service import validate_aoi, mosaic_aoi, tile_grid
from ..imagery_providers import get_provider


router = APIRouter(prefix="/api", tags=["ai"])


# ==================== Models ====================

class AIJobRequest(BaseModel):
    job_type: str = Field(description="Job type, e.g. 'lidar_elevation'")
    target_id: str = Field(description="Target building or parcel id")


class LiveExtractionRequest(BaseModel):
    latitude: float
    longitude: float
    building_height_m: float = 12.0


class BatchExtractionRequest(BaseModel):
    latitude: float
    longitude: float
    building_height_m: float = 12.0


class AOIValidateRequest(BaseModel):
    aoi: Dict[str, Any]


class MosaicRequest(BaseModel):
    aoi: Dict[str, Any]
    zoom: int = 19
    provider: Optional[str] = None


class DetectBatchRequest(BaseModel):
    aoi: Dict[str, Any]
    zoom: int = 19
    provider: Optional[str] = None
    building_height_m: float = 12.0


class ProposalEditRequest(BaseModel):
    height_m: Optional[float] = None
    floors_override: Optional[int] = None
    height_source: Optional[str] = None


class ReviewRequest(BaseModel):
    decision: str


# ==================== In-memory job queue ====================

AI_JOBS: dict = {}


def _validate_proposal_wkt(wkt: str) -> None:
    """Gate WKT entering AIProposal rows."""
    from shapely.wkt import loads as _loads

    try:
        poly = _loads(wkt)
    except Exception:
        raise HTTPException(status_code=422, detail="Proposal footprint is not parseable WKT")
    if poly.geom_type != "Polygon" or poly.is_empty:
        raise HTTPException(status_code=422, detail="Proposal footprint must be a non-empty Polygon")
    if not poly.is_valid or not poly.is_simple:
        raise HTTPException(status_code=422, detail="Proposal footprint is self-intersecting or invalid")
    ring = list(poly.exterior.coords)
    if len(ring) < 4:
        raise HTTPException(status_code=422, detail="Proposal footprint ring too short")
    clat = sum(y for _, y in ring) / len(ring)
    area_sqm = poly.area * (111320.0 ** 2) * math.cos(math.radians(clat))
    if area_sqm < 4.0:
        raise HTTPException(status_code=422, detail="Proposal footprint below 4 m² minimum building size")


def _ai_job_set(job_id: str, **fields):
    job = AI_JOBS.get(job_id)
    if job is None:
        return
    job.update(fields)


async def _ai_job_worker(job_id: str, job_type: str, target_id: str):
    """Background worker: never blocks the event loop's response path."""
    _ai_job_set(job_id, status="PROCESSING")
    try:
        result = None
        if job_type == "lidar_elevation":
            from ..lidar_engine import extract_building_elevation
            here = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(here, "..", "test-data", f"{target_id}.ply")
            result = extract_building_elevation(file_path)
        else:
            raise ValueError(f"Unknown job_type: {job_type}")
        _ai_job_set(job_id, status="COMPLETED", result=result)
    except Exception as e:
        _ai_job_set(job_id, status="FAILED", error=str(e))


# ==================== Routes ====================

@router.post("/ai/jobs")
async def create_ai_job(payload: AIJobRequest, background_tasks: BackgroundTasks):
    """Queue a background AI job; returns immediately with a job id."""
    job_id = uuid.uuid4().hex
    AI_JOBS[job_id] = {
        "job_id": job_id,
        "job_type": payload.job_type,
        "target_id": payload.target_id,
        "status": "PENDING",
        "result": None,
        "error": None,
    }
    background_tasks.add_task(_ai_job_worker, job_id, payload.job_type, payload.target_id)
    return {"job_id": job_id, "status": "PENDING"}


@router.get("/ai/jobs/{job_id}")
async def get_ai_job(job_id: str):
    """Poll status/result of a background AI job."""
    job = AI_JOBS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/ai/extract-live-building")
async def extract_live_building(payload: LiveExtractionRequest):
    """Stage a live-captured building for human review."""
    lon, lat, height = payload.longitude, payload.latitude, payload.building_height_m
    osm_hit = detect_osm_building(lat, lon)
    if osm_hit is not None:
        wkt, osm_height, osm_id = osm_hit
        if osm_height is not None:
            height = osm_height
        source = "osm"
        model_primary = f"OSM live map ({osm_id})"[:50]
    else:
        wkt = extract_building_wkt(lat, lon)
    if osm_hit is None and wkt is None:
        delta = 0.0001
        corners = [
            (lon - delta, lat - delta),
            (lon + delta, lat - delta),
            (lon + delta, lat + delta),
            (lon - delta, lat + delta),
            (lon - delta, lat - delta),
        ]
        wkt = "POLYGON((%s))" % ", ".join(f"{x} {y}" for x, y in corners)
        source = "synthetic_fallback"
        model_primary = "synthetic 10m box"
    elif osm_hit is None:
        source = "vision"
        model_primary = "YOLO11n-seg ONNX"
    ulpin = generate_3d_ulpin(lat, lon, height)
    z_base = fetch_srtm_elevation(lat, lon)
    _validate_proposal_wkt(wkt)
    proposal_id = uuid.uuid4().hex
    
    async with get_session() as session:
        session.add(AIProposal(
            id=proposal_id,
            building_id=None,
            model_primary=model_primary,
            model_verifier=None,
            footprint_proposed=None,
            footprint_verified=None,
            iou_score=None,
            agreement_score=None,
            status="REVIEW_REQUIRED",
            proposal_data={
                "wkt": wkt,
                "height_m": height,
                "ulpin": ulpin,
                "lat": lat,
                "lon": lon,
                "source": source,
                "z_base_msl_m": z_base,
            },
        ))
        await session.commit()
    return {"status": "PENDING_REVIEW", "proposal_id": proposal_id, "source": source}


@router.post("/ai/extract-batch")
async def extract_batch_buildings(payload: BatchExtractionRequest):
    """Stage every vision-detected building around a click for human review."""
    from shapely.geometry import shape as _shape
    from shapely.wkt import loads as _wkt_loads

    lat, lon, height = payload.latitude, payload.longitude, payload.building_height_m
    wkts = extract_batch_building_wkts(lat, lon)
    z_base = fetch_srtm_elevation(lat, lon)
    proposal_ids = []
    
    async with get_session() as session:
        for wkt in wkts:
            try:
                centroid = _wkt_loads(wkt).centroid
                _validate_proposal_wkt(wkt)
            except HTTPException:
                continue
            except Exception:
                continue
            ulpin = generate_3d_ulpin(centroid.y, centroid.x, height)
            proposal_id = uuid.uuid4().hex
            session.add(AIProposal(
                id=proposal_id,
                building_id=None,
                model_primary="YOLO11n-seg ONNX (batch)",
                model_verifier=None,
                footprint_proposed=None,
                footprint_verified=None,
                iou_score=None,
                agreement_score=None,
                status="REVIEW_REQUIRED",
                proposal_data={
                    "wkt": wkt,
                    "height_m": height,
                    "ulpin": ulpin,
                    "lat": centroid.y,
                    "lon": centroid.x,
                    "source": "vision-batch",
                    "z_base_msl_m": z_base,
                },
            ))
            proposal_ids.append(proposal_id)
        await session.commit()
    return {"status": "PENDING_REVIEW", "count": len(proposal_ids), "proposal_ids": proposal_ids, "z_base_msl_m": z_base, "source": "vision-batch"}


@router.post("/aoi/validate")
async def validate_aoi_endpoint(payload: AOIValidateRequest):
    """Validate a rectangle/polygon AOI without fetching imagery."""
    from ..aoi_service import validate_aoi as _validate_aoi

    try:
        normalized = _validate_aoi(payload.aoi)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return {"valid": True, "aoi": normalized}


@router.post("/imagery/mosaic")
async def imagery_mosaic(payload: MosaicRequest):
    """Validate an AOI, fetch provider tiles, and return a base64 mosaic."""
    import base64
    import cv2 as _cv2

    try:
        bounds = validate_aoi(payload.aoi)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    provider = get_provider(payload.provider)
    try:
        tiles = tile_grid(bounds, payload.zoom)
        mosaic, meta = mosaic_aoi(bounds, payload.zoom, provider)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    ok, buf = _cv2.imencode(".png", mosaic)
    if not ok:
        raise HTTPException(status_code=500, detail="Mosaic PNG encoding failed")
    span_m = max(
        (bounds["max_lon"] - bounds["min_lon"]) * 111320.0,
        (bounds["max_lat"] - bounds["min_lat"]) * 111320.0,
    )
    return {
        "aoi": bounds,
        "zoom": payload.zoom,
        "tiles": tiles,
        "tile_count": len(tiles),
        "image_base64": base64.b64encode(buf.tobytes()).decode(),
        "width_px": int(mosaic.shape[1]),
        "height_px": int(mosaic.shape[0]),
        "meters_per_pixel": span_m / max(mosaic.shape[0], mosaic.shape[1]),
        "imagery": meta,
    }


@router.post("/ai/detect-batch")
async def detect_batch(payload: DetectBatchRequest):
    """Run YOLO over the AOI's actual provider mosaic; stage proposals."""
    from shapely.wkt import loads as _wkt_loads

    try:
        bounds = validate_aoi(payload.aoi)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    provider = get_provider(payload.provider)
    try:
        mosaic, mosaic_meta = mosaic_aoi(bounds, payload.zoom, provider)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    wkts = segment_mosaic(
        mosaic, mosaic_meta["min_tx"], mosaic_meta["min_ty"], payload.zoom,
        px0=mosaic_meta.get("px0", 0), py0=mosaic_meta.get("py0", 0))
    tiles = tile_grid(bounds, payload.zoom)

    z_base = fetch_srtm_elevation(
        (bounds["min_lat"] + bounds["max_lat"]) / 2.0,
        (bounds["min_lon"] + bounds["max_lon"]) / 2.0,
    )
    seen: set = set()
    staged = []
    
    async with get_session() as session:
        for wkt in wkts:
            try:
                centroid = _wkt_loads(wkt).centroid
                _validate_proposal_wkt(wkt)
            except HTTPException:
                continue
            except Exception:
                continue
            # Dedupe near-identical detections (~1 m).
            dkey = (round(centroid.x, 5), round(centroid.y, 5))
            if dkey in seen:
                continue
            seen.add(dkey)
            ulpin = generate_3d_ulpin(centroid.y, centroid.x, payload.building_height_m)
            proposal_id = uuid.uuid4().hex
            session.add(AIProposal(
                id=proposal_id,
                building_id=None,
                model_primary="YOLO11n-seg ONNX (aoi-batch)",
                model_verifier=None,
                footprint_proposed=None,
                footprint_verified=None,
                iou_score=None,
                agreement_score=None,
                status="REVIEW_REQUIRED",
                proposal_data={
                    "wkt": wkt,
                    "height_m": payload.building_height_m,
                    "height_source": "ESTIMATED",
                    "ulpin": ulpin,
                    "lat": centroid.y,
                    "lon": centroid.x,
                    "source": "vision-aoi-batch",
                    "z_base_msl_m": z_base,
                    "imagery_provider": provider.name,
                    "aoi": bounds,
                    "model": "YOLO11n-seg ONNX",
                },
            ))
            staged.append(proposal_id)
        await session.commit()
    return {
        "status": "PENDING_REVIEW",
        "count": len(staged),
        "proposal_ids": staged,
        "tiles": len(tiles),
        "z_base_msl_m": z_base,
        "source": "vision-aoi-batch",
        "imagery": {k: mosaic_meta.get(k) for k in ("provider", "zoom", "tiles", "cache", "width_px", "height_px")},
    }


@router.post("/ai/proposal/{proposal_id}/edit")
async def edit_proposal(proposal_id: str, payload: ProposalEditRequest):
    """Edit a pending proposal's height/floors before review (gate intact)."""
    async with get_session() as session:
        proposal = (await session.execute(
            select(AIProposal).where(AIProposal.id == proposal_id)
        )).scalar_one_or_none()
        if proposal is None:
            raise HTTPException(status_code=404, detail="Proposal not found")
        if proposal.status != "REVIEW_REQUIRED":
            raise HTTPException(status_code=409, detail=f"Proposal already {proposal.status}")
        data = dict(proposal.proposal_data or {})
        if payload.height_m is not None:
            if payload.height_m <= 0:
                raise HTTPException(status_code=422, detail="height_m must be positive")
            data["height_m"] = float(payload.height_m)
            data["height_source"] = payload.height_source or "USER"
        if payload.floors_override is not None:
            if payload.floors_override < 1:
                raise HTTPException(status_code=422, detail="floors_override must be >= 1")
            data["floors_override"] = int(payload.floors_override)
        proposal.proposal_data = data
        await session.commit()
        return {"status": "REVIEW_REQUIRED", "proposal_id": proposal.id, "proposal_data": data}


@router.get("/ai/candidates")
async def get_ai_candidates(session: AsyncSession = Depends(get_session)):
    """Get AI proposals pending review"""
    result = await session.execute(
        select(AIProposal).where(AIProposal.status == "REVIEW_REQUIRED")
    )
    proposals = result.scalars().all()
    
    high_confidence = len([p for p in proposals if (p.iou_score or 0) > 0.9])
    disputed = len([p for p in proposals if (p.iou_score or 0) < 0.7])
    needs_review = len(proposals) - high_confidence - disputed
    
    return {
        "total": len(proposals),
        "categories": [
            {
                "name": "High-confidence agreement",
                "count": high_confidence,
                "percentage": (high_confidence / len(proposals) * 100) if proposals else 0
            },
            {
                "name": "Disputed",
                "count": disputed,
                "percentage": (disputed / len(proposals) * 100) if proposals else 0
            },
            {
                "name": "Needs human review",
                "count": needs_review,
                "percentage": (needs_review / len(proposals) * 100) if proposals else 0
            }
        ],
        "proposals": [
            {
                "id": p.id,
                "building_id": p.building_id,
                "iou_score": p.iou_score,
                "agreement_score": p.agreement_score,
                "status": p.status,
                "source": (p.proposal_data or {}).get("source"),
                "ulpin": (p.proposal_data or {}).get("ulpin"),
                "height_m": (p.proposal_data or {}).get("height_m"),
                "height_source": (p.proposal_data or {}).get("height_source", "ESTIMATED"),
                "floors_override": (p.proposal_data or {}).get("floors_override"),
                "z_base_msl_m": (p.proposal_data or {}).get("z_base_msl_m", 0.0),
                "created_at": p.created_at.isoformat() if p.created_at else None
            }
            for p in proposals
        ]
    }


@router.get("/ai/proposal/{proposal_id}")
async def get_ai_proposal(proposal_id: str, session: AsyncSession = Depends(get_session)):
    """Get one real AI proposal row, including its capture source."""
    proposal = (await session.execute(
        select(AIProposal).where(AIProposal.id == proposal_id)
    )).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    data = proposal.proposal_data or {}
    source = data.get("source")
    return {
        "id": proposal.id,
        "building_id": proposal.building_id,
        "model_primary": proposal.model_primary,
        "model_verifier": proposal.model_verifier,
        "status": proposal.status,
        "source": source,
        "source_label": (
            "Vision-detected footprint (YOLO11n-seg, live Esri tile)"
            if source == "vision" else
            "Mapped OSM building footprint (live map catalogue)"
            if source == "osm" else
            "Synthetic fallback — 10m box, NOT vision-detected"
            if source == "synthetic_fallback" else
            "Unknown capture source"
        ),
        "ulpin": data.get("ulpin"),
        "height_m": data.get("height_m"),
        "lat": data.get("lat"),
        "lon": data.get("lon"),
        "wkt": data.get("wkt"),
        "created_at": proposal.created_at.isoformat() if proposal.created_at else None,
    }


@router.post("/ai/review/{proposal_id}")
async def review_ai_proposal(proposal_id: str, request: ReviewRequest, session: AsyncSession = Depends(get_session)):
    """Review an AI proposal. APPROVED materializes the parcel; REJECTED does not."""
    decision = request.decision
    if decision not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid decision. Must be APPROVED or REJECTED")

    proposal = (await session.execute(
        select(AIProposal).where(AIProposal.id == proposal_id)
    )).scalar_one_or_none()
    if proposal is None:
        raise HTTPException(status_code=404, detail="Proposal not found")
    if proposal.status != "REVIEW_REQUIRED":
        raise HTTPException(status_code=409, detail=f"Proposal already {proposal.status}")

    # A decision is being recorded now — only now may a verifier be named.
    proposal.model_verifier = "human-reviewer"
    data = proposal.proposal_data or {}
    has_encroachment = False
    if decision == "APPROVED":
        if not data.get("wkt") or not data.get("ulpin") or data.get("height_m") is None:
            raise HTTPException(status_code=422, detail="Proposal has no capturable geometry")
        z_base = float(data.get("z_base_msl_m") or 0.0)
        import json as _meta_json

        # Build-then-verify: never persist a degenerate extrusion
        check = (await session.execute(text(
            "SELECT ST_IsValid(ST_GeomFromText(:wkt, 4326)) AS fp_valid, "
            "ST_IsSimple(ST_GeomFromText(:wkt, 4326)) AS fp_simple, "
            "ST_Area(ST_GeomFromText(:wkt, 4326)::geography) AS area_sqm, "
            "ST_NPoints(ST_GeomFromText(:wkt, 4326)) AS npoints"
        ), {"wkt": data["wkt"]})).mappings().first()
        if not check["fp_valid"] or not check["fp_simple"]:
            raise HTTPException(
                status_code=422,
                detail="Proposal footprint is self-intersecting or invalid; REJECT it or capture a cleaner footprint",
            )
        if (check["npoints"] or 0) < 4:
            raise HTTPException(status_code=422, detail="Proposal footprint ring too short")
        if (check["area_sqm"] or 0) < 4.0:
            raise HTTPException(status_code=422, detail="Proposal footprint below 4 m² minimum building size")
        if float(data["height_m"]) <= 0:
            raise HTTPException(status_code=422, detail="Proposal height must be positive")
        source_meta = {
            "imagery_provider": data.get("imagery_provider"),
            "aoi": data.get("aoi"),
            "source": data.get("source"),
            "model": data.get("model", data.get("source")),
            "height_source": data.get("height_source", "ESTIMATED"),
            "z_base_msl_m": z_base,
        }
        await session.execute(text(
            "INSERT INTO cadastral_parcels (parcel_id, footprint, solid_geom, height_m, source_meta) "
            "VALUES (:ulpin, ST_MakeValid(ST_GeomFromText(:wkt, 4326)), "
            "ST_Translate(ST_Multi(ST_CollectionExtract(ST_Extrude(ST_Force3D(ST_GeomFromText(:wkt, 4326)), 0, 0, :height), 3)), 0, 0, :z_base), :height, "
            "CAST(:source_meta AS JSONB)) "
            "ON CONFLICT (parcel_id) DO NOTHING"
        ), {"ulpin": data["ulpin"], "wkt": data["wkt"], "height": data["height_m"], "z_base": z_base,
            "source_meta": _meta_json.dumps(source_meta)})
        # Physical encroachment: does the new solid intersect any other parcel?
        conflict_query = text("""
            SELECT EXISTS (
                SELECT 1 FROM cadastral_parcels
                WHERE parcel_id != :ulpin
                AND ST_3DIntersects(solid_geom, (SELECT solid_geom FROM cadastral_parcels WHERE parcel_id = :ulpin))
            )
        """)
        has_encroachment = bool((await session.execute(conflict_query, {"ulpin": data["ulpin"]})).scalar())
        proposal.status = "APPROVED"
    else:
        proposal.status = "REJECTED"
    await session.commit()

    return {
        "status": proposal.status,
        "proposal_id": proposal.id,
        "ulpin": data.get("ulpin"),
        "encroachment": has_encroachment if decision == "APPROVED" else False,
        "reviewed_at": datetime.utcnow().isoformat()
    }