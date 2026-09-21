# SIH26011 - Quick Start Guide

**Purpose:** Get the system running and verify it works  
**Time Required:** 15-30 minutes  
**Prerequisites:** PostgreSQL with PostGIS, Python 3.11+, Node.js 18+

---

## Step 1: Setup Database (5 minutes)

```bash
# Create database
psql -U postgres -c "CREATE DATABASE sih26011;"

# Enable PostGIS
psql -U postgres -d sih26011 -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migration
psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql

# Verify
psql -U postgres -d sih26011 -c "\dt"
# Should show: land_parcel, building, floor, property_unit, etc.
```

---

## Step 2: Setup Backend (5 minutes)

```bash
# Navigate to backend
cd backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (if not exists)
cp ../.env.example ../.env

# Edit .env with your database credentials
# DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/sih26011
```

---

## Step 3: Test SAT Algorithm (2 minutes)

```bash
# From project root
python test_sat.py
```

**Expected Output:**
```
Running SAT overlap detection tests...

✓ Test 1 passed: Non-overlapping boxes correctly detected
✓ Test 2 passed: Overlapping boxes detected with volume 125.00
✓ Test 3 passed: Touching boxes correctly not detected as overlapping
✓ Test 4 passed: Different floors correctly not detected as overlapping

✅ All SAT tests passed!
```

**If this fails:** Report the error message.

---

## Step 4: Start Backend (2 minutes)

```bash
# From backend directory (with venv activated)
python app.py
```

**Expected Output:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Keep this terminal open.**

---

## Step 5: Test Backend Endpoints (3 minutes)

```bash
# In a NEW terminal (don't close the backend)
python test_backend.py
```

**Expected Output:**
```
============================================================
SIH26011 Backend Test Suite
============================================================

Checking if backend is running...
✅ Backend is running

Testing endpoints...
------------------------------------------------------------
✅ GET /api/health - 200
✅ GET /api/stats - 200
✅ GET /api/parcels - 200
✅ GET /api/statistics - 200
... (more tests)

------------------------------------------------------------
Results: X passed, 0 failed
============================================================

✅ All endpoints working!
```

**If any test fails:** Report which endpoint failed and the error message.

---

## Step 6: Test Import Workflow (5 minutes)

```bash
# With backend still running, test import
curl -X POST http://localhost:8000/api/import/persist \
  -F "parcel=@test-data/parcel.geojson" \
  -F "buildings=@test-data/buildings.geojson" \
  -F "floors_csv=@test-data/floors.csv" \
  -F "units=@test-data/units.geojson"
```

**Expected Response:**
```json
{
  "session_id": "imp-1234567890",
  "status": "PERSISTED",
  "parcels_created": 1,
  "buildings_created": 1,
  "floors_created": 8,
  "units_created": 4,
  "identifiers_generated": 4,
  "validation_passed": true,
  "validation_issues": 0
}
```

**Verify in database:**
```bash
psql -U postgres -d sih26011

# Check counts
SELECT COUNT(*) FROM land_parcel;      -- Expected: 1
SELECT COUNT(*) FROM building;         -- Expected: 1
SELECT COUNT(*) FROM floor;            -- Expected: 8
SELECT COUNT(*) FROM property_unit;    -- Expected: 4
SELECT COUNT(*) FROM spatial_identifier; -- Expected: 4

# Check a specific unit
SELECT id, unit_code, area_sqm, volume_cum, geometry_hash 
FROM property_unit LIMIT 1;

# Exit psql
\q
```

**If counts don't match:** Report the actual counts and any error messages.

---

## Step 7: Setup Frontend (3 minutes)

```bash
# From project root (in a new terminal)
npm install

# Start frontend
npm run dev
```

**Expected Output:**
```
  VITE v6.3.5  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Open browser to:** http://localhost:5173

---

## Step 8: Verify Frontend (2 minutes)

**What to check:**
1. Dashboard loads without errors
2. Open browser console (F12) - check for errors
3. Check Network tab - verify API calls to localhost:8000

**Current State:**
- ⚠️ Frontend still uses mock data (this is expected at this stage)
- ⚠️ 3D viewer uses Three.js (not Cesium yet)
- ⚠️ UI is dark theme (not the target white/navy/gold yet)

**This is OK for now.** We'll fix these in the next phase.

---

## Step 9: Report Results

After completing all steps, report back with:

### What Worked
- [ ] Database setup successful
- [ ] SAT tests passed
- [ ] Backend started successfully
- [ ] All API endpoints passed
- [ ] Import created correct counts
- [ ] Frontend loads without errors

### What Failed
- List any failures with error messages
- Include actual vs expected values

### Database Counts
```
land_parcel: X
building: X
floor: X
property_unit: X
spatial_identifier: X
```

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Check dependencies
pip list | grep -E "fastapi|sqlalchemy|geoalchemy2"

# Check database connection
psql -U postgres -d sih26011 -c "SELECT 1;"
```

### Import fails
```bash
# Check file paths
ls test-data/

# Check file format
cat test-data/parcel.geojson | head -20

# Check backend logs (in the terminal where backend is running)
```

### Frontend won't start
```bash
# Check Node version
node --version  # Should be 18+

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check port 5173 is not in use
netstat -ano | findstr :5173  # Windows
lsof -i :5173  # macOS/Linux
```

---

## Next Steps After Verification

Once you've verified everything works:

1. **Report results** (what passed, what failed)
2. **We'll proceed to Phase 2:** Remove mock data, connect frontend to real API
3. **Then Phase 3:** Implement CesiumJS viewer
4. **Then Phase 4:** UI redesign to match target screens

---

## Quick Reference Commands

```bash
# Start backend
cd backend && python app.py

# Start frontend
npm run dev

# Test SAT
python test_sat.py

# Test backend
python test_backend.py

# Test import
curl -X POST http://localhost:8000/api/import/persist \
  -F "parcel=@test-data/parcel.geojson" \
  -F "buildings=@test-data/buildings.geojson" \
  -F "floors_csv=@test-data/floors.csv" \
  -F "units=@test-data/units.geojson"

# Check database
psql -U postgres -d sih26011 -c "SELECT COUNT(*) FROM property_unit;"
```

---

**Created:** 2026-03-18  
**Purpose:** Step-by-step verification guide  
**Next:** Run these steps and report results
