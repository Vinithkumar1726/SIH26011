"""
SIH26011 - Audit Log Model
"""
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=True)
    entity_id = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSONB, nullable=True)