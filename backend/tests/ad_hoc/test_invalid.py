import requests
import json
import tempfile
import os

# Test 1: Inverted Z-range (z_min > z_max)
print("=== Test 1: Inverted Z-range ===")
invalid_geojson_1 = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {
            "unit_code": "U_INV",
            "floor_id": "floor-f01",
            "unit_type": "apartment",
            "label": "Inverted Z",
            "area_sqm": 50,
            "z_min_m": 6.5,  # > z_max
            "z_max_m": 3.5
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.2091, 28.6127],
                [77.2093, 28.6127],
                [77.2093, 28.6129],
                [77.2091, 28.6129],
                [77.2091, 28.6127]
            ]]
        }
    }]
}
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(invalid_geojson_1, f)
    temp_path = f.name

try:
    files = {'units': open(temp_path, 'rb')}
    data = {'user_role': 'surveyor'}
    r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
    print('Inverted Z status:', r.status_code)
    print(r.text[:500])
    files['units'].close()
finally:
    os.unlink(temp_path)

# Test 2: Self-intersecting footprint (bow-tie polygon)
print("\n=== Test 2: Self-intersecting footprint ===")
invalid_geojson_2 = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {
            "unit_code": "U_BOW",
            "floor_id": "floor-f01",
            "unit_type": "apartment",
            "label": "Bow-tie",
            "area_sqm": 50,
            "z_min_m": 3.5,
            "z_max_m": 6.5
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.2091, 28.6127],
                [77.2093, 28.6129],
                [77.2093, 28.6127],
                [77.2091, 28.6129],
                [77.2091, 28.6127]
            ]]
        }
    }]
}
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(invalid_geojson_2, f)
    temp_path = f.name

try:
    files = {'units': open(temp_path, 'rb')}
    data = {'user_role': 'surveyor'}
    r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
    print('Bow-tie status:', r.status_code)
    print(r.text[:500])
    files['units'].close()
finally:
    os.unlink(temp_path)

# Test 3: Missing required field (no floor_id)
print("\n=== Test 3: Missing floor_id ===")
invalid_geojson_3 = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {
            "unit_code": "U_NOF",
            "unit_type": "apartment",
            "label": "No floor",
            "area_sqm": 50,
            "z_min_m": 3.5,
            "z_max_m": 6.5
            # floor_id missing
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.2091, 28.6127],
                [77.2093, 28.6127],
                [77.2093, 28.6129],
                [77.2091, 28.6129],
                [77.2091, 28.6127]
            ]]
        }
    }]
}
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(invalid_geojson_3, f)
    temp_path = f.name

try:
    files = {'units': open(temp_path, 'rb')}
    data = {'user_role': 'surveyor'}
    r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
    print('No floor_id status:', r.status_code)
    print(r.text[:500])
    files['units'].close()
finally:
    os.unlink(temp_path)