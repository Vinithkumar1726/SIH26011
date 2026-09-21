# How to Run SIH26011 Project

## Prerequisites

Make sure you have installed:
- Python 3.11+ with pip
- Node.js 18+ with npm
- PostgreSQL 15+ with PostGIS extension

## Step 1: Setup Database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE sih26011;"

# Enable PostGIS extension
psql -U postgres -d sih26011 -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql
```

## Step 2: Setup Backend

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (if not already done)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (if not exists)
cp ../.env.example ../.env

# Edit .env with your database credentials
# DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/sih26011
```

## Step 3: Run SAT Algorithm Tests

```bash
# From project root
python test_sat.py
```

Expected output:
```
Running SAT overlap detection tests...

✓ Test 1 passed: Non-overlapping boxes correctly detected
✓ Test 2 passed: Overlapping boxes detected with volume 125.00
✓ Test 3 passed: Touching boxes correctly not detected as overlapping
✓ Test 4 passed: Different floors correctly not detected as overlapping

✅ All SAT tests passed!
```

## Step 4: Start Backend Server

```bash
# From backend directory (with venv activated)
python app.py
```

Expected output:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Verify backend is running:
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-03-18T..."
}
```

## Step 5: Setup Frontend

```bash
# From project root (new terminal)
npm install
```

## Step 6: Start Frontend Dev Server

```bash
npm run dev
```

Expected output:
```
  VITE v6.3.5  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 7: Access Application

Open your browser and navigate to:
```
http://localhost:5173
```

You should see the SIH26011 3D Cadastral Registry interface.

## Step 8: Test the Workflow

1. **Dashboard** - View statistics
2. **Import** - Upload GeoJSON/CSV files
3. **Analyze** - Review imported data
4. **Map Fields** - Configure field mappings
5. **AI Review** - Review AI proposals
6. **Validate** - Run topology validation
7. **Generate** - Create 3D solids
8. **Explore** - View 3D visualization

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `pg_isready`
- Verify database exists: `psql -U postgres -l | grep sih26011`
- Check .env file has correct DATABASE_URL
- Verify all dependencies installed: `pip list | grep -E "fastapi|sqlalchemy|geoalchemy2"`

### Frontend won't start
- Check Node version: `node --version` (should be 18+)
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check port 5173 is not in use

### SAT tests fail
- Verify numpy is installed: `pip list | grep numpy`
- Check Python version: `python --version` (should be 3.11+)
- Run with verbose output: `python -v test_sat.py`

### Database connection errors
- Verify PostGIS extension: `psql -U postgres -d sih26011 -c "SELECT * FROM pg_extension WHERE extname='postgis';"`
- Check connection string in .env
- Test connection: `psql -U postgres -d sih26011 -c "SELECT 1;"`

## Quick Verification Script

Create `verify.sh`:

```bash
#!/bin/bash

echo "=== Verifying SIH26011 Setup ==="

# Check Python
echo -n "Python version: "
python --version

# Check Node
echo -n "Node version: "
node --version

# Check PostgreSQL
echo -n "PostgreSQL: "
pg_isready

# Check database
echo -n "Database sih26011: "
psql -U postgres -lqt | cut -d \| -f 1 | grep -qw sih26011 && echo "exists" || echo "NOT FOUND"

# Check PostGIS
echo -n "PostGIS extension: "
psql -U postgres -d sih26011 -tAc "SELECT 1 FROM pg_extension WHERE extname='postgis';" | grep -q 1 && echo "installed" || echo "NOT INSTALLED"

# Run SAT tests
echo ""
echo "=== Running SAT Tests ==="
python test_sat.py

echo ""
echo "=== Setup Verification Complete ==="
```

Make it executable and run:
```bash
chmod +x verify.sh
./verify.sh
```

## Report Issues

If you encounter any issues:
1. Check the troubleshooting section above
2. Review error messages carefully
3. Verify all prerequisites are installed
4. Check database connection and permissions
5. Ensure all dependencies are installed in both backend and frontend

## Next Steps

After successful setup:
1. Import sample cadastral data
2. Test the complete workflow
3. Verify 3D visualization works
4. Test overlap detection with real data
5. Report any bugs or issues encountered
