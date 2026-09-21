# SIH26011 - Implementation Plan

**Date:** 2026-03-18  
**Goal:** Build 4 target screens wired to real backend data  
**Rule:** No claiming anything works until actually verified by execution

---

## Phase 1: Backend Foundation (CRITICAL)

### 1.1 Fix Backend Persistence
**Current State:** `/api/import/persist` is a stub  
**Target:** Actually save data to database

**Tasks:**
- [ ] Implement real file parsing (GeoJSON, CSV)
- [ ] Create actual database records
- [ ] Generate real 3D solids from footprints
- [ ] Calculate real geometry hashes
- [ ] Create real spatial identifiers
- [ ] Return actual success/failure

**Files to Modify:**
- `backend/app.py` - persist_import endpoint

**Verification:**
```bash
# Start backend
cd backend && python app.py

# Test with real GeoJSON file
curl -X POST http://localhost:8000/api/import/persist \
  -F "parcel=@test-parcel.geojson"

# Verify database has data
psql -U postgres -d sih26011 -c "SELECT COUNT(*) FROM land_parcel;"
```

### 1.2 Add Missing API Endpoints
**Current State:** Only 9 endpoints exist  
**Target:** Add endpoints needed for the 4 screens

**New Endpoints Needed:**
```
GET  /api/parcels                    - List all parcels
GET  /api/parcels/{id}               - Get parcel detail with hierarchy
GET  /api/buildings/{id}             - Get building detail
GET  /api/floors/{id}                - Get floor detail
GET  /api/properties/{id}            - Get property unit detail
GET  /api/statistics                 - Dashboard statistics
GET  /api/statistics/buildings-by-height  - Chart data
GET  /api/statistics/validation-state     - Validation donut data
GET  /api/ai/candidates              - AI proposals pending review
GET  /api/search                     - Global search
GET  /api/audit                      - Audit trail
```

**Files to Modify:**
- `backend/app.py` - add new endpoints

**Verification:**
```bash
# Test each endpoint
curl http://localhost:8000/api/parcels
curl http://localhost:8000/api/statistics
```

### 1.3 Fix Authentication
**Current State:** Role check is client-side only  
**Target:** JWT-based authentication

**Tasks:**
- [ ] Add JWT token generation
- [ ] Add login endpoint
- [ ] Add auth middleware
- [ ] Protect sensitive endpoints
- [ ] Store user sessions

**Files to Modify:**
- `backend/app.py` - add auth
- `backend/requirements.txt` - add python-jose

**Verification:**
```bash
# Test auth flow
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# Use token
curl http://localhost:8000/api/parcels \
  -H "Authorization: Bearer <token>"
```

---

## Phase 2: Frontend Foundation (CRITICAL)

### 2.1 Remove Mock Data Dependency
**Current State:** App.tsx imports from src/data.ts  
**Target:** All data from API

**Tasks:**
- [ ] Remove mock data imports from App.tsx
- [ ] Create API service layer
- [ ] Add loading states
- [ ] Add error states
- [ ] Add empty states

**Files to Modify:**
- `src/App.tsx` - remove mock imports
- `src/api.ts` - add missing methods
- Create `src/services/` - API service layer

**Verification:**
- Open browser console
- Verify no imports from './data' except utility functions
- Verify all data comes from API calls

### 2.2 Create Design System
**Current State:** Ad-hoc styling  
**Target:** Consistent design tokens

**Tasks:**
- [ ] Define color palette (navy, gold, cream)
- [ ] Define spacing scale
- [ ] Define typography scale
- [ ] Create shared components:
  - Header
  - Sidebar
  - Card
  - Badge/Pill
  - Button
  - Status indicator

**Files to Create:**
- `src/components/ui/Header.tsx`
- `src/components/ui/Sidebar.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Button.tsx`
- `src/styles/design-tokens.ts`

**Verification:**
- Import components in test file
- Verify consistent styling

### 2.3 Remove JUPEM/Malaysia Branding
**Current State:** Malaysian government references  
**Target:** SIH26011 branding only

**Tasks:**
- [ ] Remove all JUPEM references
- [ ] Remove Malaysian district names
- [ ] Remove "Sdn. Bhd." references
- [ ] Add SIH26011 branding
- [ ] Make branding configurable

**Files to Modify:**
- `src/App.tsx` - sidebar footer
- `src/data.ts` - remove Malaysian data

**Verification:**
- Search codebase for "JUPEM", "Malaysia", "Sdn. Bhd."
- Verify no results

### 2.4 Consolidate 3D Libraries
**Current State:** Both Cesium and Three.js installed  
**Target:** Cesium only

**Tasks:**
- [ ] Remove Three.js dependencies
- [ ] Remove @react-three/fiber
- [ ] Remove @react-three/drei
- [ ] Verify Cesium works
- [ ] Update 3D viewer to use Cesium

**Files to Modify:**
- `package.json` - remove Three.js
- `src/App.tsx` - replace Three.js with Cesium

**Verification:**
```bash
npm list three
# Should return empty

npm list cesium
# Should return cesium version
```

---

## Phase 3: Screen 1 - 3D Explorer (CRITICAL)

### 3.1 Implement Cesium Viewer
**Current State:** Three.js viewer  
**Target:** CesiumJS with real georeferenced data

**Tasks:**
- [ ] Initialize Cesium Viewer
- [ ] Configure Cesium Ion token
- [ ] Add satellite imagery
- [ ] Add terrain
- [ ] Render parcels from API
- [ ] Render buildings from API
- [ ] Render floors from API
- [ ] Render units from API
- [ ] Implement exploded floor view
- [ ] Implement floor selection
- [ ] Implement unit selection
- [ ] Add camera telemetry display

**Files to Create:**
- `src/components/3d/CesiumViewer.tsx`
- `src/components/3d/FloorStack.tsx`
- `src/components/3d/PropertyUnit.tsx`

**Verification:**
- Open 3D Explorer screen
- Verify satellite imagery loads
- Verify building renders as exploded floors
- Verify clicking floor selects it
- Verify camera telemetry updates

### 3.2 Implement Cadastral Hierarchy Panel
**Current State:** No hierarchy panel  
**Target:** Expandable tree with real data

**Tasks:**
- [ ] Create hierarchy tree component
- [ ] Fetch parcel/building/floor/unit data
- [ ] Implement expand/collapse
- [ ] Implement search/filter
- [ ] Highlight selected item
- [ ] Show authority badges
- [ ] Show metadata (area, ULPIN, etc.)

**Files to Create:**
- `src/components/hierarchy/CadastralHierarchy.tsx`
- `src/components/hierarchy/TreeNode.tsx`

**Verification:**
- Open 3D Explorer
- Verify hierarchy tree loads
- Verify expanding parcel shows building
- Verify expanding building shows floors
- Verify clicking item selects in 3D

### 3.3 Implement Floor Controls
**Current State:** Basic floor toggle  
**Target:** Segmented control + vertical stepper

**Tasks:**
- [ ] Create segmented control component
- [ ] Create vertical stepper component
- [ ] Sync both controls
- [ ] Update 3D view on selection
- [ ] Highlight selected floor

**Files to Create:**
- `src/components/controls/FloorSelector.tsx`
- `src/components/controls/FloorStepper.tsx`

**Verification:**
- Click floor tab
- Verify floor highlights in 3D
- Verify stepper updates
- Verify hierarchy updates

### 3.4 Implement Legend
**Current State:** No legend  
**Target:** 5-category legend with patterns

**Tasks:**
- [ ] Create legend component
- [ ] Define 5 categories:
  - DERIVED (navy solid)
  - AUTHORITATIVE (gold solid)
  - AI_GENERATED (dashed)
  - SYNTHETIC/DEMO (hatched)
  - CRITICAL/DISPUTED (red)
- [ ] Use patterns for colorblind accessibility

**Files to Create:**
- `src/components/ui/Legend.tsx`

**Verification:**
- Open 3D Explorer
- Verify legend displays
- Verify patterns are distinguishable

---

## Phase 4: Screen 2 - Property Record (HIGH)

### 4.1 Create Property Record Page
**Current State:** No property record screen  
**Target:** Full property detail page

**Tasks:**
- [ ] Create route /properties/:id
- [ ] Fetch property data from API
- [ ] Display hierarchical identifier
- [ ] Display authority badge
- [ ] Create 4 section cards:
  - Hierarchy
  - Rights & Tenure
  - Geometry
  - Provenance
- [ ] Display validation status
- [ ] Add action buttons

**Files to Create:**
- `src/pages/PropertyRecord.tsx`
- `src/components/property/HierarchyCard.tsx`
- `src/components/property/RightsCard.tsx`
- `src/components/property/GeometryCard.tsx`
- `src/components/property/ProvenanceCard.tsx`

**Verification:**
- Click property unit in 3D Explorer
- Verify property record opens
- Verify all 4 cards display
- Verify data matches database

### 4.2 Implement "Fly to 3D" Action
**Current State:** No fly-to action  
**Target:** Jump to 3D Explorer focused on property

**Tasks:**
- [ ] Add "Fly to in 3D" button
- [ ] Navigate to 3D Explorer
- [ ] Focus camera on property
- [ ] Highlight property

**Files to Modify:**
- `src/pages/PropertyRecord.tsx`

**Verification:**
- Click "Fly to in 3D"
- Verify 3D Explorer opens
- Verify camera focuses on property
- Verify property is highlighted

### 4.3 Implement "View Audit Trail" Action
**Current State:** No audit trail  
**Target:** Show property history

**Tasks:**
- [ ] Add "View Audit Trail" button
- [ ] Fetch audit data from API
- [ ] Display timeline
- [ ] Show before/after for changes

**Files to Create:**
- `src/components/audit/AuditTrail.tsx`

**Verification:**
- Click "View Audit Trail"
- Verify audit trail displays
- Verify shows property history

---

## Phase 5: Screen 3 - Import Wizard Map Fields (HIGH)

### 5.1 Enhance Map Fields Step
**Current State:** Basic field mapping UI  
**Target:** Full field mapping with validation

**Tasks:**
- [ ] Display file summary card
- [ ] Show source fields from uploaded file
- [ ] Show target schema fields
- [ ] Implement auto-mapping
- [ ] Show mapping status (Mapped/Unmapped)
- [ ] Validate required fields mapped
- [ ] Block progression if required fields unmapped

**Files to Modify:**
- `src/App.tsx` - MapFieldsView component

**Verification:**
- Upload GeoJSON file
- Verify source fields display
- Verify auto-mapping works
- Verify unmapped fields show warning
- Verify can't proceed without required mappings

---

## Phase 6: Screen 4 - Dashboard (HIGH)

### 6.1 Implement KPI Cards
**Current State:** Mock statistics  
**Target:** Real statistics from API

**Tasks:**
- [ ] Fetch statistics from /api/statistics
- [ ] Display 4 KPI cards:
  - Total parcels
  - Total buildings
  - Total floors
  - Total property units
- [ ] Add loading states
- [ ] Add error states

**Files to Modify:**
- `src/App.tsx` - Dashboard component

**Verification:**
- Open Dashboard
- Verify KPI cards display
- Verify numbers match database counts

### 6.2 Implement Buildings by Height Chart
**Current State:** No chart  
**Target:** Bar chart from real data

**Tasks:**
- [ ] Fetch data from /api/statistics/buildings-by-height
- [ ] Create bar chart component
- [ ] Display storey buckets
- [ ] Display counts
- [ ] Add "View full report" link

**Files to Create:**
- `src/components/charts/BuildingsByHeight.tsx`

**Verification:**
- Open Dashboard
- Verify chart displays
- Verify bars match data

### 6.3 Implement Validation State Donut
**Current State:** No chart  
**Target:** Donut chart from real data

**Tasks:**
- [ ] Fetch data from /api/statistics/validation-state
- [ ] Create donut chart component
- [ ] Display categories:
  - Clean
  - Warnings
  - Errors
  - Not Validated
- [ ] Display percentages
- [ ] Display legend

**Files to Create:**
- `src/components/charts/ValidationState.tsx`

**Verification:**
- Open Dashboard
- Verify donut displays
- Verify segments match data

### 6.4 Implement AI Candidates Table
**Current State:** Mock AI data  
**Target:** Real AI proposals from API

**Tasks:**
- [ ] Fetch data from /api/ai/candidates
- [ ] Create table component
- [ ] Display categories:
  - High-confidence agreement
  - Disputed
  - Needs human review
- [ ] Display counts and percentages
- [ ] Display sparkline trends
- [ ] Add "View queue" link

**Files to Create:**
- `src/components/tables/AICandidates.tsx`

**Verification:**
- Open Dashboard
- Verify table displays
- Verify data matches API

### 6.5 Implement Quick Action Cards
**Current State:** Basic cards  
**Target:** 4 action cards with descriptions

**Tasks:**
- [ ] Create 4 cards:
  - Import Data
  - Open 3D Explorer
  - Run Validation
  - Review AI
- [ ] Add icons
- [ ] Add descriptions
- [ ] Wire up navigation

**Files to Modify:**
- `src/App.tsx` - Dashboard component

**Verification:**
- Open Dashboard
- Verify 4 cards display
- Click each card
- Verify navigates to correct screen

---

## Phase 7: Global Features (MEDIUM)

### 7.1 Implement Global Header
**Current State:** No header  
**Target:** Professional header with search

**Tasks:**
- [ ] Create Header component
- [ ] Add logo/crest
- [ ] Add project selector
- [ ] Add global search
- [ ] Add notification bell
- [ ] Add user profile

**Files to Create:**
- `src/components/ui/Header.tsx`

**Verification:**
- Open any screen
- Verify header displays
- Verify search works
- Verify user profile displays

### 7.2 Implement Global Search
**Current State:** No search  
**Target:** Search across all entities

**Tasks:**
- [ ] Create search component
- [ ] Implement search API endpoint
- [ ] Search parcels, buildings, floors, units
- [ ] Display results with type indicators
- [ ] Navigate to result on click

**Files to Create:**
- `src/components/search/GlobalSearch.tsx`

**Verification:**
- Type in search box
- Verify results display
- Click result
- Verify navigates to entity

### 7.3 Implement Audit Trail
**Current State:** No audit trail  
**Target:** Full audit history

**Tasks:**
- [ ] Create audit trail page
- [ ] Fetch audit data from API
- [ ] Display timeline
- [ ] Filter by entity type
- [ ] Filter by date range

**Files to Create:**
- `src/pages/AuditTrail.tsx`

**Verification:**
- Open Audit page
- Verify audit trail displays
- Verify filtering works

---

## Phase 8: Testing & Verification (CRITICAL)

### 8.1 Backend Tests
**Tasks:**
- [ ] Write pytest tests for all endpoints
- [ ] Test SAT algorithm with real cases
- [ ] Test database persistence
- [ ] Test authentication

**Files to Create:**
- `backend/tests/test_api.py`
- `backend/tests/test_sat.py`
- `backend/tests/test_persistence.py`

**Verification:**
```bash
cd backend
pytest
# All tests pass
```

### 8.2 Frontend Tests
**Tasks:**
- [ ] Write component tests
- [ ] Test API integration
- [ ] Test user interactions

**Files to Create:**
- `src/__tests__/` - test directory

**Verification:**
```bash
npm test
# All tests pass
```

### 8.3 End-to-End Test
**Tasks:**
- [ ] Start PostgreSQL + PostGIS
- [ ] Run migrations
- [ ] Start backend
- [ ] Start frontend
- [ ] Import real GeoJSON
- [ ] Verify data persists
- [ ] Verify 3D viewer shows data
- [ ] Verify property record works
- [ ] Verify dashboard shows real stats

**Verification:**
- Complete workflow works end-to-end
- All screens show real data
- No mock data anywhere

---

## Execution Order

1. **Phase 1** - Backend Foundation (4-6 hours)
2. **Phase 2** - Frontend Foundation (4-6 hours)
3. **Phase 3** - Screen 1: 3D Explorer (6-8 hours)
4. **Phase 4** - Screen 2: Property Record (3-4 hours)
5. **Phase 5** - Screen 3: Import Map Fields (2-3 hours)
6. **Phase 6** - Screen 4: Dashboard (4-5 hours)
7. **Phase 7** - Global Features (4-5 hours)
8. **Phase 8** - Testing (4-6 hours)

**Total Estimated Time:** 31-43 hours

---

## Success Criteria

✅ All 4 screens implemented matching target design  
✅ All data from real backend API (no mock data)  
✅ CesiumJS 3D viewer working with real geometry  
✅ Backend persistence actually saves data  
✅ SAT algorithm tested and verified  
✅ Authentication secure (JWT-based)  
✅ All tests passing  
✅ No JUPEM/Malaysia branding  
✅ No fabricated demo numbers  
✅ Loading/error/empty states implemented  

---

## Standing Rule Reminder

**DO NOT** write any status document claiming something is "fixed" or "working" until:
1. You've actually executed the code
2. You've captured real output
3. You've verified it matches expectations

The gap between documentation and reality has been the biggest problem. This rule prevents that.

---

**Plan Created:** 2026-03-18  
**Next Step:** Begin Phase 1 (Backend Foundation)
