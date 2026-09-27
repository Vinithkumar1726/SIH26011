"""
SIH26011 - Dashboard Schemas
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class DashboardStats(BaseModel):
    total_parcels: int
    total_buildings: int
    total_floors: int
    total_units: int
    total_3d_units: int
    validated_units: int
    conflicts: int
    ai_proposals_pending: int
    last_validation: Optional[Dict[str, Any]] = None


class BuildingHeightRange(BaseModel):
    range: str
    count: int


class ValidationState(BaseModel):
    clean: int
    warnings: int
    errors: int
    not_validated: int
    total: int