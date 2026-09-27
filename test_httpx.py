import asyncio
import io
import httpx

async def test_import():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        parcel_file = io.BytesIO(b'{"type":"FeatureCollection","features":[]}')
        buildings_file = io.BytesIO(b'{"type":"FeatureCollection","features":[]}')
        floors_file = io.BytesIO(b'floor_id,building_id,floor_code,display_name,z_min,z_max,area_sqm\nfloor-1,bldg-1,F01,Test Floor,0,3,100')
        units_file = io.BytesIO(b'{"type":"FeatureCollection","features":[]}')
        
        files = {
            'parcel': ('parcel.geojson', parcel_file, 'application/geo+json'),
            'buildings': ('buildings.geojson', buildings_file, 'application/geo+json'),
            'floors': ('floors.csv', floors_file, 'text/csv'),
            'units': ('units.geojson', units_file, 'application/geo+json'),
        }
        
        response = await client.post('/api/import/persist', files=files, data={'user_role': 'surveyor'})
        print('Status:', response.status_code)
        print('Response:', response.json())

asyncio.run(test_import())