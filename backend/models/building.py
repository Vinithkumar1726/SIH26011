"""
SIH26011 - Building Model
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Enum
from geoalchemy2 import Geometry
from datetime import datetime
from ..database import Base


class Building(Base):
    __tablename__ = "building"
    
    id = Column(String, primary_key=True)
    parcel_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    height_m = Column(Float, nullable=False)
    height_source = Column(
        Enum('LIDAR', 'DSM', 'SURVEY', 'PROVIDED', 'BIM', 'OSM', 'AI', 'ESTIMATED', 'SYNTHETIC', 
             name='height_source', create_type=False), 
        nullable=False
    )
    floors_count = Column(Integer, nullable=False)
    footprint = Column(Geometry('POLYGON', dimension=2, srid=4326))
    solid_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326))
    created_at = Column(DateTime, default=datetime.utcnow)