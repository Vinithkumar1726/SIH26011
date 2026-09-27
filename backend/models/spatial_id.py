"""
SIH26011 - Spatial Identifier & History Models
"""
from sqlalchemy import Column, String, Integer, DateTime, Text
from geoalchemy2 import Geometry
from datetime import datetime
from ..database import Base


class SpatialIdentifier(Base):
    __tablename__ = "spatial_identifier"
    
    id = Column(String, primary_key=True)
    identifier_string = Column(String, nullable=False, unique=True)
    ulpin = Column(String(14), nullable=False)
    building_code = Column(String, nullable=False)
    floor_code = Column(String, nullable=False)
    unit_code = Column(String, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    geometry_hash = Column(String(64), nullable=False)
    property_unit_id = Column(String, nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SpatialIdentifierHistory(Base):
    __tablename__ = "spatial_identifier_history"
    
    id = Column(String, primary_key=True)
    identifier_string = Column(String, nullable=False)
    version = Column(Integer, nullable=False)
    geometry_hash = Column(String(64), nullable=False)
    retired_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326), nullable=True)
    retired_at = Column(DateTime, default=datetime.utcnow)
    reason = Column(Text)
    identifier_id = Column(String, nullable=False)