# SIH26011 – 3D Cadastral Registry

**Smart India Hackathon 2026 · Prototype**

> NAKSHA already tells you which floor a flat is on. We make sure two flats can never legally claim the same cubic meter of space.

A standards-aware prototype that adds a validated 3D geometric layer beneath property records that today carry only floor/area attributes. It builds on two existing Department of Land Resources (DoLR) programmes:

- **ULPIN** – 14-digit land parcel ID.
- **NAKSHA / UrPro** – DoLR's urban survey programme (drone, LiDAR, DEM, 3D reality models).

This project proposes a standards-aligned extension of the ECCMA/ISO 8000-118 family already behind ULPIN. It is **not** part of the deployed ULPIN system, and it does not adjudicate legal ownership. The system detects duplicate or overlapping volumetric spatial claims using computational 3D topology validation.

---

## Features

- Real 3D geometry (PostGIS `POLYHEDRALSURFACE Z`) for property units
- SHA-256 geometry hash for integrity checking
- 3D topology validation (duplicate/overlapping volume detection)
- Versioned spatial identifiers (`-V01`, `-V02`, …) with retained geometry history
- Interactive 3D explorer (Three.js / React Three Fiber)
- 7-step workflow with a mandatory human review gate for AI proposals

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| 3D | Three.js, React Three Fiber |
| Backend | FastAPI (Python 3.11+), SQLAlchemy |
| Database | PostgreSQL 15+ with PostGIS 3.4 |
| GIS | Shapely, GeoJSON |
| AI (reference) | SegFormer (MiT-B0), DeepLabV3 (ResNet-50) |

## Architecture

```
React / Vite (5173)  ──HTTP REST──►  FastAPI (8000)  ──SQLAlchemy──►  PostgreSQL + PostGIS (5432)
   Three.js 3D                        Python 3.11+                       3D geometry
```

## Workflow

1. **Import** – upload parcel / building / floor / unit files (GeoJSON, CSV)
2. **Analyze** – inspect geometry, detect CRS, count features
3. **Map Fields** – configure field mappings
4. **AI Review** – review AI-generated proposals (human approval required)
5. **Validate** – run 3D topology validation
6. **Generate** – persist 3D solids to the database
7. **Explore** – view results in the 3D viewer

AI proposals never write directly to the cadastral record.

---

## Getting Started (Windows)

### Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| PostgreSQL + PostGIS | 15+ | Tick "PostGIS" in the installer; note the `postgres` password |
| Python | 3.11+ | Tick "Add Python to PATH" |
| Node.js | 18+ (LTS) | https://nodejs.org/ |

### Install

Run from Command Prompt (CMD):

```cmd
cd sih26011
powershell -ExecutionPolicy Bypass -File setup-windows.ps1
```

The script checks prerequisites, creates the Python virtual environment, installs dependencies, creates the database, runs migrations and writes the `.env` file.

### Run

**Terminal 1 – Backend**

```cmd
backend\venv\Scripts\activate.bat
python backend\app.py
```

**Terminal 2 – Frontend**

```cmd
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

### Environment (`.env`)

```env
VITE_API_URL=http://localhost:8000
```

Database credentials are also read from `.env`. Never commit this file.

---

## Project Structure

```
sih26011/
├── backend/
│   ├── app.py                  # FastAPI backend
│   └── requirements.txt
├── migrations/
│   └── 001_initial_schema.sql  # PostgreSQL / PostGIS schema
├── src/
│   ├── App.tsx                 # Main app
│   ├── api.ts                  # HTTP client
│   ├── geo.ts                  # Geometry algorithms
│   ├── data.ts                 # Demo data
│   ├── types.ts                # TypeScript types
│   └── index.css               # Tailwind styles
├── setup-windows.ps1           # Automated setup
├── INTEGRATION_GUIDE.md        # Detailed setup
├── FINAL_STATUS.md             # Implementation status
└── README.md
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `land_parcel` | 2D surface parcels (ULPIN-linked) |
| `building` | Footprints and 3D solids |
| `floor` | Floor levels with z-ranges |
| `property_unit` | Units with 3D geometry |
| `spatial_identifier` | Versioned 3D identifiers |
| `spatial_identifier_history` | Retired versions |
| `validation_run` | Validation audit trail |
| `ai_proposal` | AI extraction proposals |
| `import_session` | Import audit trail |

Each property unit stores: 2D footprint (Polygon), `z_min`, `z_max`, `solid_geom` (PolyhedralSurfaceZ), `geometry_hash` (SHA-256) and `geometry_version` (V01, V02, …).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Dashboard statistics |
| POST | `/api/import/analyze` | Analyze uploaded files |
| POST | `/api/import/persist` | Persist to database |
| POST | `/api/validation/run` | Run topology validation |
| GET | `/api/3d/geometry` | Get 3D geometry |
| GET | `/api/spatial-identifiers` | List identifiers |

Full interactive docs: http://localhost:8000/docs (backend running).

---

## Development

```cmd
:: Frontend
npm run dev
npm run build
npm run typecheck

:: Backend (auto-reload)
backend\venv\Scripts\activate.bat
uvicorn backend.app:app --reload --port 8000

:: Database
psql -U postgres -d sih26011
psql -U postgres -d sih26011 -f migrations\001_initial_schema.sql
```

## Verification

```cmd
curl http://localhost:8000/api/health
psql -U postgres -d sih26011 -c "SELECT COUNT(*) FROM land_parcel;"
```

Expected health response: `{"status":"healthy","version":"1.0.0","timestamp":"..."}`

Then open http://localhost:5173, press F12, and confirm successful calls to `localhost:8000` in the Network tab. Finally, run the full 7-step workflow with the test files described in `INTEGRATION_GUIDE.md`.

## Troubleshooting

**"Database initialization failed"**

```cmd
sc query type= service state= all | findstr /i postgresql
psql -U postgres -l
notepad .env
```

**"Network error" in the frontend** – confirm the backend is running (`curl http://localhost:8000/api/health`) and `VITE_API_URL` in `.env` is correct.

**"relation does not exist"** – run the migration:

```cmd
psql -U postgres -d sih26011 -f migrations\001_initial_schema.sql
```

**"PostGIS not available"** – in `psql`:

```sql
CREATE EXTENSION postgis;
```

**Reset everything**

```cmd
psql -U postgres -c "DROP DATABASE IF EXISTS sih26011;"
psql -U postgres -c "CREATE DATABASE sih26011;"
psql -U postgres -d sih26011 -f migrations\001_initial_schema.sql

rmdir /s /q node_modules
npm install

rmdir /s /q backend\venv
python -m venv backend\venv
backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt
```

---

## Project Status

| Area | Status |
|------|--------|
| Frontend UI and 3D viewer | Working |
| Geometry algorithms (`geo.ts`) | Implemented |
| Backend API | Implemented; integration testing in progress |
| Database schema and migrations | Implemented; integration testing in progress |
| File upload and persistence | Implemented; integration testing in progress |
| AI models (SegFormer / DeepLabV3) | Reference only; model weights not bundled |
| Authentication | Not implemented (user model exists, no login UI) |
| Automated tests | None yet; manual testing only |

## Before Production

- Change the default database password
- Serve over HTTPS and restrict CORS origins
- Add authentication and rate limiting
- Enable database SSL, backups and logging
- Use connection pooling

Production backend (Linux; `gunicorn` does not run on Windows):

```bash
pip install gunicorn
gunicorn backend.app:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

Frontend: `npm run build`, then serve `dist/` with nginx or any static host.

---

## Disclaimer

This is a hackathon prototype. Spatial identifiers generated here are prototype identifiers, not official ULPIN or NAKSHA records, and validation results are not legal determinations of ownership.

## License

Add a `LICENSE` file before publishing (e.g. MIT). No licence is currently declared.

## Credits

Built for **Smart India Hackathon 2026**, problem statement **SIH26011** – 3D Cadastral Registry.
Team: SIH26011 Development Team
