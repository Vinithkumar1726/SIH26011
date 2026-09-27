"""
SIH26011 - AI Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class AIJobRequest(BaseModel):
    job_type: str
    target_id: str


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


class AICandidateResponse(BaseModel):
    total: int
    categories: List[Dict[str, Any]]
    proposals: List[Dict[str, Any]]


class AIProposalDetail(BaseModel):
    id: str
    building_id: Optional[str]
    model_primary: str
    model_verifier: Optional[str]
    status: str
    source: Optional[str]
    source_label: str
    ulpin: Optional[str]
    height_m: Optional[float]
    lat: Optional[float]
    lon: Optional[float]
    wkt: Optional[str]
    created_at: Optional[str]


class ReviewRequest(BaseModel):
    decision: str  # APPROVED or REJECTED


class ReviewResponse(BaseModel):
    status: str
    proposal_id: str
    ulpin: Optional[str]
    encroachment: bool
    reviewed_at: str