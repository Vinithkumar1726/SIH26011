import requests
import json

# First, get a unit to update
r = requests.get('http://127.0.0.1:8000/api/units')
units = r.json()
unit = units[0]
print('Unit to update:', unit['id'])

# Update the z-range slightly (shrink by 0.1m)
update_data = {
    'z_min_m': 3.5,
    'z_max_m': 6.4,  # Shrink from 6.5 to 6.4
    'user_role': 'surveyor',
    'reason': 'Test geometry update - shrink z-range'
}

r = requests.put(f'http://127.0.0.1:8000/api/units/{unit["id"]}/geometry', json=update_data)
print('Update Status:', r.status_code)
print(r.text)