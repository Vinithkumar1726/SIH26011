"""
SIH26011 - App User Model
"""
from sqlalchemy import Column, String, DateTime, Boolean, Enum
from datetime import datetime
from ..database import Base


class AppUser(Base):
    __tablename__ = "app_user"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String(128), nullable=True)  # NEW: for JWT auth
    role = Column(
        Enum('admin', 'surveyor', 'reviewer', 'viewer', name='user_role', create_type=False),
        nullable=False
    )
    display_name = Column(String, nullable=False)
    last_login = Column(DateTime, nullable=True)  # NEW
    is_active = Column(Boolean, default=True)  # NEW
    created_at = Column(DateTime, default=datetime.utcnow)