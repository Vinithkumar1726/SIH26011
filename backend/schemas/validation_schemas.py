"""
SIH26011 - Validation Schemas
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ValidationIssue(BaseModel):
    severity: str
    code: str
    message: str
    entity_id: Optional[str] = None
    overlap_volume: Optional[float] = None


class ValidationResult(BaseModel):
    passed: bool
    total_checks: int
    passed_checks: int
    failed_checks: int
    issues: List[ValidationIssue]


class ValidationRunResponse(BaseModel):
    id: str
    started_at: str
    completed_at: Optional[str]
    status: str
    total_checks: int
    passed_checks: int
    failed_checks: int
    issues: List[Dict[str, Any]]