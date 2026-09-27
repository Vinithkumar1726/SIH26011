"""
SIH26011 - Floor Model
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, CheckConstraint
from geoalchemy2 import Geometry
from datetime import datetime
from ..database import Base


class Floor(Base):
    __tablename__ = "floor"
    
    id = Column(String, primary_key=True)
    building_id = Column(String, nullable=False)
    floor_code = Column(String, nullable=False)
    floor_label = Column(String, nullable=False)
    z_min = Column(Float, nullable=False)
    z_max = Column(Float, nullable=False)
    area_sqm = Column(Float, nullable=False)
    solid_geom = Column(Geometry('POLYHEDRALSURFACEZ', dimension=3, srid=4326))
    
    __table_args__ = (
        CheckConstraint('z_max > z_min', name='chk_floor_z'),
        CheckConstraint("floor_code ~ '^[BF][0-9]{2}$'", name='chk_floor_code'),
    )