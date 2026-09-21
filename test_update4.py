import requests
import json

# Test 1: Update with non-overlapping footprint
print("=== Test 1: Non-overlapping footprint ===")
footprint = {
    "type": "Polygon",
    "coordinates": [[
        [77.2091, 28.6127],
        [77.2093, 28.6127],
        [77.2093, 28.6129],
        [77.2091, 28.6129],
        [77.2091, 28.6127]
    ]}
]

r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json={
    'footprint': footprint,
    'z_min_m': 3.5,
    'z_max_m': 6.4,
    'user_role': 'surveyor',
    'reason': 'Test geometry update - move footprint'
})
print('Test 1 Status:', r.status_code)
print('Response:', r.text)

# Test 2: Update with overlapping footprint (should fail)
print("\n=== Test 2: Overlapping footprint ===")
footprint2 = {
    "type": "Polygon",
    "coordinates": [[
        [77.2087, 28.6127],
        [77.2089, 28.6127],
        [77.2089, 28.6129],
        [77.2087, 28.6129],
        [77.2087, 28.6127]
    ]}
]

r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json={
    'footprint': footprint2,
    'z_min_m': 3.5,
    'z_max_m': 6.4,
    'user_role': 'surveyor',
    'reason': 'Test geometry update - overlapping footprint'
})
print('Test 2 Status:', r.status_code)
print('Response:', r.text)

# Test 3: Invalid geometry (self-intersecting)
print("\n=== Test 3: Self-intersecting footprint ===")
footprint3 = {
    "type": "Polygon",
    "coordinates": [[
        [77.2091, 28.6127],
        [77.2093, 28.6129],
        [77.2093, 28.6127],
        [77.2091, 28.6129],
        [77.2091, 28.6127]
    ]}
]

r = requests.put('http://127.0.0.1:8000/api/units/U0001/geometry', json={
    'footprint': footprint3,
    'z_min_m': 3.5,
    'z_max_m': 6.4,
    'user_role': 'surveyor',
    'reason': 'Test geometry update - bow-tie'
})
print('Test 3 Status:', r.status_code)
print('Response:', r.text)