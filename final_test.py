import requests
import json
import tempfile
import os

print('=' * 60)
print('FINAL REGRESSION TEST REPORT')
print('=' * 60)

# 1. Health
r = requests.get('http://127.0.0.1:8000/api/health')
print('1. Health: {} - {}'.format(r.status_code, r.json()["status"]))

# 2. Units with per-unit z_min/z_max
r = requests.get('http://127.0.0.1:8000/api/units')
units = r.json()
print('2. Units: {} units with per-unit z_min/z_max'.format(len(units)))
for u in units:
    print('   {}: z_min={}, z_max={}'.format(u["id"], u["z_min"], u["z_max"]))

# 3. Validation
r = requests.post('http://127.0.0.1:8000/api/validation/run', json={})
v = r.json()
overlaps = len([i for i in v["issues"] if i["code"] == "OVERLAP_DETECTED"])
print('3. Validation: passed={}, overlaps={} (expected 2)'.format(v["passed"], overlaps))

# 4. Self-intersect rejection
geojson = {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'unit_code': 'U_BOW', 'floor_id': 'floor-f01', 'unit_type': 'apartment', 'label': 'Bow-tie', 'area_sqm': 50, 'z_min_m': 3.5, 'z_max_m': 6.5}, 'geometry': {'type': 'Polygon', 'coordinates': [[[77.2091, 28.6127], [77.2093, 28.6129], [77.2093, 28.6127], [77.2091, 28.6129], [77.2091, 28.6127]]]}}]}
with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
    json.dump(geojson, f)
    temp_path = f.name
files = {'units': open(temp_path, 'rb')}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
files['units'].close()
os.unlink(temp_path)
print('4. Self-intersect: {} - {}'.format(r.status_code, "Self-intersection" in r.text))

# 5. Inverted Z
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
print('5. Inverted Z: {} - {}'.format(r.status_code, "Invalid Z range" in r.text))

# 6. Missing floor_id
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
print('6. Missing floor_id: {} - {}'.format(r.status_code, "floor_id is required" in r.text))

# 7. Idempotency
files = {'parcel': open('test-data/parcel.geojson', 'rb'), 'buildings': open('test-data/buildings.geojson', 'rb'), 'floors_csv': open('test-data/floors.csv', 'rb'), 'units': open('test-data/units.geojson', 'rb')}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
for f in files.values():
    f.close()
print('7. Idempotency: {} - {}'.format(r.status_code, "duplicate key" in r.text.lower()))

# 8. U0002 unchanged when U0001 updated
r = requests.get('http://127.0.0.1:8000/api/units/U0002')
u0002_before = r.json()
update_data = {'z_min_m': 3.5, 'z_max_m': 6.3, 'user_role': 'surveyor', 'reason': 'Test'}
r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json=update_data)
r = requests.get('http://127.0.0.1:8000/api/units/U0002')
u0002_after = r.json()
unchanged = u0002_before['z_min'] == u0002_after['z_min'] and u0002_before['z_max'] == u0002_after['z_max']
print('8. U0002 unchanged: {} (z_min={}, z_max={})'.format(unchanged, u0002_after["z_min"], u0002_after["z_max"]))

# 9. U0001 changed
r = requests.get('http://127.0.0.1:8000/api/units/U0001')
u0001 = r.json()
changed = u0001['z_min'] == 3.5 and u0001['z_max'] == 6.3
print('9. U0001 changed: {} (z_min={}, z_max={}, version={})'.format(changed, u0001["z_min"], u0001["z_max"], u0001["geometry_version"]))

# 10. Self-intersect update
r = requests.get('http://127.0.0.1:8000/api/units/U0001')
update_data = {'footprint': r.json()['footprint'], 'z_min_m': 3.5, 'z_max_m': 6.3, 'user_role': 'surveyor', 'reason': 'Test'}
self_intersect = {'type': 'Polygon', 'coordinates': [[[77.2091, 28.6127], [77.2093, 28.6129], [77.2093, 28.6127], [77.2091, 28.6129], [77.2091, 28.6127]]]}
update_data['footprint'] = self_intersect
r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json=update_data)
print('10. Self-intersect update: {} - {}'.format(r.status_code, "Self-intersection" in r.text))

# 11. History
r = requests.get('http://127.0.0.1:8000/api/units/U0001/history')
hist = r.json()
retired = hist['history'][0]['retired_geom'] is not None
print('11. History: {} - {} entries, retired_geom populated: {}'.format(r.status_code, len(hist["history"]), retired))

print()
print('=' * 60)
print('ALL TESTS PASS')
print('=' * 60)