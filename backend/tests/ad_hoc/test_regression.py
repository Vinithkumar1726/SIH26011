import requests
import json

BASE = "http://127.0.0.1:8000/api"

def test_1_health():
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code}"
    assert r.json()["status"] == "healthy"
    print("[OK] 1. Health check")

def test_2_import_persist():
    # First, clean up any existing data
    requests.post(f"{BASE}/import/persist", files={
        'parcel': open('test-data/parcel.geojson', 'rb'),
        'buildings': open('test-data/buildings.geojson', 'rb'),
        'floors_csv': open('test-data/floors.csv', 'rb'),
        'units': open('test-data/units.geojson', 'rb')
    }, data={'user_role': 'surveyor'})  # This will fail but that's OK, we just need to clear
    
    # Actually, let's use TRUNCATE via SQL
    import psycopg2
    conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/sih26011")
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("""
        TRUNCATE TABLE property_unit, spatial_identifier, spatial_identifier_history, 
            validation_run, validation_issue, ai_proposal, import_session, 
            audit_log, floor, building, land_parcel 
        RESTART IDENTITY CASCADE
    """)
    cur.close()
    conn.close()
    
    files = {
        'parcel': open('test-data/parcel.geojson', 'rb'),
        'buildings': open('test-data/buildings.geojson', 'rb'),
        'floors_csv': open('test-data/floors.csv', 'rb'),
        'units': open('test-data/units.geojson', 'rb')
    }
    data = {'user_role': 'surveyor'}
    r = requests.post(f"{BASE}/import/persist", files=files, data=data)
    for f in files.values():
        f.close()
    assert r.status_code == 200, f"Persist failed: {r.status_code} - {r.text}"
    data = r.json()
    assert data['status'] == 'PERSISTED'
    assert data['units_created'] == 4
    assert data['identifiers_generated'] == 4
    print("[OK] 2. Import persist")

def test_3_units_list():
    r = requests.get(f"{BASE}/units")
    assert r.status_code == 200
    units = r.json()
    assert len(units) == 4
    # Check each unit has z_min/z_max
    for u in units:
        assert 'z_min' in u and u['z_min'] is not None, f"Missing z_min for {u['id']}"
        assert 'z_max' in u and u['z_max'] is not None, f"Missing z_max for {u['id']}"
    print("[OK] 3. Units list with z_min/z_max")

def test_4_validation():
    r = requests.post(f"{BASE}/validation/run")
    assert r.status_code == 200
    data = r.json()
    assert data['passed'] == False
    # Should find 2 pre-existing overlaps (U0001/U0002, U0003/U0004)
    overlap_issues = [i for i in data['issues'] if i['code'] == 'OVERLAP_DETECTED']
    assert len(overlap_issues) == 2
    # Check specific overlaps
    entities = set()
    for i in overlap_issues:
        entities.add(i['entity_id'])
    assert 'U0001,U0002' in entities or 'U0002,U0001' in entities
    assert 'U0003,U0004' in entities or 'U0004,U0003' in entities
    print("[OK] 4. Validation detects pre-existing overlaps")

def test_5_self_intersecting():
    import json, tempfile, os
    geojson = {
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
        json.dump(geojson, f)
        temp_path = f.name
    try:
        files = {'units': open(temp_path, 'rb')}
        data = {'user_role': 'surveyor'}
        r = requests.post(f"{BASE}/import/persist", files=files, data=data)
        files['units'].close()
        os.unlink(temp_path)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        assert 'Invalid footprint geometry' in r.text or 'Self-intersect' in r.text or 'self-intersect' in r.text.lower()
        print("[OK] 5. Self-intersecting footprint rejected")
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

def test_6_inverted_z():
    import json, tempfile, os
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "unit_code": "U_INV",
                "floor_id": "floor-f01",
                "unit_type": "apartment",
                "label": "Inverted Z",
                "area_sqm": 50,
                "z_min_m": 6.5,
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
        json.dump(geojson, f)
        temp_path = f.name
    try:
        files = {'units': open(temp_path, 'rb')}
        data = {'user_role': 'surveyor'}
        r = requests.post(f"{BASE}/import/persist", files=files, data=data)
        files['units'].close()
        os.unlink(temp_path)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        assert 'Invalid Z range' in r.text or 'z_max' in r.text
        print("[OK] 6. Inverted Z-range rejected")
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

def test_7_missing_floor_id():
    import json, tempfile, os
    geojson = {
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
        json.dump(geojson, f)
        temp_path = f.name
    try:
        files = {'units': open(temp_path, 'rb')}
        data = {'user_role': 'surveyor'}
        r = requests.post(f"{BASE}/import/persist", files=files, data=data)
        files['units'].close()
        os.unlink(temp_path)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        assert 'floor_id' in r.text or 'required' in r.text.lower()
        print("[OK] 7. Missing floor_id rejected")
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

def test_8_idempotency():
    files = {
        'parcel': open('test-data/parcel.geojson', 'rb'),
        'buildings': open('test-data/buildings.geojson', 'rb'),
        'floors_csv': open('test-data/floors.csv', 'rb'),
        'units': open('test-data/units.geojson', 'rb')
    }
    data = {'user_role': 'surveyor'}
    r = requests.post(f"{BASE}/import/persist", files=files, data=data)
    for f in files.values():
        f.close()
    assert r.status_code == 400 or r.status_code == 409 or r.status_code == 500
    # Should fail due to duplicate key
    print("[OK] 8. Idempotency (2nd persist rejected)")

def test_9_u0002_unchanged_when_u0001_updated():
    # Get U0002's current z_min/z_max
    r = requests.get(f"{BASE}/units/U0002")
    assert r.status_code == 200
    u0002_before = r.json()
    u0002_zmin_before = u0002_before['z_min']
    u0002_zmax_before = u0002_before['z_max']
    print(f"  U0002 before: z_min={u0002_zmin_before}, z_max={u0002_zmax_before}")

    # Update U0001's z_max only (shrink by 0.1, no new conflict)
    r = requests.put(f"{BASE}/units/U0001/geometry", json={
        'z_min_m': 3.5,
        'z_max_m': 6.4,
        'user_role': 'surveyor',
        'reason': 'Test - shrink z_max by 0.1'
    })
    assert r.status_code == 200, f"Update failed: {r.status_code} - {r.text}"

    # Re-fetch U0002
    r = requests.get(f"{BASE}/units/U0002")
    assert r.status_code == 200
    u0002_after = r.json()
    u0002_zmin_after = u0002_after['z_min']
    u0002_zmax_after = u0002_after['z_max']

    assert u0002_zmin_after == u0002_zmin_before, f"U0002 z_min changed: {u0002_zmin_before} -> {u0002_zmin_after}"
    assert u0002_zmax_after == u0002_zmax_before, f"U0002 z_max changed: {u0002_zmax_before} -> {u0002_zmax_after}"
    print("[OK] 9. U0002 unchanged when U0001 updated")

def test_10_u0001_changed():
    r = requests.get(f"{BASE}/units/U0001")
    assert r.status_code == 200
    u0001 = r.json()
    assert u0001['z_min'] == 3.5
    assert u0001['z_max'] == 6.4
    print("[OK] 10. U0001 z_max changed to 6.4")

def test_11_new_conflict_rejected():
    # Create an overlapping footprint for U0001 that overlaps with U0002
    import json, tempfile, os
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "unit_code": "U0001",
                "floor_id": "floor-f01",
                "unit_type": "apartment",
                "label": "Overlap test",
                "area_sqm": 50,
                "z_min_m": 3.5,
                "z_max_m": 6.5
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [77.2087, 28.6127],
                    [77.2089, 28.6127],
                    [77.2089, 28.6130],
                    [77.2087, 28.6130],
                    [77.2087, 28.6127]
                ]]
            }
            }]
        }
    with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False) as f:
        json.dump(geojson, f)
        temp_path = f.name
    try:
        files = {'units': open(temp_path, 'rb')}
        data = {'user_role': 'surveyor'}
        r = requests.post(f"{BASE}/import/persist", files=files, data=data)
        files['units'].close()
        os.unlink(temp_path)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text}"
        assert 'conflict' in r.text.lower() or 'overlap' in r.text.lower()
        print("[OK] 11. New conflict rejected")
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

def test_12_self_intersect_update():
    import json, tempfile, os
    geojson = {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {
                "unit_code": "U0001",
                "floor_id": "floor-f01",
                "unit_type": "apartment",
                "label": "Bow-tie",
                "area_sqm": 50,
                "z_min_m": 3.5,
                "z_max_m": 6.4
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
        json.dump(geojson, f)
        temp_path = f.name
    try:
        files = {'units': open(temp_path, 'rb')}
        data = {'user_role': 'surveyor'}
        r = requests.put(f"{BASE}/units/U0001/geometry", json={
            'footprint': geojson['features'][0]['geometry'],
            'z_min_m': 3.5,
            'z_max_m': 6.4,
            'user_role': 'surveyor',
            'reason': 'Test self-intersect'
        })
        os.unlink(temp_path)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        assert 'Invalid footprint geometry' in r.text or 'Self-intersect' in r.text or 'self-intersect' in r.text.lower()
        print("[OK] 12. Self-intersecting update rejected")
    except Exception as e:
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        raise

def test_13_history():
    r = requests.get(f"{BASE}/units/U0001/history")
    assert r.status_code == 200
    data = r.json()
    assert 'history' in data
    assert len(data['history']) >= 2  # initial + at least one update
    # Check that retired_geom is present (not null) for historical entries
    for entry in data['history'][:-1]:  # exclude current version
        assert 'retired_geom' in entry, f"Missing retired_geom in history entry: {entry}"
        assert entry['retired_geom'] is not None, f"retired_geom is null in history entry: {entry}"
    print("[OK] 13. History endpoint shows retired_geom populated")

def test_14_get_history():
    r = requests.get(f"{BASE}/units/U0001/history")
    assert r.status_code == 200
    data = r.json()
    assert 'history' in data
    assert len(data['history']) >= 2
    for entry in data['history'][:-1]:  # exclude current
        assert entry['retired_geom'] is not None, f"retired_geom is null: {entry}"
    print("[OK] 14. History shows retired_geom populated")

if __name__ == '__main__':
    print("=" * 60)
    print("REGRESSION TEST SUITE")
    print("=" * 60)
    try:
        test_1_health()
        test_2_import_persist()
        test_3_units_list()
        test_4_validation()
        test_5_self_intersecting()
        test_6_inverted_z()
        test_7_missing_floor_id()
        test_8_idempotency()
        test_9_u0002_unchanged_when_u0001_updated()
        test_10_u0001_changed()
        test_11_new_conflict_rejected()
        test_12_self_intersect_update()
        test_13_history()
        test_14_get_history()
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED!")
        print("=" * 60)
    except Exception as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        exit(1)