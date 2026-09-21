import requests
import json
import tempfile
import os

print("=" * 60)
print("REGRESSION TEST SUITE")
print("=" * 60)

# Test 1: Health check
r = requests.get('http://127.0.0.1:8000/api/health')
print('1. Health:', r.status_code, r.json()['status'])

# Test 2: Units list with per-unit z_min/z_max
r = requests.get('http://127.0.0.1:8000/api/units')
units = r.json()
print('2. Units list:', len(units), 'units')
for u in units:
    print(f'  {u["id"]}: z_min={u["z_min"]}, z_max={u["z_max"]}')

# Test 3: Validation
r = requests.post('http://127.0.0.1:8000/api/validation/run', json={})
print('3. Validation:', r.json()['passed'], 'issues:', len(r.json()['issues']))

# Test 4: Self-intersecting rejection
geojson = {
    'type': 'FeatureCollection', 
    'features': [{
        'type': 'Feature', 
        'properties': {
            'unit_code': 'U_BOW', 
            'floor_id': 'floor-f01', 
            'unit_type': 'apartment', 
            'label': 'Bow-tie', 
            'area_sqm': 50, 
            'z_min_m': 3.5, 
            'z_max_m': 6.5
        }, 
        'geometry': {
            'type': 'Polygon', 
            'coordinates': [[
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
    json.dump(geojson, f)
    temp_path = f.name
files = {'units': open(temp_path, 'rb')}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
files['units'].close()
os.unlink(temp_path)
print('4. Self-intersect:', r.status_code, 'Self-intersection' in r.text)

# Test 5: Inverted Z
geojson['features'][0]['properties']['unit_code'] = 'U_INV'
geojson['features'][0]['properties']['z_min_m'] = 6.5
geojson['features'][0]['properties']['z_max_m'] = 3.5
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(geojson, f)
    temp_path = f.name
files = {'units': open(temp_path, 'rb')}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
files['units'].close()
os.unlink(temp_path)
print('5. Inverted Z:', r.status_code, 'Invalid Z range' in r.text)

# Test 6: Missing floor_id
geojson['features'][0]['properties']['unit_code'] = 'U_NOF'
del geojson['features'][0]['properties']['floor_id']
geojson['features'][0]['properties']['z_min_m'] = 3.5
geojson['features'][0]['properties']['z_max_m'] = 6.5
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(geojson, f)
    temp_path = f.name
files = {'units': open(temp_path, 'rb')}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
files['units'].close()
os.unlink(temp_path)
print('6. Missing floor_id:', r.status_code, 'floor_id is required' in r.text)

# Test 7: Idempotency
files = {
    'parcel': open('test-data/parcel.geojson', 'rb'),
    'buildings': open('test-data/buildings.geojson', 'rb'),
    'floors_csv': open('test-data/floors.csv', 'rb'),
    'units': open('test-data/units.geojson', 'rb')
}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
for f in files.values():
    f.close()
print('7. Idempotency:', r.status_code, 'duplicate key' in r.text)

# Test 8: U0002 unchanged when U0001 updated
r = requests.get('http://127.0.0.1:8000/api/units/U0002')
u0002_before = r.json()
update_data = {'z_min_m': 3.5, 'z_max_m': 6.4, 'user_role': 'surveyor', 'reason': 'Test'}
r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json=update_data)
r = requests.get('http://127.0.0.1:8000/api/units/U0002')
u0002_after = r.json()
print('8. U0002 unchanged:', u0002_before['z_min'] == u0002_after['z_min'] and u0002_before['z_max'] == u0002_after['z_max'])

# Test 9: U0001 changed
r = requests.get('http://127.0.0.1:8000/api/units/U0001')
u0001 = r.json()
print('9. U0001 changed:', u0001['z_min'] == 3.5 and u0001['z_max'] == 6.4 and u0001['geometry_version'] == 2)

# Test 10: Self-intersecting update
r = requests.get('http://127.0.0.1:8000/api/units/U0001')
u0001 = r.json()
update_data = {'footprint': u0001['footprint'], 'z_min_m': 3.5, 'z_max_m': 6.4, 'user_role': 'surveyor', 'reason': 'Test'}
self_intersect = {
    'type': 'Polygon', 
    'coordinates': [[
        [77.2091, 28.6127], 
        [77.2093, 28.6129], 
        [77.2093, 28.6127], 
        [77.2091, 28.6129], 
        [77.2091, 28.6127]
    ]]
}
update_data['footprint'] = self_intersect
r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json=update_data)
print('10. Self-intersect update:', r.status_code, 'Self-intersection' in r.text)

# Test 11: History endpoint
r = requests.get('http://127.0.0.1:8000/api/units/U0001/history')
hist = r.json()
print('11. History:', r.status_code, len(hist['history']), 'entries, retired_geom present:', hist['history'][0]['retired_geom'] is not None)

print()
print("=" * 60)
print("ALL TESTS COMPLETE")
print("=" * 60)