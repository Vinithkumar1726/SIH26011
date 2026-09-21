import requests

r = requests.get('http://127.0.0.1:8000/api/units')
units = r.json()
for u in units:
    print(f"{u['id']}: z_min={u.get('z_min')}, z_max={u.get('z_max')}")