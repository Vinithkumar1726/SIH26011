"""
SIH26011 - Property Unit Model
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, CheckConstraint
from geoalchemy2 import Geometry
from datetime import datetime
from ..database import Base


class PropertyUnit(Base):
    __tablename__ = "property_unit"
    
    id = Column(String, primary_key=True)
    floor_id = Column(String, nullable=False)
    unit_code = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)
    label = Column(String, nullable=False)
    area_sqm = Column(Float, nullable=False)
    volume_cum = Column(Float, nullable=False)
    footprint = Column(Geometry('POLYGON', dimension=2, srid=4326))
    solid_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326))
    geometry_hash = Column(String(64), nullable=False)
    geometry_version = Column(Integer, nullable=False, default=1)
    z_min = Column(Float, nullable=False, default=0.0)
    z_max = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint('area_sqm > 0', name='chk_unit_area'),
        CheckConstraint('volume_cum > 0', name='chk_unit_volume'),
        CheckConstraint('geometry_version > 0', name='chk_unit_version'),
    )