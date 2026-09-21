# SIH26011 Combined Project

This project combines the design-overview React/Vite interface with the fixed SIH26011 FastAPI/PostGIS backend and test data.

## Frontend

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build
pnpm dev
```

The frontend runs at `http://localhost:5173` by default.

## Backend

Install the backend requirements in a Python 3.11+ environment:

```bash
python -m pip install -r backend/requirements.txt
PYTHONPATH=. uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

The API health endpoint is `http://localhost:8000/api/health`.

The backend requires PostgreSQL/PostGIS for database-backed endpoints. Without a configured database, the health endpoint and database-independent AI proposal endpoint can respond, while statistics, records, geometry, and validation endpoints will return database errors.

## Project composition

- `src/` — design-overview React UI, including dashboard, import workflow, validation, AI review, records, identifiers, audit, settings, and Three.js explorer screens.
- `backend/` — fixed FastAPI backend.
- `migrations/` — fixed project database schema.
- `test-data/` — sample parcel, building, floor, and unit files.
- `dist/` — generated only by `pnpm build`; excluded from release archives.

The design screens currently retain their documented demo data presentation. The backend remains available as the real API service and requires PostgreSQL/PostGIS to provide live records.
