"""
SIH26011 - Land Parcel Model
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry
from datetime import datetime
from ..database import Base


class LandParcel(Base):
    __tablename__ = "land_parcel"
    
    id = Column(String, primary_key=True)
    ulpin = Column(String(14), nullable=False, index=True)
    name = Column(String, nullable=False)
    area_sqm = Column(Float, nullable=False)
    srid = Column(Integer, nullable=False, default=4326)
    geometry = Column(Geometry('MULTIPOLYGON', dimension=2, srid=4326))
    created_at = Column(DateTime, default=datetime.utcnow)