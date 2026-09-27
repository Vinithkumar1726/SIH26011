"""
SIH26011 - Validation Models
"""
from sqlalchemy import Column, String, Integer, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from ..database import Base


class ValidationRun(Base):
    __tablename__ = "validation_run"
    
    id = Column(String, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(
        Enum('RUNNING', 'PASSED', 'FAILED', name='validation_status', create_type=False),
        nullable=False
    )
    total_checks = Column(Integer, default=0)
    passed_checks = Column(Integer, default=0)
    failed_checks = Column(Integer, default=0)
    issues = Column(JSONB)