import requests

# Try to persist the exact same data again
files = {
    'parcel': open('test-data/parcel.geojson', 'rb'),
    'buildings': open('test-data/buildings.geojson', 'rb'),
    'floors_csv': open('test-data/floors.csv', 'rb'),
    'units': open('test-data/units.geojson', 'rb')
}
data = {'user_role': 'surveyor'}
r = requests.post('http://127.0.0.1:8000/api/import/persist', files=files, data=data)
print('Second persist status:', r.status_code)
print(r.text)
for f in files.values(): f.close()