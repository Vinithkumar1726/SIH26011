# 🚀 SIH26011 — GOD-LEVEL REBUILD PROMPT

> **Purpose:** Feed this entire prompt to an AI coding assistant to systematically rebuild the SIH26011 3D Cadastral Registry into a hackathon-winning, production-grade application.
> **Approach:** Use the existing codebase as a reference — preserve all working algorithms, spatial logic, and data — but completely restructure, polish, and extend the project.

---

## 🎯 PROJECT IDENTITY

**Project Name:** SIH26011 — 3D Cadastral Registry & Volumetric Property Intelligence Platform
**Hackathon:** Smart India Hackathon 2026
**One-Liner:** *"NAKSHA tells you which floor a flat is on. We make sure two flats can never legally claim the same cubic meter of space."*
**Problem:** India's current land registries (ULPIN, NAKSHA) are 2D — they cannot detect or prevent volumetric property overlaps in multi-story buildings (cantilevers, basements, duplexes, air rights). This platform extends them with real 3D geometry, tamper-evident hashing, and AI-powered building extraction.

---

## 📁 EXISTING CODEBASE REFERENCE

The current project lives at the workspace root. Key files to study and preserve logic from:

### Backend (preserve all spatial/geometry logic):
- `backend/app.py` — 2980-line monolith. Contains working PostGIS overlap SQL, 3D solid generation, SHA-256 hashing, EWKT serialization, volume calculation. **Split this into modules but keep every algorithm intact.**
- `backend/vision_engine.py` — YOLOv11 ONNX building segmentation pipeline. Keep as-is.
- `backend/aoi_service.py` — AOI tile mosaic service. Keep as-is.
- `backend/lidar_engine.py` — Open3D LiDAR elevation extraction. Keep as-is.
- `backend/imagery_providers.py` — Satellite tile fetching. Keep as-is.
- `backend/temporal.py` — SCD2 footprint diff stub. Keep and extend.
- `backend/ingest_catalog.py` — OSM building ingestion. Keep as-is.
- `migrations/001_initial_schema.sql` through `009_subterranean_utilities.sql` — Database schema. Preserve and extend.

### Frontend (preserve design tokens + 3D logic):
- `src/design/tokens.ts` — Neo-brutalist design system tokens. Preserve domain color mapping.
- `src/design/primitives.tsx` — Reusable UI primitives. Preserve and extend.
- `src/workspace3d/geo.ts` — Frontend geometry algorithms (solid generation, SHA-256, topology validation). Preserve all math.
- `src/workspace3d/data.ts` — Demo building/floor/unit data. Preserve.
- `src/workspace3d/underground.ts` — Underground pipe network. Preserve.
- `src/screens/Explorer3D.tsx` — 3284-line 3D explorer. **Split into sub-components but preserve all Three.js scene logic, raycasting, floor isolation, live map capture, AI analysis.**

### Data Assets (copy to new project):
- `public/coimbatore/` — city.glb (2.3MB), buildings_catalog.json (773KB), meta.json, cadastral_seed.json, underground_seed.json
- `test-data/` — parcel.geojson, buildings.geojson, floors.csv, units.geojson

---

## 🏗️ ARCHITECTURE — COMPLETE RESTRUCTURE

### Backend: Split `app.py` into Modular FastAPI Application

```
backend/
├── app.py                          # FastAPI app factory + lifespan + CORS (50 lines max)
├── config.py                       # Settings via pydantic-settings (DATABASE_URL, JWT_SECRET, etc.)
├── database.py                     # Async engine, session factory, Base
├── models/
│   ├── __init__.py
│   ├── parcel.py                   # LandParcel model
│   ├── building.py                 # Building model
│   ├── floor.py                    # Floor model
│   ├── unit.py                     # PropertyUnit model
│   ├── spatial_id.py               # SpatialIdentifier + History
│   ├── validation.py               # ValidationRun + ValidationIssue
│   ├── ai_proposal.py              # AIProposal model
│   ├── import_session.py           # ImportSession model
│   ├── user.py                     # AppUser model (add password_hash field)
│   └── audit.py                    # AuditLog model
├── schemas/
│   ├── __init__.py
│   ├── health.py
│   ├── dashboard.py
│   ├── import_schemas.py
│   ├── unit_schemas.py
│   ├── validation_schemas.py
│   └── ai_schemas.py
├── routes/
│   ├── __init__.py                 # Include all routers
│   ├── health.py                   # GET /api/health
│   ├── dashboard.py                # GET /api/stats, GET /api/statistics/*
│   ├── parcels.py                  # CRUD /api/parcels
│   ├── buildings.py                # CRUD /api/buildings
│   ├── floors.py                   # CRUD /api/floors
│   ├── units.py                    # CRUD + PUT geometry + GET history /api/units
│   ├── spatial_ids.py              # GET /api/spatial-identifiers
│   ├── import_routes.py            # POST /api/import/analyze, /api/import/persist
│   ├── validation.py               # POST /api/validation/run
│   ├── geometry_3d.py              # GET /api/3d/geometry
│   ├── ai_routes.py                # /api/ai/* (candidates, proposals, review, AOI scan)
│   ├── audit.py                    # GET /api/audit
│   ├── search.py                   # GET /api/search
│   ├── auth.py                     # POST /api/auth/login, /api/auth/refresh (NEW)
│   └── cadastral_parcels.py        # Live-capture parcel inspector
├── services/
│   ├── geometry_service.py         # generate_polyhedral_solid, hash_geometry, solid_to_ewkt, volume calculation — EXTRACT FROM app.py
│   ├── topology_service.py         # OVERLAP_PAIRS_SQL, NEW_SOLID_PAIRS_SQL, db_validate_topology — EXTRACT FROM app.py
│   ├── spatial_id_service.py       # Identifier generation, versioning logic — EXTRACT FROM app.py
│   ├── import_service.py           # File parsing, persist pipeline — EXTRACT FROM app.py
│   └── auth_service.py             # JWT token generation, password hashing (NEW)
├── middleware/
│   ├── auth_middleware.py          # JWT verification dependency (NEW)
│   └── rate_limit.py              # Simple rate limiter (NEW)
├── vision_engine.py                # KEEP AS-IS from existing
├── aoi_service.py                  # KEEP AS-IS from existing
├── lidar_engine.py                 # KEEP AS-IS from existing
├── imagery_providers.py            # KEEP AS-IS from existing
├── temporal.py                     # KEEP AS-IS from existing
├── ingest_catalog.py               # KEEP AS-IS from existing
└── requirements.txt                # Add: python-jose[cryptography], passlib[bcrypt]
```

### Frontend: Split Explorer3D + Proper Component Architecture

```
src/
├── main.tsx                        # Entry point
├── App.tsx                         # Shell (NO data hooks here — move to screens)
├── types.ts                        # Global screen/route types
├── vite-env.d.ts
├── index.css                       # Tailwind v4 import + global @font-face
│
├── api/
│   ├── client.ts                   # Base ApiClient class with interceptors, JWT header injection
│   ├── endpoints/
│   │   ├── health.ts
│   │   ├── dashboard.ts
│   │   ├── parcels.ts
│   │   ├── buildings.ts
│   │   ├── floors.ts
│   │   ├── units.ts
│   │   ├── import.ts
│   │   ├── validation.ts
│   │   ├── ai.ts
│   │   ├── spatial-ids.ts
│   │   ├── audit.ts
│   │   ├── search.ts
│   │   └── auth.ts                 # NEW: login, refresh, logout
│   └── types.ts                    # All API response interfaces (NO more `any`)
│
├── auth/
│   ├── AuthContext.tsx              # Real JWT auth context with token storage
│   ├── AuthGuard.tsx               # Route protection wrapper
│   ├── LoginScreen.tsx             # Proper login screen with neo-brutalist design
│   └── useAuth.ts                  # Auth hook
│
├── design/
│   ├── tokens.ts                   # PRESERVE existing — domain colors, surfaces, fonts
│   ├── primitives.tsx              # PRESERVE + EXTEND — add Toast, Modal, Skeleton, Tabs, DataTable
│   └── animations.ts              # NEW: shared framer-motion variants (fadeIn, slideUp, stagger, etc.)
│
├── hooks/
│   ├── useExplorerData.ts          # PRESERVE from existing
│   ├── useDashboardStats.ts        # EXTRACT from App.tsx
│   ├── useParcels.ts               # EXTRACT from App.tsx
│   ├── useUnits.ts                 # EXTRACT from App.tsx
│   ├── useValidation.ts            # EXTRACT from App.tsx
│   ├── useAuditTrail.ts            # EXTRACT from App.tsx
│   ├── useAICandidates.ts          # EXTRACT from App.tsx
│   └── useApiHealth.ts             # Health check polling
│
├── screens/
│   ├── Dashboard.tsx               # REBUILD — keep KPI cards, add real-time stats animation
│   ├── ImportWorkflow.tsx           # REBUILD — preserve 7-step logic, add drag-drop zone animation
│   ├── Explorer3D/                  # *** SPLIT THE 3284-LINE MONSTER ***
│   │   ├── index.tsx               # Main layout: left panel + canvas + right inspector
│   │   ├── Scene.tsx               # Three.js Canvas + camera + lights + postprocessing
│   │   ├── BuildingMesh.tsx        # Building solid mesh with materials
│   │   ├── FloorMesh.tsx           # Individual floor mesh with isolation animation
│   │   ├── UnitMesh.tsx            # Unit mesh with selection + conflict highlighting
│   │   ├── ParcelGround.tsx        # Ground plane / parcel footprint
│   │   ├── UndergroundPipes.tsx    # Synthetic pipe visualization
│   │   ├── CityModel.tsx           # GLB city model loader
│   │   ├── InspectorPanel.tsx      # Right panel: unit details, spatial ID, hash, QR
│   │   ├── FloorControls.tsx       # Floor isolation slider + explosion controls
│   │   ├── ToolBar.tsx             # View mode buttons, export, screenshot
│   │   ├── MiniMap.tsx             # Embedded MapLibre minimap
│   │   ├── LiveCapture.tsx         # Live map capture + AI analysis panel
│   │   ├── ConflictOverlay.tsx     # Overlap visualization overlay
│   │   └── hooks/
│   │       ├── useSceneState.ts    # Selected unit, floor filter, view mode
│   │       ├── useBuildingData.ts  # Building/floor/unit data loading
│   │       └── useConflicts.ts     # Conflict detection state
│   ├── PropertyRecords.tsx         # REBUILD — add DataTable with sort/filter/pagination
│   ├── PropertyDetail.tsx          # REBUILD — add version history timeline, geometry diff viewer
│   ├── Validation.tsx              # REBUILD — add animated validation progress, issue cards
│   ├── SpatialIdentifiers.tsx      # REBUILD — add copy-to-clipboard, version chain visualization
│   ├── AIReview.tsx                # REBUILD — add side-by-side comparison, confidence meters
│   ├── AuditTrail.tsx              # REBUILD — add timeline visualization, filterable log
│   └── Settings.tsx                # REBUILD — add theme switcher, CRS config, API status
│
├── components/
│   ├── Topbar.tsx                  # PRESERVE + polish
│   ├── Sidebar.tsx                 # PRESERVE + add collapse animation
│   ├── StatusBar.tsx               # PRESERVE + add real-time API latency
│   ├── SearchModal.tsx             # PRESERVE + add keyboard navigation
│   ├── CadastralHierarchy.tsx      # PRESERVE + add drag-to-explorer
│   ├── MapLibrePanel.tsx           # PRESERVE
│   ├── LiveMapPanel.tsx            # PRESERVE
│   ├── DashboardCityPreview.tsx    # PRESERVE
│   ├── AshPanel.tsx                # PRESERVE
│   ├── MobileNavDrawer.tsx         # PRESERVE
│   ├── PipelineStatus.tsx          # PRESERVE
│   ├── CollapsePanel.tsx           # PRESERVE
│   ├── ErrorBoundary.tsx           # NEW — catches Three.js crashes gracefully
│   ├── LoadingSkeleton.tsx         # NEW — animated skeleton loaders
│   ├── Toast.tsx                   # NEW — notification toasts
│   └── VersionTimeline.tsx         # NEW — spatial ID version chain visualization
│
├── workspace3d/
│   ├── geo.ts                      # PRESERVE — all geometry algorithms
│   ├── data.ts                     # PRESERVE — demo data
│   ├── types.ts                    # PRESERVE — 3D types
│   ├── api.ts                      # PRESERVE — hierarchy/building fetch
│   ├── underground.ts              # PRESERVE — pipe network
│   ├── underground.generated.ts    # PRESERVE
│   └── aiAnalysisService.ts        # PRESERVE
│
└── services/
    └── cadastral.ts                # PRESERVE — cadastral service layer
```

---

## 🎨 DESIGN SYSTEM V2 — NEO-BRUTALIST UPGRADE

### Preserve These Exact Tokens (from existing `tokens.ts`):
```
SURFACE.app    = #0B0E14 (near-black)
SURFACE.panel  = #131824
SURFACE.raised = #1B2233
SURFACE.input  = #0E1320

DOMAIN.spatial  = #00E5FF (cyan — maps, GIS, parcels)
DOMAIN.ai       = #FF2EA6 (magenta — AI proposals)
DOMAIN.ok       = #A3E635 (lime — passed, healthy)
DOMAIN.warn     = #FFB000 (amber — warnings)
DOMAIN.conflict = #FF3B30 (red — REAL conflicts ONLY)
DOMAIN.temporal = #8B5CF6 (violet — history, versions)
DOMAIN.record   = #F5C400 (gold — cadastral identity)
DOMAIN.info     = #3B82F6 (blue — informational)

BORDER = 3px solid #000000
SHADOW = 4px 4px 0 #000000
RADIUS = 0 (sharp corners — brutalist)
FONT.display = 'Space Grotesk'
FONT.body    = 'IBM Plex Sans'
FONT.mono    = 'IBM Plex Mono'
```

### Design Enhancements to Add:
1. **Micro-animations on every interactive element** — buttons shift shadow on press (from `4px 4px` to `2px 2px`), cards lift on hover
2. **Stagger animations** — dashboard KPI cards animate in with 100ms delay each
3. **Skeleton loading states** — pulsing dark rectangles that match card shapes while data loads
4. **Toast notifications** — slide in from top-right with domain-colored left border
5. **Page transitions** — subtle fade + slide between screens using `framer-motion` `AnimatePresence`
6. **Glowing accents** — `box-shadow: 0 0 20px rgba(domain-color, 0.3)` on active/focused elements
7. **Data tables** — striped rows with `SURFACE.panel` / `SURFACE.raised` alternation, sticky headers
8. **Empty states** — illustrated empty states with call-to-action buttons (not blank white space)
9. **Loading spinner** — custom spinning hexagon in `DOMAIN.spatial` color
10. **Context menus** — right-click on units/buildings for quick actions

### Typography Enhancement:
- Load Google Fonts in `index.css`:
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
  ```

---

## 🔧 CRITICAL FIXES TO IMPLEMENT

### Fix 1: Volume Calculation Bug
The existing code computes volumes in degree² (EPSG:4326) not m². In `services/geometry_service.py`, project footprint to local metres before volume calculation:
```python
def calculate_volume_m3(footprint_lonlat, z_min, z_max, origin_lonlat):
    """Volume in real cubic metres via equirectangular projection."""
    local_coords = [lonlat_to_local(lon, lat, origin_lonlat[0], origin_lonlat[1]) 
                    for lon, lat in footprint_lonlat]
    area_m2 = shoelace_area(local_coords)
    return area_m2 * (z_max - z_min)
```

### Fix 2: Replace ALL `any` Types
Every `useState<any>` and `useState<any[]>` in hooks MUST use proper interfaces from `api/types.ts`:
```typescript
// BAD:  const [parcels, setParcels] = useState<any[]>([]);
// GOOD: const [parcels, setParcels] = useState<Parcel[]>([]);
```

### Fix 3: Add ErrorBoundary for Three.js
```tsx
class WebGLErrorBoundary extends Component<{children: ReactNode, fallback?: ReactNode}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) return this.props.fallback || <WebGLErrorFallback />;
    return this.props.children;
  }
}
```

### Fix 4: Real JWT Authentication
```python
# backend/services/auth_service.py
from jose import jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])

def create_access_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": datetime.utcnow() + timedelta(hours=8)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

### Fix 5: Environment-Based CORS
```python
# backend/config.py
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8443").split(",")
```

---

## 📐 DATABASE SCHEMA ADDITIONS

Add these to the existing migrations:

```sql
-- 010_auth_enhancement.sql
ALTER TABLE app_user ADD COLUMN password_hash VARCHAR(128);
ALTER TABLE app_user ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_user ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 011_cascade_deletes.sql
ALTER TABLE building DROP CONSTRAINT building_parcel_id_fkey;
ALTER TABLE building ADD CONSTRAINT building_parcel_id_fkey 
    FOREIGN KEY (parcel_id) REFERENCES land_parcel(id) ON DELETE CASCADE;
-- (repeat for all FKs)

-- 012_performance_indexes.sql
CREATE INDEX idx_property_unit_type ON property_unit(unit_type);
CREATE INDEX idx_building_height ON building(height_m);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_ai_proposal_status ON ai_proposal(status);
```

---

## 🖥️ SCREEN-BY-SCREEN SPECIFICATIONS

### Screen 1: Dashboard
- 4 KPI metric cards with stagger animation (parcels, buildings, 3D solids, validation %)
- Real-time API health indicator (green dot pulsing)
- Activity timeline (last 10 events from audit log)
- System health bars (geometry integrity, attribute completeness, topology, spatial IDs)
- Isometric city preview (existing DashboardCityPreview component)
- Quick-action buttons: Import Data, Open 3D Explorer, Run Validation
- AI proposals pending count badge

### Screen 2: Import Workflow
- 7-step stepper with animated progress bar
- Drag-and-drop file zone with file type detection
- Step 1: Upload (GeoJSON + CSV)
- Step 2: Analyze (auto-detect CRS, count entities, show warnings)
- Step 3: Map Fields (column mapping UI)
- Step 4: AI Review (building extraction proposals)
- Step 5: Validate (3D topology checks)
- Step 6: Generate (spatial IDs + geometry hashes)
- Step 7: Explore (redirect to 3D Explorer)

### Screen 3: 3D Explorer (the star feature)
- **Left panel:** Floor isolation slider, view mode toggles, unit type filter
- **Center:** Three.js canvas with building mesh, floor explosion, unit selection, conflict red glow, underground pipes, city model context, postprocessing (Bloom + SSAO)
- **Right panel:** Selected unit inspector (spatial ID, geometry hash, area, volume, version, QR code, ownership, valuation)
- **Bottom:** Mini MapLibre map synced to 3D view
- **Top toolbar:** Screenshot, CSV export, toggle wireframe, toggle underground, fullscreen

### Screen 4: Property Records
- DataTable with columns: Spatial ID, Unit Code, Type, Floor, Area, Volume, Hash, Version, Status
- Sortable + filterable + paginated
- Click row → navigate to Property Detail
- Bulk export to CSV
- Search within table

### Screen 5: Property Detail
- Full unit card with all metadata
- Version history timeline (V01 → V02 → V03...) with geometry diff
- Geometry hash with copy button
- QR code for the spatial identifier
- 3D solid preview (small Three.js canvas showing just this unit)
- Audit log entries for this unit
- Related units on same floor

### Screen 6: Validation
- "Run Validation" button with animated progress
- Results grid: issue severity (HIGH/MEDIUM/LOW/INFO), code, message, entity
- 3D conflict visualization link (opens Explorer3D with conflict highlighted)
- Pass/fail summary with pie chart
- History of past validation runs

### Screen 7: Spatial Identifiers
- Table of all generated identifiers
- Format: `ULPIN-BLDG-FLOOR-UNIT-VERSION`
- Copy button for each
- Version chain visualization (mermaid-style)
- Link to parent parcel, building, floor

### Screen 8: AI Review
- Pending proposals queue
- Side-by-side: satellite tile vs. extracted footprint overlay
- Confidence score meter (IoU, agreement)
- Accept / Reject buttons with confirmation
- Height/floors override editor before approval
- Model info (SegFormer + DeepLabV3 dual-model verification)

### Screen 9: Audit Trail
- Timeline visualization of all system actions
- Filterable by: user, action type, entity type, date range
- Expandable rows showing full details JSON
- Export to CSV

### Screen 10: Settings
- API connection status + latency
- Project CRS configuration
- User profile + role display
- Theme customization (future)
- Database statistics

---

## ⚡ EXECUTION PLAN

### Phase 1: Foundation (do first)
1. Create new backend module structure (`models/`, `routes/`, `services/`, `schemas/`)
2. Extract all SQLAlchemy models from `app.py` into `models/*.py`
3. Extract geometry utilities into `services/geometry_service.py`
4. Extract topology SQL into `services/topology_service.py`
5. Create `config.py` with pydantic-settings
6. Create `database.py` with async engine
7. Wire up all routes in `routes/__init__.py`
8. Verify all 39 endpoints still work

### Phase 2: Frontend Architecture (do second)
1. Create `api/client.ts` with proper base client
2. Create `api/endpoints/*.ts` with typed methods
3. Create `api/types.ts` — define ALL interfaces (eliminate `any`)
4. Extract data hooks from `App.tsx` into `hooks/*.ts`
5. Clean `App.tsx` to just shell + routing
6. Add `ErrorBoundary.tsx`

### Phase 3: Explorer3D Split (do third — the hardest part)
1. Split `Explorer3D.tsx` into the 15 sub-files listed above
2. Create `hooks/useSceneState.ts` for shared 3D state
3. Verify: floor isolation, unit selection, conflict highlighting, live capture, AI analysis all still work
4. Add postprocessing toggle for low-end devices

### Phase 4: Design Polish (do fourth)
1. Add Google Fonts import to `index.css`
2. Create `design/animations.ts` with shared motion variants
3. Add skeleton loading to all screens
4. Add stagger animations to card grids
5. Add toast notification system
6. Add page transition animations
7. Add empty state illustrations

### Phase 5: Authentication & Security (do fifth)
1. Add `password_hash` to `app_user` model
2. Create JWT auth service
3. Create auth middleware
4. Create login screen
5. Add AuthGuard to protected routes
6. Add rate limiting middleware

### Phase 6: Final Polish (do last)
1. Fix volume calculation bug (project to metres)
2. Add version timeline component
3. Add DataTable component with sort/filter/pagination
4. Add screenshot/export from 3D Explorer
5. Write `docker-compose.yml` (PostgreSQL + backend + frontend)
6. Create comprehensive README with setup instructions
7. Run full validation pass

---

## 🚫 RULES — DO NOT VIOLATE

1. **NEVER delete working spatial/geometry logic** — only move it to proper modules
2. **NEVER use `any` type** — define proper interfaces for everything
3. **NEVER hardcode colors** — always use `DOMAIN.*` or `SURFACE.*` tokens
4. **NEVER put more than 300 lines in a single component file**
5. **NEVER use `useState<any>`** — always type your state
6. **ALWAYS preserve the 3px solid black borders and 4px offset shadows** — this is the brand
7. **ALWAYS use the domain-color mapping** (spatial=cyan, ai=magenta, ok=lime, conflict=red, etc.)
8. **ALWAYS add framer-motion animations** to interactive elements
9. **ALWAYS handle API errors gracefully** with user-friendly messages
10. **ALWAYS preserve existing test data files** — they are used for demos
11. **Use `npm` not `bun`** for package management
12. **Use Tailwind CSS v4** via the `@tailwindcss/vite` plugin (no config file needed)
13. **Backend stays on FastAPI + SQLAlchemy async** — no framework changes
14. **Frontend stays on React 19 + Vite 8 + TypeScript** — no framework changes
15. **All PostGIS SQL queries must be preserved exactly** — they are battle-tested
