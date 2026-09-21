import requests
r = requests.get('http://127.0.0.1:8000/api/units')
print('Status:', r.status_code)
data = r.json()
print('Units count:', len(data))
for u in data:
    print('  {}: footprint type={}, solid_geom={}'.format(u['id'], u['footprint']['type'], u['solid_geom']))
r2 = requests.get('http://127.0.0.1:8000/api/parcels/parcel-001')
print('Parcel status:', r2.status_code)
print('Parcel geometry type:', r2.json()['geometry']['type'])
r3 = requests.get('http://127.0.0.1:8000/api/properties/U0001')
print('Property status:', r3.status_code)
print('Property geometry hash:', r3.json().get('geometry_hash'))