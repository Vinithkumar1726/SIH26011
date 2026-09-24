import requests
import json
import tempfile
import os

# First, let's test the validation endpoint on current data (should be clean)
print("=== Testing validation on clean data ===")
r = requests.post('http://127.0.0.1:8000/api/validation/run')
print('Validation status:', r.status_code)
print(r.text)

# Now create a conflicting unit by persisting a unit that overlaps with U0001
# U0001 is at [77.2086, 28.6126] to [77.209, 28.613], z=3.5-6.5
# Create a unit that overlaps in the same floor
conflict_geojson = {
    "type": "FeatureCollection",
    "features": [{
        "type": "Feature",
        "properties": {
            "unit_code": "U0005",
            "floor_id": "floor-f01",
            "unit_type": "apartment",
            "label": "Overlapping Unit",
            "area_sqm": 50,
            "z_min_m": 3.5,
            "z_max_m": 6.5
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [77.2087, 28.6127],
                [77.2089, 28.6127],
                [77.2089, 28.6129],
                [77.2087, 28.6129],
                [77.2087, 28.6127]
            ]]
        }
    }]
}

# Write to temp file
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(conflict_geojson, f)
    temp_path = f.name

try:
    print("\n=== Persisting conflicting unit ===")
    files = {'units': open(temp_path, 'rb')}
    data = {'user_role': 'surveyor'}
    r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
    print('Persist status:', r.status_code)
    print(r.text)
    files['units'].close()
finally:
    os.unlink(temp_path)

# Now run validation again
print("\n=== Validation after adding conflicting unit ===")
r = requests.post('http://127.0.0.1:8000/api/validation/run')
print('Validation status:', r.status_code)
print(r.text)