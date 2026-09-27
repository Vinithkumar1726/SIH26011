import asyncio
from fastapi.testclient import TestClient
from backend.app import app
import io

client = TestClient(app)

# Test the import persist endpoint
parcel_file = io.BytesIO(b'{"type":"FeatureCollection","features":[]}')
buildings_file = io.BytesIO(b'{"type":"FeatureCollection","features":[]}')
floors_file = io.BytesIO(b'floor_id,building_id,floor_code,display_name,z_min,z_max,area_sqm\nfloor-1,bldg-1,F01,Test Floor,0,3,100')
units_file = io.BytesIO(b'{"type":"FeatureCollection","features":[]}')

files = {
    'parcel': ('parcel.geojson', parcel_file, 'application/geo+json'),
    'buildings': ('buildings.geojson', io.BytesIO(b'{"type":"FeatureCollection","features":[]}'), 'application/geo+json'),
    'floors': ('floors.csv', b'floor_id,building_id,floor_code,display_name,z_min,z_max,area_sqm\nfloor-1,bldg-1,F01,Test Floor,0,3,100', 'text/csv'),
    'units': ('units.geojson', b'{"type":"FeatureCollection","features":[]}', 'application/geo+json'),
}

client = TestClient(app)
response = client.post('/api/import/persist', files=files, data={'user_role': 'surveyor'})
print('Status:', response.status_code)
print('Response:', response.json())