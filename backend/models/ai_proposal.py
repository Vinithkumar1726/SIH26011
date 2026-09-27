"""
SIH26011 - AI Proposal Model
"""
from sqlalchemy import Column, String, Float, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from ..database import Base


class AIProposal(Base):
    __tablename__ = "ai_proposal"
    
    id = Column(String, primary_key=True)
    building_id = Column(String, nullable=True)
    model_primary = Column(String, nullable=False)
    model_verifier = Column(String, nullable=True)
    footprint_proposed = Column(JSONB)
    footprint_verified = Column(JSONB)
    iou_score = Column(Float)
    agreement_score = Column(Float)
    status = Column(
        Enum('REVIEW_REQUIRED', 'APPROVED', 'REJECTED', name='ai_proposal_status', create_type=False),
        nullable=False, default="REVIEW_REQUIRED"
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    proposal_data = Column(JSONB, nullable=True)