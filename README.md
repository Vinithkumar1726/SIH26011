# SIH26011 - 3D Cadastral Registry

**Smart India Hackathon 2026 Project**  
**Status:** Code Complete - Ready for Integration Testing

---

## Quick Start (Windows)

### Prerequisites

Before running, install:

1. **PostgreSQL 15+ with PostGIS**
   - Download: https://www.postgresql.org/download/windows/
   - During installation, check "Install PostGIS"
   - Remember your postgres password

2. **Python 3.11+**
   - Download: https://www.python.org/downloads/
   - ✓ Add Python to PATH

3. **Node.js 18+**
   - Download: https://nodejs.org/
   - Use LTS version

### Installation

```powershell
# Clone or extract the project
cd sih26011

# Run automated setup
.\setup-windows.ps1
```

The setup script will:
- Check all prerequisites
- Create Python virtual environment
- Install dependencies
- Create PostgreSQL database
- Run migrations
- Configure environment

### Running the Application

**Terminal 1 - Backend:**
```powershell
.\backend\venv\Scripts\Activate.ps1
python backend/app.py
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
```

**Open Browser:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Project Overview

SIH26011 extends India's ULPIN (land parcel ID) and NAKSHA (urban survey) systems with real 3D volumetric property management.

**Key Features:**
- Real 3D geometry (PolyhedralSurfaceZ) for property units
- SHA-256 geometry hashing for integrity
- 3D topology validation (overlap detection)
- Versioned spatial identifiers (V01, V02, ...)
- Interactive Three.js 3D explorer
- Complete 7-step workflow

**One-liner:**  
*"NAKSHA already tells you which floor a flat is on. We make sure two flats can never legally claim the same cubic meter of space."*

---

## Architecture

```
┌─────────────────┐
│   React/Vite    │  Port 5173
│   Frontend      │  Three.js 3D
└────────┬────────┘
         │ HTTP REST
         │
┌────────▼────────┐
│    FastAPI      │  Port 8000
│    Backend      │  Python 3.11+
└────────┬────────┘
         │ SQLAlchemy
         │
┌────────▼────────┐
│  PostgreSQL     │  Port 5432
│  + PostGIS      │  3D Geometry
└─────────────────┘
```

---

## Technology Stack

| Layer | Technology | Status |
|-------|-----------|--------|
| Frontend | React 18 + TypeScript + Tailwind | ✅ Working |
| 3D Rendering | Three.js + React Three Fiber | ✅ Working |
| Backend | FastAPI (Python 3.11+) | ✅ Code Complete |
| Database | PostgreSQL 15 + PostGIS 3.4 | ✅ Schema Complete |
| GIS | Shapely, GeoJSON | ✅ Implemented |
| AI | SegFormer/DeepLabV3 | ⚠️ Reference Only |

---

## Complete Workflow

1. **Import** - Upload parcel/building/floor/unit files (GeoJSON/CSV)
2. **Analyze** - Inspect geometry, detect CRS, count features
3. **Map Fields** - Configure field mappings
4. **AI Review** - Review AI-generated proposals (human gate)
5. **Validate** - Run 3D topology validation
6. **Generate** - Persist 3D solids to database
7. **Explore** - Interactive Three.js 3D viewer

---

## Database Schema

### Core Tables

- `land_parcel` - 2D surface parcels (ULPIN-linked)
- `building` - Building footprints + 3D solids
- `floor` - Floor levels with z-ranges
- `property_unit` - Individual units with 3D geometry
- `spatial_identifier` - Versioned 3D IDs
- `spatial_identifier_history` - Previous versions
- `validation_run` - Validation audit trail
- `ai_proposal` - AI extraction proposals
- `import_session` - Import audit trail

### 3D Geometry

Each property unit stores:
- 2D footprint (Polygon)
- z_min, z_max (elevation range)
- solid_geom (PolyhedralSurfaceZ)
- geometry_hash (SHA-256)
- geometry_version (V01, V02, ...)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/import/analyze` | Analyze uploaded files |
| POST | `/api/import/persist` | Persist to database |
| POST | `/api/validation/run` | Run topology validation |
| GET | `/api/3d/geometry` | Get 3D geometry |
| GET | `/api/spatial-identifiers` | Get all identifiers |

**Full API docs:** http://localhost:8000/docs (when backend running)

---

## File Structure

```
sih26011/
├── backend/
│   ├── app.py                 # FastAPI backend (700+ lines)
│   └── requirements.txt       # Python dependencies
├── migrations/
│   └── 001_initial_schema.sql # PostgreSQL schema
├── src/
│   ├── App.tsx                # Main app (1000+ lines)
│   ├── api.ts                 # HTTP client
│   ├── geo.ts                 # Geometry algorithms
│   ├── data.ts                # Demo data
│   ├── types.ts               # TypeScript types
│   └── index.css              # Tailwind styles
├── setup-windows.ps1          # Automated setup
├── INTEGRATION_GUIDE.md       # Setup instructions
├── FINAL_STATUS.md            # Implementation status
└── README.md                  # This file
```

---

## Testing

### Verify Backend

```powershell
# Check health
curl http://localhost:8000/api/health

# Should return:
# {"status":"healthy","version":"1.0.0","timestamp":"..."}
```

### Verify Database

```powershell
# Connect to database
psql -U postgres -d sih26011

# Check tables
\dt

# Check data
SELECT COUNT(*) FROM land_parcel;
SELECT COUNT(*) FROM property_unit;
```

### Verify Frontend

1. Open http://localhost:5173
2. Open Developer Console (F12)
3. Check Network tab
4. Should see successful API calls to localhost:8000

### Test Complete Workflow

1. Click "Import"
2. Upload test files (see INTEGRATION_GUIDE.md)
3. Progress through all 7 steps
4. Verify data in database
5. Open "Explore" step
6. Click on 3D units
7. Verify spatial identifiers

---

## Troubleshooting

### Backend won't start

**Error: "Database initialization failed"**
```powershell
# Check PostgreSQL is running
Get-Service postgresql*

# Check database exists
psql -U postgres -l

# Check .env credentials
notepad .env
```

### Frontend won't connect

**Error: "Network error"**
```powershell
# Verify backend is running
curl http://localhost:8000/api/health

# Check .env has correct URL
notepad .env
# VITE_API_URL=http://localhost:8000
```

### Database errors

**Error: "relation does not exist"**
```powershell
# Run migrations
psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql
```

**Error: "PostGIS not available"**
```sql
-- In psql
CREATE EXTENSION postgis;
```

---

## Important Notes

### What Works (Verified)

✅ **Frontend** - All UI screens working  
✅ **3D Visualization** - Three.js rendering perfect  
✅ **Geometry Algorithms** - All math verified  
✅ **Build Process** - Compiles without errors  
✅ **Code Quality** - TypeScript, documented  

### What Needs Testing (On Your Machine)

⚠️ **Backend API** - Code complete, needs running server  
⚠️ **Database** - Schema complete, needs PostgreSQL  
⚠️ **File Upload** - Code written, needs testing  
⚠️ **Data Persistence** - Logic implemented, needs verification  
⚠️ **End-to-End** - All code written, needs integration test  

### What's Not Implemented

❌ **AI Models** - Reference only (would need model files)  
❌ **Authentication** - User model exists, no login UI  
❌ **Automated Tests** - Manual testing only  

---

## Documentation

- **INTEGRATION_GUIDE.md** - Complete setup instructions
- **FINAL_STATUS.md** - Detailed implementation status
- **backend/app.py** - Backend code with inline docs
- **migrations/001_initial_schema.sql** - Database schema
- **http://localhost:8000/docs** - API documentation (when running)

---

## Development

### Frontend Development

```powershell
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

### Backend Development

```powershell
# Activate virtual environment
.\backend\venv\Scripts\Activate.ps1

# Run with auto-reload
python backend/app.py

# Or with uvicorn directly
uvicorn backend.app:app --reload --port 8000
```

### Database Development

```powershell
# Connect to database
psql -U postgres -d sih26011

# Run migrations
psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql

# Reset database
psql -U postgres -c "DROP DATABASE sih26011;"
psql -U postgres -c "CREATE DATABASE sih26011;"
```

---

## Deployment

### Backend (Production)

```powershell
# Install gunicorn
pip install gunicorn

# Run with multiple workers
gunicorn backend.app:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

### Frontend (Production)

```powershell
# Build
npm run build

# Serve dist/ folder with nginx or any static server
```

### Database (Production)

- Use connection pooling
- Enable SSL
- Set up automated backups
- Monitor with pgAdmin

---

## Security Checklist

- [ ] Change default database password
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Implement authentication
- [ ] Add rate limiting
- [ ] Enable database SSL
- [ ] Set up logging
- [ ] Regular security updates

---

## Support

For issues:

1. Check **INTEGRATION_GUIDE.md** for detailed setup
2. Check **FINAL_STATUS.md** for implementation status
3. Check backend logs (Terminal 1)
4. Check browser console (F12)
5. Verify database with psql commands

---

## License

Smart India Hackathon 2026 Project  
Ministry of Rural Development, Government of India

---

## Credits

**Developed for:** SIH26011 - 3D Cadastral Registry  
**Problem Statement:** Extending ULPIN + NAKSHA with 3D geometry  
**Team:** SIH26011 Development Team  
**Date:** 2026-03-18

---

## Quick Reference

### Start Everything

```powershell
# Terminal 1 - Backend
.\backend\venv\Scripts\Activate.ps1
python backend/app.py

# Terminal 2 - Frontend
npm run dev

# Browser
# http://localhost:5173
```

### Check Status

```powershell
# Backend health
curl http://localhost:8000/api/health

# Database
psql -U postgres -d sih26011 -c "SELECT COUNT(*) FROM land_parcel;"

# Frontend
# Open http://localhost:5173
```

### Reset Everything

```powershell
# Reset database
psql -U postgres -c "DROP DATABASE IF EXISTS sih26011;"
psql -U postgres -c "CREATE DATABASE sih26011;"
psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql

# Reset frontend
rm -rf node_modules
npm install

# Reset backend
rm -rf backend/venv
python -m venv backend/venv
.\backend\venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

---

**Ready to run:** `.\setup-windows.ps1`  
**Documentation:** See INTEGRATION_GUIDE.md  
**Status:** See FINAL_STATUS.md
