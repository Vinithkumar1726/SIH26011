"""
SIH26011 - Import Session Model
"""
from sqlalchemy import Column, String, Integer, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from ..database import Base


class ImportSession(Base):
    __tablename__ = "import_session"
    
    id = Column(String, primary_key=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    status = Column(
        Enum('PERSISTED', 'REJECTED', name='import_status', create_type=False),
        nullable=False
    )
    file_manifest = Column(JSONB)
    source_crs = Column(String)
    target_srid = Column(Integer)
    generated_ids = Column(JSONB)
    error_message = Column(String)