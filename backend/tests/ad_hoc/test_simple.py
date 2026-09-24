import requests

# Test 1: Update with valid z-range change (shrink by 0.1m)
print("=== Test 1: Valid z-range change ===")
r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json={
    'z_min_m': 3.5,
    'z_max_m': 6.4,
    'user_role': 'surveyor',
    'reason': 'Test geometry update - shrink z-range'
})
print('Test 1 Status:', r.status_code)
print('Response:', r.text)