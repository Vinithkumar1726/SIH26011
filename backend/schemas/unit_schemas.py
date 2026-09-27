"""
SIH26011 - Unit Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class UnitGeometryUpdateRequest(BaseModel):
    """Request to update a property unit's geometry"""
    footprint: Optional[dict] = None  # GeoJSON Polygon
    z_min_m: Optional[float] = None
    z_max_m: Optional[float] = None
    user_role: str = "surveyor"
    reason: Optional[str] = None


class UnitGeometryUpdateResponse(BaseModel):
    """Response after updating unit geometry"""
    unit_id: str
    old_version: int
    new_version: int
    old_geometry_hash: str
    new_geometry_hash: str
    spatial_identifier: str
    status: str


class UnitHistoryEntry(BaseModel):
    """Single entry in unit version history"""
    version: int
    identifier_string: str
    geometry_hash: str
    footprint: dict  # GeoJSON
    z_min: float
    z_max: float
    changed_at: str
    changed_by: Optional[str]
    reason: Optional[str]
    retired_geom: Optional[str] = None


class UnitHistoryResponse(BaseModel):
    """Response for unit version history"""
    unit_id: str
    current_version: int
    history: List[UnitHistoryEntry]