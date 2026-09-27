"""
SIH26011 - Import Schemas
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ImportAnalyzeResponse(BaseModel):
    parcel_count: int
    building_count: int
    floor_count: int
    unit_count: int
    detected_crs: str
    geometry_types: List[str]
    warnings: List[str]


class PersistRequest(BaseModel):
    user_role: str


class PersistResponse(BaseModel):
    session_id: str
    status: str
    parcels_created: int
    buildings_created: int
    floors_created: int
    units_created: int
    identifiers_generated: int
    validation_passed: bool
    validation_issues: int