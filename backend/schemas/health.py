"""
SIH26011 - Health Check Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str