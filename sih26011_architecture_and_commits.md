# Cadastral AI: 4D Spatial Administration Platform (SIH26011)

> Master technical handover document. Stack: React 19 + Vite 8 + Tailwind v4,
> Three.js 0.186 / R3F 9 / Drei 10, Leaflet 1.9, MapLibre 6.11, FastAPI,
> PostgreSQL 16 + PostGIS 3.6 / SFCGAL 2.2, YOLO11n-seg ONNX (CPU).

## Phase 1: Spatial Data Engineering

### Core cadastral schema
- `land_parcel` (id, ulpin CHAR-14, name, area_sqm, MULTIPOLYGON 4326)
- `building` (parcel FK, height_m, height_source ENUM, floors_count,
  footprint POLYGON, solid_geom POLYHEDRALSURFACEZ) — includes 606 OSM
  `w%` context rows excluded from cadastral endpoints
- `floor` (z_min/z_max), `property_unit` (footprint, hash, version,
  z-range), `spatial_identifier` + `spatial_identifier_history`
  (append-only version chain), `validation_run`, `ai_proposal`
  (`proposal_data` JSONB: wkt/height/ulpin/lat/lon/source/z_base),
  `audit_log`, `import_session`

### SCD Type 2 temporal layer (migration 008)
- `cadastral_parcels` += `valid_from TIMESTAMPTZ DEFAULT NOW()`,
  `valid_to NULL`, `status CHECK(active, demolished, altered,
  unauthorized_expansion)`, `parent_building_id` (lineage), plus
  `source_meta JSONB` (migration 007: provider, AOI, model, height
  source, z-base).
- Spatiotemporal access path:
  `gist (footprint, tstzrange(valid_from, valid_to))`
  (`tstzrange`, not `tsrange`, is required for timestamptz).
- Served by `GET /api/v2/parcels/temporal?bbox=&target_epoch=`
  (ISO8601 or Unix), returning GeoJSON with temporal properties.

### Subterranean schema (migration 009)
- `subterranean_utilities` (UUID id, type CHECK water/sewer/fiber/power,
  depth_m negative, status, `LINESTRINGZ 4326`) +
  `gist (geom gist_geometry_ops_nd)` 3D index. Served by
  `GET /api/v2/utilities/subterranean?bbox=` with 3D coordinates.

### Integrity model (verified live)
- `ST_IsValid` on extruded polygon soups flags *everything* (shared-edge
  faces), including perfect rectangles — proven against PostGIS 3.6.2.
- Enforceable boundary is therefore the 2D footprint: shapely-validated
  at staging (`_validate_proposal_wkt`: valid + simple + >= 4 m²),
  `ST_MakeValid` applied at INSERT, footprint-validity + area + height
  re-checked at APPROVED materialization (loud 422, nothing persisted).
- Volume is analytic (`ST_Area(geography) x height`), exact for vertical
  prisms, never fabricated from invalid solids.

## Phase 2: WebGL & Rendering Engine

- Single R3F `<Canvas>`: `frameloop="demand"` (monsoon forces always),
  tiered DPR/shadow sizes, `AdaptiveDpr` below high tier.
- `EffectComposer` (Bloom 1.5 + SSAO) gated on `quality !== 'low'` so
  Low-Power/X-Ray stays cheap; audit `directionalLight` yields to a
  `SolarRig` (declination + hour-angle sun at city latitude, frustum fit
  to city radius) while auditing.
- Reconciler shielding: `memo(LiveCapturedBlock, liveBlockEqual)` on
  parcel id/data/flags, memoized `Ground`/`SubterraneanNetwork`,
  `useCallback` ground/measure handlers — HUD keystrokes skip meshes.
- Lifecycle: explicit dispose effects on every generated geometry;
  auto-dispose on unmount; canvases never double-mount (StrictMode-safe
  ref guards); MapLibre/Leaflet instances isolated per tab.
- Terrain: ground plane with cutaway/X-Ray translucency; tubes via
  `tubeGeometry` over CatmullRom curves, emissive per utility type.

## Phase 3: Enterprise UI/UX (Lucid Cadastre)

- Glass tokens: `bg-slate-900/60 backdrop-blur-xl border-white/10`,
  cyan `#06B6D4` signals, tabular numerals for IDs/coords.
- Floating command pill header, glass View Controls (`CollapsePanel`
  `tone="glass"`), bottom-center 4D temporal dock (debounced 300 ms v2
  fetch, LIVE/HISTORICAL badge), floating inspector
  (`absolute top-4 right-4 bottom-24 w-[22rem] z-40`), ASH diagnostics
  HUD (event-driven ENGINE/STYLE/TILES/RENDER/WEBGL/camera/dims/errors
  + DOM-height trace + sanitized copy).
- framer-motion entrances (header/dock) + spring inspector via
  AnimatePresence; 2D/3D linked selection on shared `selectedLiveParcelId`;
  cinematic MapLibre fly-to on focus; satellite/AOI split modes.
- Brutalist primitives (`brutal.tsx`) retained for non-map screens —
  shell + explorer are lucid; app-wide single theme remains open work.

## Phase 4: Automation & Tools

- Tape measure: raycast capture on ground/meshes, dashed drei `Line`,
  glass midpoint tooltip (2 decimals, metres), reset on 3rd click.
- Shadow audit: time-of-day + day-of-year driven sun, sweeping silhouettes.
- 4D slider: 2015→NOW, v2-backed historical parcels, live endpoint at max.
- Legal automation: `POST /api/v2/legal/generate-notice`
  (template LLM stub, Tamil Nadu 2019 citations, DRAFT watermark) +
  brutal/glass enforcement modal with print path.
- Batch AI: `POST /api/ai/extract-batch` and `/api/ai/detect-batch`
  (mosaic-fed, exact inverse-Mercator mapping) through the same
  REVIEW_REQUIRED gate; review supports height/floor edits.
- Imagery: provider abstraction (Esri default open XYZ; Google only via
  official keyed Map Tiles session flow); SRTM elevation anchoring
  (423–424 m MSL verified, 0.0 fallback).

## Complete Commit History

* **eb68f94** - 2026-09-21 - checkpoint before UI redesign
* **b0824e4** - 2026-09-21 - fix: Dashboard.tsx JSX structure
* **b167bd0** - 2026-09-21 - fix: Explorer3D.tsx remove CSS variables from r3f props
* **e5c2095** - 2026-09-21 - feat: environment & view panel for Explorer3D
* **f425621** - 2026-09-21 - fix: ViewRig camera reset and lookAt override
* **f5254f3** - 2026-09-21 - perf: quality setting and on-demand rendering for Explorer3D
* **50d4727** - 2026-09-21 - feat: building/floor/unit inspector for Explorer3D
* **4e1fe46** - 2026-09-21 - feat: Explorer3D loads live backend data with labelled demo fallback
* **5d8d6c2** - 2026-09-21 - feat: building selector and per-building origin for Explorer3D
* **f0a8c88** - 2026-09-21 - feat: footprint-based slabs, anchor and parcel outline for Explorer3D
* **05cc28f** - 2026-09-21 - feat: OSM city context layer for Explorer3D
* **073bdcf** - 2026-09-21 - feat: city overview camera framing for Explorer3D
* **87c6d79** - 2026-09-21 - feat: clickable neighbouring building blocks in Explorer3D
* **560372f** - 2026-09-21 - fix: consolidate Explorer3D overlay panels and clear stuck hover
* **b159390** - 2026-09-21 - fix: touching solids are not overlaps; add topology regression script
* **db441ae** - 2026-09-21 - feat: click-to-select OSM city buildings with info card
* **6ece37d** - 2026-09-21 - fix: backend overlap check ignores touching units; local-metre solids; add topology tests
* **92ec7b7** - 2026-09-21 - chore: untrack python bytecode
* **7ac114c** - 2026-09-21 - fix: ResourceClosedError in GET /api/stats from unconsumed sequential query results
* **3d8b7a8** - 2026-09-21 - fix: same ResourceClosedError pattern in GET /api/statistics
* **85627cd** - 2026-09-21 - feat: illustrative floors/units for selected OSM buildings; fix deselect-camera and preset-retrigger bugs
* **ed133c6** - 2026-09-21 - fix: compute volume_cum in metres and derive floors_count from actual floor records
* **6dc04ab** - 2026-09-21 - feat: synthetic underground utility layer with real-geometry clearance check
* **db36f5a** - 2026-09-21 - feat: property record disclaimer, geometry hash/version, and QR code
* **da3e132** - 2026-09-21 - fix: mobile responsive P0 items (nav, ImportWorkflow stacking, Explorer3D controls)
* **34e607d** - 2026-09-21 - refactor: replace react-qr-code with plain qrcode package for property record
* **d2f5cf3** - 2026-09-21 - feat: illustrative floor and unit subdivision for OSM context buildings
* **c83d6a1** - 2026-09-21 - style: overhaul responsive ui, mobile 3d panels, and grid alignments
* **563ad0b** - 2026-09-21 - style: modern ui/ux redesign, glassmorphism system, and flex overflow fixes
* **898d044** - 2026-09-21 - fix: inspectorVisible ReferenceError in Explorer3D
* **94530a0** - 2026-09-21 - feat: ingest OSM city catalog with extruded solid_geom
* **37b762e** - 2026-09-22 - feat: native PostGIS 3D topology validation with touch exclusion
* **a766e11** - 2026-09-22 - feat: GeoJSON hierarchy endpoint with ST_AsGeoJSON and frontend adapter
* **277d48d** - 2026-09-22 - fix: exclude synthetic OSM buildings from cadastral-facing endpoints
* **8990836** - 2026-09-22 - feat: free-roam city camera preset
* **ee06841** - 2026-09-22 - feat: always-visible GPU quality toggle
* **3aff5da** - 2026-09-22 - feat: rename property record flow to 3D Bhu-Aadhaar
* **182969e** - 2026-09-22 - feat: denser Coimbatore city tile (radius 1400, showcase 100)
* **8a151bd** - 2026-09-22 - fix: remove OrbitControls target prop fighting manual camera drag
* **9054966** - 2026-09-22 - fix: Interior Tour and Free Orbit target the selected OSM building when one is selected
* **89a5c7d** - 2026-09-22 - fix: illustrative OSM building floors use real footprint polygon instead of bounding box
* **203a095** - 2026-09-22 - fix: handle window.open returning null for Bhu-Aadhaar PDF generation
* **f407e76** - 2026-09-22 - feat: add reproducible underground-pipe generator script
* **29a2fb7** - 2026-09-22 - fix: underground cutaway camera and ground transparency reliably reveal utility pipes
* **3502865** - 2026-09-22 - fix: show selected OSM floor and unit in the context card
* **27db6e6** - 2026-09-22 - fix: recompute freeroam camera bounds for current city tile radius
* **7248069** - 2026-09-22 - feat: implement non-blocking FastAPI background job queue for AI tasks
* **2393ef0** - 2026-09-22 - feat: add low-compute Open3D voxel downsampling engine for vertical mapping
* **cac5026** - 2026-09-22 - feat: migrate frontend AI service to use non-blocking polling architecture
* **389d7f5** - 2026-09-23 - fix: pass cityMeta to ViewRig to resolve camera bounds crash
* **4711840** - 2026-09-23 - feat: add live AI extraction and synthetic Bhu-Aadhaar ULPIN generation endpoint
* **a224e5a** - 2026-09-23 - feat: implement interactive 3D ground capture and instant PDF generation
* **e11616f** - 2026-09-23 - fix: gracefully handle duplicate live capture clicks using ON CONFLICT DO NOTHING
* **873e9b5** - 2026-09-23 - chore: add onnxruntime and opencv dependencies for vision engine
* **f3ff5ac** - 2026-09-23 - feat: implement YOLO ONNX vision engine core for dynamic footprint extraction
* **06abfd6** - 2026-09-23 - feat: wire vision engine to live capture endpoint with synthetic fallback
* **15fc38a** - 2026-09-23 - chore: ignore YOLO model weights in git repository
* **0a70d99** - 2026-09-23 - fix: simplify and validate YOLO contours so PostGIS accepts vision footprints
* **6c538d8** - 2026-09-23 - feat: integrate live Esri satellite imagery fetch for YOLO vision engine
* **63fea47** - 2026-09-23 - fix: cast 3D extrusion to MultiPolygon to prevent WKB type 15 parse exceptions
* **0b18965** - 2026-09-23 - fix: write initial HTML shell to popup window to bypass about:blank block
* **d1e8d7e** - 2026-09-23 - fix: route live-capture pipeline through the AIProposal review gate instead of writing directly to cadastral_parcels
* **3f9c701** - 2026-09-23 - fix: don't claim a human reviewer before review happens
* **711b410** - 2026-09-23 - feat: render approved live-captured parcels in the 3D scene
* **212b1d2** - 2026-09-23 - fix: synthetic pipe pairs use one shared on-road run instead of independent per-offset runs
* **672ea60** - 2026-09-23 - fix: final_test.py exit code matches its actual pass/fail result
* **2315dd4** - 2026-09-23 - test: exercise PUT unit geometry conflict gate against a real database
* **88112b7** - 2026-09-23 - fix: resolve temporal dead zone crash from out-of-order const declarations in Explorer3D
* **3f75642** - 2026-09-23 - feat: detect live-map OSM buildings on capture before falling back to vision
* **2ac2a2a** - 2026-09-23 - feat: review UI for live captures plus auto-refresh of approved 3D parcels
* **dd31cad** - 2026-09-23 - feat: reusable Esri-vs-Google tile sharpness comparison tool
* **9e28a62** - 2026-09-23 - fix: handle WKB type 15 geometry parsing without logging spurious exceptions
* **3bfd73b** - 2026-09-24 - fix: run verify:topology and generate:underground correctly on current Node via type-stripping
* **cd9630e** - 2026-09-24 - fix: final_test.py has real assertions and current-correct expectations instead of print-only checks
* **d7d8c95** - 2026-09-24 - fix: /api/search parameter name matches what the frontend actually sends
* **c8adba9** - 2026-09-24 - feat: wire dynamic unit version history into Property Detail UI
* **0428a4e** - 2026-09-24 - chore: clean up repo root directory for hackathon submission
* **ce1f0b0** - 2026-09-24 - feat: upgrade vision engine to use live Google Maps satellite imagery
* **6506d25** - 2026-09-24 - feat: integrate NASA SRTM true elevation for 3D extrusion heights
* **9efe3a0** - 2026-09-24 - feat: add ST_3DIntersects encroachment detection to live capture
* **d15cbd6** - 2026-09-24 - feat: implement multi-building batch extraction vision pipeline
* **52443aa** - 2026-09-24 - feat: add Low Power Mode toggle for WebGL GPU optimization
* **0313b4b** - 2026-09-24 - chore: add bulk approve script to instantly populate 3D demo city
* **202be36** - 2026-09-24 - feat: expose ST_ZMin elevation data in cadastral parcels endpoint
* **e2070d4** - 2026-09-24 - feat: add NASA SRTM elevation and encroachment status to Property Passport
* **c70630d** - 2026-09-24 - style: modernize design-system foundation, motion set, and utility layer
* **b329225** - 2026-09-24 - style: modernize app shell, navigation, hierarchy rail, and search
* **ee3a707** - 2026-09-24 - style: modernize data screens, headers, tables, and dark-table system
* **7b32e6e** - 2026-09-24 - style: modernize workflow screens, stepper, tabs, and review cards
* **e989d93** - 2026-09-24 - style: unify explorer overlays on gold identity, refine panels and notices
* **ba8456e** - 2026-09-24 - chore: upgrade npm minors and pin rolldown win32 binding for npm optional-deps bug
* **bf7c878** - 2026-09-24 - chore: upgrade backend web stack majors, pin validated onnxruntime/numpy pair
* **7689335** - 2026-09-24 - chore: require Node >=22.12 and record toolchain upgrade to 22.23.2
* **3183630** - 2026-09-24 - chore: modernize vite config imports and FastAPI lifespan handler
* **d736908** - 2026-09-24 - feat: imagery provider abstraction with Esri default and keyed Google path
* **43554b8** - 2026-09-24 - feat: AOI service, imagery mosaic, batch detection, parcel inspector detail
* **47e0e58** - 2026-09-24 - feat: Leaflet live-map panel with AOI capture and pipeline status
* **3a4f6e8** - 2026-09-24 - feat: split 2D/3D view, review height editing, parcel inspector, layer toggles
* **9af2ece** - 2026-09-24 - feat: mosaic-fed detection, enforceable footprint gate, analytic volumes
* **26c4d6f** - 2026-09-24 - feat: Google Map Tiles API session-token provider path
* **fbdf5db** - 2026-09-25 - feat: MapLibre MapTiler vector basemap with cadastral overlay and 2D mode switch
* **ee037e6** - 2026-09-25 - style: neo-brutalist tokens, utilities, and shared primitives
* **bfc5634** - 2026-09-25 - style: brutalist shell - sidebar, topbar, status, search, drawer, hierarchy
* **5b2d837** - 2026-09-25 - style: brutalist map panels, gold selection, toolbar primitives
* **532cff7** - 2026-09-25 - style: brutalist data screens - metrics, tables, settings, validation
* **4c74842** - 2026-09-25 - style: brutalist workflows, records, review, explorer overlays
* **d95d443** - 2026-09-25 - style: brutalist cleanup - unused imports
* **ceaff41** - 2026-09-25 - fix: exclude maplibre-gl from dep optimizer for web worker
* **539096d** - 2026-09-25 - feat: cityscape - satellite extrusions, dashboard 3D preview, worker fix
* **5d20669** - 2026-09-25 - fix: isolate extrusion layer failures from basemap render
* **a08daf6** - 2026-09-25 - feat: map load diagnostics badge for tile/style triage
* **db0e57f** - 2026-09-25 - feat: ASH map surface health diagnostics with event-driven telemetry
* **c11e26f** - 2026-09-25 - fix: flex-item height chain for split 2D panes
* **34a51e0** - 2026-09-25 - feat: ASH runtime DOM height trace for zero-height triage
* **f30e5bd** - 2026-09-25 - style: implement global neo-brutalist design tokens and shadows
* **06894d5** - 2026-09-25 - style: reskin app shell to neo-brutalism and enforce strict min-h-0 flex heights
* **9a40c52** - 2026-09-25 - style: reskin data screens, cards, and buttons to high-contrast neo-brutalism
* **f6919c8** - 2026-09-25 - refactor: extract 3D map to absolute z-0 background, bypassing flex layout
* **0c807b2** - 2026-09-25 - refactor: implement z-10 pointer-events-none HUD wrapper for spatial overlay
* **9120a1e** - 2026-09-25 - style: refactor data screens into floating neo-brutalist bento blocks
* **8cca0a0** - 2026-09-25 - feat: integrate SVAMITVA dynamic QR code into Bhu-Aadhaar PDF passport
* **7867614** - 2026-09-25 - feat: add ILIMS analytics heatmap mode for land bank visualization
* **9d15150** - 2026-09-25 - feat: inject focusedParcelId state and update R3F prop interfaces
* **b956c2c** - 2026-09-25 - feat: implement two-way binding locate buttons in bento HUD
* **e83d3f8** - 2026-09-25 - feat: intercept focus state to trigger maplibre cinematic fly-to
* **f838901** - 2026-09-25 - feat: apply WebGL material overrides and scale vectors for focused 3D parcels
* **6db6352** - 2026-09-25 - docs: update dashboard hero copy to highlight ULPIN, ILIMS, and NASA SRTM
* **90a9493** - 2026-09-25 - docs: update system status labels to reflect actual deep-tech stack
* **6e99369** - 2026-09-25 - docs: rename UI actions to match SVAMITVA and ILIMS mandates
* **aa93239** - 2026-09-25 - fix: relocate fly-to useEffect below liveParcels state initialization
* **05f5b9f** - 2026-09-26 - fix: open passport popup synchronously in click gesture
* **3b51ee5** - 2026-09-26 - fix: deliver passport as download instead of popup window
* **6efef9b** - 2026-09-26 - chore: remove ad-hoc test scripts and root clutter
* **3f71ead** - 2026-09-26 - feat: satellite click flies 3D camera to selected live parcel
* **dce7a97** - 2026-09-26 - feat(backend): implement SCD Type 2 temporal schema and v2 time-travel API
* **5758a8d** - 2026-09-26 - feat(frontend): integrate brutalist 4D temporal slider and v2 api debouncing
* **0acfb1f** - 2026-09-26 - feat(cadastre): implement subterranean utility schemas and R3F voxel tube rendering
* **b0077b7** - 2026-09-26 - feat(r3f): implement dynamic solar trajectory and shadow auditing mode
* **51098ad** - 2026-09-26 - feat(automation): integrate LLM-driven legal notice generation and enforcement modal
* **45c4c87** - 2026-09-26 - style(ui): float right inspector and apply lucid cadastre glassmorphism
* **9b12aef** - 2026-09-26 - style(ui): finalize lucid cadastre with glassmorphic command header and action hud
* **50b308b** - 2026-09-26 - feat(ui): implement framer-motion physics, r3f bloom post-processing, and spatial measurement tool
* **bbe51f2** - 2026-09-26 - style: unify shell and inspector on lucid glass tokens
* **17e75b9** - 2026-09-26 - chore(architecture): execute 10/10 perfection pass across ui, tests, r3f, and spatial queries
