# SIH26011 — 3D ULPIN Cadastral GIS Workstation

## Complete Figma UI/UX Design & Prototype Specification

Design and prototype a professional, competition-ready web application called:

**SIH26011 — 3D ULPIN Cadastral GIS Workstation**

This is a government-grade geospatial land-record management platform that extends India's 2D cadastral/ULPIN land records into a structured **3D cadastral system**.

The interface must communicate:

* Government GIS workstation
* Surveying / cadastral engineering
* 3D property ownership
* Geospatial data processing
* Spatial validation
* AI-assisted mapping
* Technical reliability
* Auditability
* Precision

Do NOT make it look like a generic modern SaaS dashboard.

---

# 1. PRODUCT PURPOSE

The system converts conventional cadastral data into a validated 3D property representation.

The workflow is:

**IMPORT → ANALYZE → MAP FIELDS → AI REVIEW → VALIDATE → GENERATE → EXPLORE**

The platform manages this hierarchy:

**Land Parcel**
→ **Building**
→ **Floor**
→ **Property Unit**

Each property unit can have:

* 2D footprint
* Minimum elevation
* Maximum elevation
* Area
* Volume
* 3D solid geometry
* Spatial identifier
* Geometry hash
* Geometry version
* Validation status
* Audit history

The system detects:

* Invalid geometry
* Overlapping volumetric claims
* Topological conflicts
* Invalid mappings
* Data inconsistencies

It then generates a versioned 3D spatial identifier.

Example:

`29384756102934-B01-F03-U01-V01`

---

# 2. DESIGN DIRECTION

## Overall aesthetic

Create a:

**"Digital Survey Instrument / Government GIS Command Center"**

visual language.

Use:

* Deep ink navy
* Near-black panels
* Brass / copper accents
* Muted teal
* Technical grid patterns
* Thin borders
* Small uppercase labels
* Monospace technical values
* Survey markers
* Coordinate indicators
* Status LEDs
* Engineering-style measurement annotations
* Subtle blueprint lines

Avoid:

* Excessive rounded cards
* Huge gradients
* Neon cyberpunk
* Cartoon illustrations
* Consumer SaaS styling
* Excessive glassmorphism
* Excessive shadows
* Large decorative icons

The interface should feel precise and engineered.

---

# 3. COLOR SYSTEM

Create Figma color variables.

### Primary background

`#0A0D12`

Name:

`Ink / 950`

### Secondary background

`#10151C`

Name:

`Ink / 900`

### Panel

`#151B23`

Name:

`Ink / 800`

### Panel elevated

`#1B222C`

Name:

`Ink / 700`

### Primary accent

`#C99A45`

Name:

`Brass / 500`

Use for:

* active navigation
* important buttons
* selected objects
* headings
* workflow progress
* key metrics

### Secondary accent

`#4FB8AC`

Name:

`Teal / 500`

Use for:

* successful validation
* active system state
* GIS information
* confirmed geometry
* data indicators

### Warning

`#D6A84F`

### Error

`#C85C5C`

### White

`#F1F3F5`

### Secondary text

`#A8B0BA`

### Muted text

`#6E7783`

### Border

`#28313C`

---

# 4. TYPOGRAPHY

Use:

### Primary display font

**Space Grotesk**

Use for:

* page titles
* section headings
* major metrics
* navigation

### Body

**IBM Plex Sans**

Use for:

* descriptions
* forms
* buttons
* labels

### Technical

**IBM Plex Mono**

Use for:

* ULPIN
* spatial IDs
* coordinates
* geometry hashes
* database IDs
* timestamps
* measurements
* system logs

Typography should be compact and technical.

---

# 5. APPLICATION STRUCTURE

Desktop-first application.

Target frame:

**1440 × 900**

Minimum supported:

**1280 × 800**

Main application structure:

```text
┌───────────────────────────────────────────────────────────────┐
│ TOP SYSTEM BAR                                                │
├──────────────┬────────────────────────────────────────────────┤
│              │                                                │
│              │                                                │
│   SIDEBAR    │              MAIN WORKSPACE                   │
│              │                                                │
│              │                                                │
│              │                                                │
├──────────────┴────────────────────────────────────────────────┤
│ SYSTEM STATUS BAR                                             │
└───────────────────────────────────────────────────────────────┘
```

---

# 6. TOP SYSTEM BAR

Height:

**64 px**

Left:

Logo / project mark:

**3D ULPIN**

Below:

`CADASTRAL GIS WORKSTATION`

Center:

Breadcrumb:

`WORKSPACE / DASHBOARD`

Right:

* Database status
* API status
* User
* Settings
* Notification icon

Example:

```text
● DATABASE CONNECTED
● API ONLINE
VINITH K
⌄
```

Use small technical indicators.

---

# 7. LEFT SIDEBAR

Width:

**240–260 px**

Header:

**3D ULPIN**

Subtitle:

`CADASTRAL WORKSTATION`

Navigation:

### WORKSPACE

* Dashboard
* Import Data
* 3D Explorer
* Property Records

### ANALYSIS

* Validation
* Spatial Identifiers
* AI Review

### SYSTEM

* Audit Trail
* Settings

Bottom:

```text
SYSTEM STATUS
DATABASE       ONLINE
GIS ENGINE     READY
3D ENGINE      READY
VERSION        2.4.1
```

Active item has:

* Brass left border
* Brass icon
* Slightly brighter background

---

# 8. DASHBOARD

Create a high-quality technical dashboard.

Header:

**CADASTRAL OVERVIEW**

Subheading:

`3D land administration and volumetric property intelligence`

Top-right buttons:

`IMPORT DATA`

`OPEN 3D EXPLORER`

---

## KPI row

Four large metric cards.

### Card 1

**PARCELS**

`01`

`REGISTERED`

### Card 2

**BUILDINGS**

`01`

`MAPPED`

### Card 3

**PROPERTY UNITS**

`04`

`3D REGISTERED`

### Card 4

**VALIDATION**

`100%`

`PASS RATE`

Each card includes:

* small technical icon
* trend/status indicator
* tiny metadata
* thin top accent line

---

# 9. DASHBOARD MAIN AREA

Split into two columns.

## Left: 3D preview

Large panel:

**LIVE 3D CADASTRAL MODEL**

Display an isometric building.

The building should show:

* parcel boundary
* building footprint
* multiple floors
* property units
* floor separation
* subtle elevation markers

Use a technical wireframe + solid hybrid visualization.

Overlay:

```text
ELEVATION
+24.00 M

+18.00 M
+12.00 M
+06.00 M
+00.00 M
```

Bottom controls:

`ROTATE`

`PAN`

`ZOOM`

`ISOLATE FLOOR`

`EXPLODE`

`RESET`

---

# 10. DASHBOARD RIGHT PANEL

Title:

**SYSTEM ACTIVITY**

Show timeline:

```text
10:42  IMPORT SESSION COMPLETED
10:39  TOPOLOGY VALIDATION PASSED
10:38  3D SOLIDS GENERATED
10:36  AI PROPOSALS REVIEWED
10:31  BUILDING DATA IMPORTED
```

Use teal for successful events.

Below:

**DATA HEALTH**

Show:

```text
Geometry Integrity       98%
Attribute Completeness   94%
Topology                 100%
Spatial IDs              100%
```

Use thin progress bars.

---

# 11. QUICK ACTIONS

At bottom of dashboard:

### IMPORT NEW DATA

Upload GeoJSON / CSV cadastral datasets.

### VALIDATE DATA

Run topology and geometry validation.

### EXPLORE 3D

Open interactive 3D cadastral viewer.

### SEARCH PROPERTY

Find parcel, building, floor or unit.

---

# 12. IMPORT WORKFLOW

This is one of the most important screens.

Create a persistent horizontal workflow tracker.

```text
01 IMPORT
   ↓
02 ANALYZE
   ↓
03 MAP
   ↓
04 AI REVIEW
   ↓
05 VALIDATE
   ↓
06 GENERATE
   ↓
07 EXPLORE
```

Current step should have brass highlight.

Completed steps should have teal checkmarks.

---

# 13. STEP 01 — IMPORT

Header:

**IMPORT CADASTRAL DATA**

Description:

`Load parcel, building, floor and property-unit datasets into the processing workspace.`

Create four upload panels.

### PARCEL DATA

Accepted:

`GeoJSON`

Example:

`parcel.geojson`

### BUILDING DATA

Accepted:

`GeoJSON`

Example:

`buildings.geojson`

### FLOOR DATA

Accepted:

`CSV`

Example:

`floors.csv`

### PROPERTY UNIT DATA

Accepted:

`GeoJSON`

Example:

`units.geojson`

Upload component:

```text
┌─────────────────────────────┐
│                             │
│       + DROP FILE HERE      │
│                             │
│       or browse files       │
│                             │
│ GeoJSON / CSV               │
└─────────────────────────────┘
```

After upload:

```text
✓ buildings.geojson
1.24 MB
VALID
```

Bottom buttons:

`CANCEL`

`ANALYZE DATA →`

---

# 14. STEP 02 — ANALYZE

Header:

**DATA ANALYSIS**

Display imported datasets.

Create a technical inspection table:

| Dataset   | Features | CRS       | Geometry  | Status |
| --------- | -------: | --------- | --------- | ------ |
| Parcel    |        1 | EPSG:4326 | Polygon   | VALID  |
| Buildings |        1 | EPSG:4326 | Polygon   | VALID  |
| Floors    |        8 | —         | Attribute | VALID  |
| Units     |        4 | EPSG:4326 | Polygon   | VALID  |

Add geometry preview.

Show:

```text
FEATURE COUNT       14
GEOMETRIES          10
ATTRIBUTES          37
INVALID RECORDS     0
```

Add a map preview.

---

# 15. STEP 03 — MAP FIELDS

Title:

**MAP SOURCE FIELDS**

Description:

`Map source attributes to the 3D cadastral schema.`

Use two-column mapping UI.

Example:

```text
SOURCE FIELD                 TARGET FIELD

building_id     ───────────→ Building ID
floor_no        ───────────→ Floor Number
unit_code       ───────────→ Unit Code
area            ───────────→ Area (m²)
z_min           ───────────→ Minimum Elevation
z_max           ───────────→ Maximum Elevation
```

Each row has:

* source dropdown
* mapping arrow
* destination dropdown
* validation icon

Unmapped fields:

`OPTIONAL`

Required missing fields:

`ERROR`

---

# 16. STEP 04 — AI REVIEW

Title:

**AI-ASSISTED MAPPING REVIEW**

Purpose:

AI suggests field mappings and detects suspicious records.

Show AI proposal cards.

Example:

```text
AI PROPOSAL #001

Suggested Mapping

source:
building_no

target:
building_id

CONFIDENCE
94%

Reason:
Field semantics and value pattern
match building identifier schema.
```

Buttons:

`ACCEPT`

`REJECT`

`EDIT`

Show a review queue.

Use a small AI indicator but do not make the AI visually dominate the GIS system.

---

# 17. STEP 05 — VALIDATE

Title:

**TOPOLOGY & GEOMETRY VALIDATION**

Large validation status:

```text
VALIDATION ENGINE

READY
```

Run button:

**RUN VALIDATION**

After running, show animated progress:

```text
CHECKING GEOMETRY          ✓
CHECKING FLOOR LEVELS      ✓
CHECKING UNIT BOUNDARIES   ✓
CHECKING 3D OVERLAPS       ✓
CHECKING IDENTIFIERS       ✓
```

Result summary:

```text
0 CRITICAL
0 ERRORS
2 WARNINGS
18 CHECKS PASSED
```

---

# 18. VALIDATION ISSUE TABLE

Columns:

* Severity
* Object
* Issue
* Location
* Resolution
* Status

Example:

```text
WARNING
UNIT U04
Minor boundary precision
BUILDING B01
REVIEW
```

Critical conflicts should be shown with error treatment.

Do not use bright red everywhere. Reserve error color for actual errors.

---

# 19. STEP 06 — GENERATE

Title:

**GENERATE 3D CADASTRAL RECORD**

Show transformation:

```text
2D FOOTPRINT
      ↓
Z-MIN / Z-MAX
      ↓
POLYHEDRAL SOLID
      ↓
GEOMETRY HASH
      ↓
SPATIAL IDENTIFIER
```

Show generated record:

```text
UNIT
U01

Z MIN
0.00 m

Z MAX
3.20 m

AREA
84.50 m²

VOLUME
270.40 m³

GEOMETRY
VALID

VERSION
V01
```

Identifier:

`29384756102934-B01-F01-U01-V01`

Make identifier selectable/copyable.

Button:

**GENERATE RECORDS**

---

# 20. STEP 07 — 3D EXPLORER

This should be the most visually impressive screen.

Create a full-screen GIS workstation.

Layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ 3D EXPLORER                         SEARCH       CONTROLS     │
├─────────────┬────────────────────────────────┬───────────────┤
│             │                                │               │
│ HIERARCHY   │          3D VIEWPORT           │ INSPECTOR     │
│             │                                │               │
│ PARCEL      │       ISOMETRIC BUILDING       │ PROPERTY      │
│  └ BUILDING │                                │ INFORMATION   │
│     ├ F01   │                                │               │
│     ├ F02   │                                │               │
│     └ F03   │                                │               │
│             │                                │               │
├─────────────┴────────────────────────────────┴───────────────┤
│ ELEVATION / FLOOR / VISUALIZATION CONTROLS                  │
└──────────────────────────────────────────────────────────────┘
```

---

# 21. 3D VIEWPORT

Use a dark technical environment.

Display:

* 3D parcel
* buildings
* floors
* units
* elevation
* axes
* grid
* selection outline
* conflict highlighting

Camera:

Isometric by default.

Controls:

* orbit
* pan
* zoom
* reset camera

Visualization modes:

### SOLID

Normal 3D geometry.

### WIREFRAME

Technical geometry inspection.

### EXPLODED

Separate floors vertically.

### TRANSPARENT

View internal hierarchy.

### CONFLICT

Highlight overlapping solids.

---

# 22. 3D FLOOR CONTROLS

Bottom toolbar:

```text
FLOOR

ALL
F01
F02
F03
F04
F05
F06
F07
F08
```

Z-range:

```text
Z MIN ─────────────── Z MAX
0m                     24m
```

Checkbox:

`SHOW PARCEL`

`SHOW BUILDING`

`SHOW UNITS`

`SHOW IDENTIFIERS`

`SHOW CONFLICTS`

---

# 23. LEFT HIERARCHY PANEL

Title:

**CADASTRAL HIERARCHY**

Tree:

```text
PARCEL
29384756102934

└── BUILDING B01
    │
    ├── FLOOR F01
    │   ├── U01
    │   └── U02
    │
    ├── FLOOR F02
    │   ├── U03
    │   └── U04
    │
    └── FLOOR F03
```

Each entity should be selectable.

Selecting an entity highlights it in the 3D viewport.

---

# 24. RIGHT INSPECTOR PANEL

When no object selected:

```text
SELECT AN OBJECT

Select a parcel, building,
floor or property unit.
```

When unit selected:

Header:

**PROPERTY UNIT**

`U01`

Status:

`VALID`

Show:

```text
SPATIAL IDENTIFIER

29384756102934-B01-F01-U01-V01

GEOMETRY

POLYHEDRALSURFACEZ

ELEVATION

0.00 — 3.20 m

AREA

84.50 m²

VOLUME

270.40 m³

VERSION

V01

GEOMETRY HASH

7f3c...91a2
```

Buttons:

`VIEW RECORD`

`VIEW HISTORY`

`COPY ID`

---

# 25. PROPERTY RECORD SCREEN

Create a detailed cadastral record page.

Header:

**PROPERTY RECORD**

Breadcrumb:

`PARCEL / B01 / F01 / U01`

Top status:

`VALIDATED`

Information sections:

## IDENTIFICATION

* ULPIN
* Spatial ID
* Version
* Unit code

## LOCATION

* Parcel
* Building
* Floor
* Coordinates

## GEOMETRY

* Footprint area
* Z minimum
* Z maximum
* Volume
* Geometry type
* Geometry hash

## OWNERSHIP / RECORD

Design the interface so ownership information can be added later without redesigning the application.

## VALIDATION

Show:

```text
GEOMETRY       PASS
TOPOLOGY       PASS
OVERLAP        PASS
IDENTIFIER     PASS
```

---

# 26. PROPERTY HISTORY

Create a version history timeline.

Example:

```text
V03   18 SEP 2026
      Geometry updated
      Approved

│
V02   12 AUG 2026
      Floor boundary modified

│
V01   04 JUL 2026
      Initial registration
```

Each version includes:

* timestamp
* user/system
* change type
* geometry hash
* validation state

---

# 27. GLOBAL SEARCH

Implement a Cmd/Ctrl+K style search modal.

Title:

**SEARCH CADASTRAL DATABASE**

Search:

`293847...`

Results grouped by:

### PARCELS

### BUILDINGS

### FLOORS

### PROPERTY UNITS

### SPATIAL IDENTIFIERS

Example result:

```text
PROPERTY UNIT
U01

29384756102934-B01-F01-U01-V01

Building B01 · Floor F01
```

Keyboard hint:

`ENTER OPEN`

`ESC CLOSE`

---

# 28. SPATIAL IDENTIFIERS SCREEN

Title:

**SPATIAL IDENTIFIER REGISTRY**

Table:

| Identifier               | Entity | Version | Status |
| ------------------------ | ------ | ------: | ------ |
| 293847...B01-F01-U01-V01 | U01    |     V01 | ACTIVE |
| 293847...B01-F01-U02-V01 | U02    |     V01 | ACTIVE |

Filters:

* Parcel
* Building
* Floor
* Status
* Version

Search field:

`SEARCH IDENTIFIER...`

---

# 29. AUDIT TRAIL SCREEN

Title:

**AUDIT TRAIL**

Timeline/table:

```text
TIMESTAMP
18 SEP 2026 10:42:31

ACTOR
SYSTEM

ACTION
3D RECORD GENERATED

OBJECT
U01

RESULT
SUCCESS
```

Filters:

* Date
* User
* Action
* Entity
* Status

Use IBM Plex Mono for timestamps.

---

# 30. SETTINGS SCREEN

Sections:

### SYSTEM

* API endpoint
* Database connection
* GIS configuration
* Coordinate reference system

### 3D VIEWER

* Default camera
* Grid visibility
* Unit visibility
* Wireframe
* Terrain

### VALIDATION

* Overlap tolerance
* Elevation tolerance
* Geometry precision

### APPLICATION

* Theme
* Keyboard shortcuts
* Version

---

# 31. COMPONENT LIBRARY

Create reusable Figma components.

### Buttons

* Primary
* Secondary
* Ghost
* Danger
* Icon button

### Inputs

* Text input
* Search
* Select
* Multi-select
* Number input

### Status

* Success
* Warning
* Error
* Processing
* Offline

### Cards

* KPI card
* Dataset card
* Property card
* AI proposal
* Validation issue

### Navigation

* Sidebar item
* Breadcrumb
* Workflow step
* Tabs

### Data

* Data table
* Tree view
* Timeline
* Inspector
* Metadata cell

### GIS

* Map controls
* Floor selector
* Elevation slider
* 3D camera controls
* Layer switcher
* Coordinate display

---

# 32. ICONOGRAPHY

Use a consistent technical icon set.

Suitable icons:

* Map
* Layers
* Building
* Database
* Upload
* Search
* Shield/check
* Alert
* Cube
* Ruler
* Grid
* History
* Settings
* Eye
* Eye-off
* Rotate 3D
* Zoom
* Target
* File
* AI/spark icon

Icons should be thin-line and understated.

---

# 33. MICRO-INTERACTIONS

Implement prototype interactions.

### Sidebar

Click navigation → change workspace.

### Workflow

Click completed workflow step → open corresponding screen.

### Import

Drop file → show uploaded state.

### Analyze

Click:

`ANALYZE DATA`

→ loading state

→ analysis results.

### AI Review

Click:

`ACCEPT`

→ proposal becomes approved.

### Validation

Click:

`RUN VALIDATION`

→ progress

→ validation results.

### Generate

Click:

`GENERATE RECORDS`

→ processing

→ success.

### 3D

Click object → highlight object → populate inspector.

### Floor

Click floor → isolate floor.

### Explode

Toggle explode → vertically separate floors.

### Search

Cmd/Ctrl+K → open search modal.

### Property

Click unit → open property record.

---

# 34. EMPTY STATES

Create professional empty states.

Example:

**NO PROPERTY SELECTED**

`Select an entity from the cadastral hierarchy or 3D viewport.`

Avoid cartoon illustrations.

Use technical geometric line art instead.

---

# 35. LOADING STATES

Use technical progress indicators.

Example:

```text
PROCESSING GEOMETRY

██████████████░░░░░░ 72%

GENERATING POLYHEDRAL SURFACES
```

---

# 36. ERROR STATES

Example:

```text
GEOMETRY VALIDATION FAILED

UNIT U04

Self-intersection detected
at geometry segment 18.

ACTION REQUIRED

[VIEW GEOMETRY]
[REVIEW DATA]
```

---

# 37. SUCCESS STATES

Example:

```text
✓ VALIDATION COMPLETE

18 checks passed
0 critical issues
0 topology conflicts

3D records are ready for generation.
```

---

# 38. 3D VISUAL LANGUAGE

The 3D model is central to the product.

Represent:

### Parcel

Thin boundary polygon.

### Building

Solid extruded structure.

### Floor

Horizontal separation plane.

### Unit

Individual translucent/solid volume.

### Selected unit

Brass outline.

### Validated unit

Teal indicator.

### Conflict

Red highlight.

### Elevation

Technical measurement labels.

The 3D view should resemble professional GIS/CAD software rather than a game.

---

# 39. RESPONSIVE DESIGN

Primary target:

Desktop.

At 1440px:

* sidebar visible
* hierarchy visible
* 3D viewport large
* inspector visible

At 1280px:

* reduce sidebar width
* compress inspector
* maintain 3D viewport

At tablet:

* sidebar collapses
* inspector becomes drawer

At mobile:

The full GIS workstation should not attempt to replicate the desktop layout.

Instead show:

* Dashboard
* Property search
* Property record
* Validation summary

3D explorer can become a full-screen viewport with bottom sheets.

---

# 40. ACCESSIBILITY

Use:

* sufficient contrast
* keyboard navigation
* visible focus states
* descriptive labels
* not color alone for status
* readable technical text
* minimum 44px interactive touch target

Keyboard shortcuts:

`Ctrl/Cmd + K` Search

`Esc` Close modal

`R` Reset 3D camera

`F` Fit selection

`1–8` Select floor

---

# 41. DESIGN TOKENS

Create variables for:

### Spacing

4
8
12
16
20
24
32
40
48

### Radius

Use mostly:

`2px`

`4px`

`6px`

Avoid overly rounded UI.

### Borders

1px technical borders.

### Shadows

Minimal.

The interface should derive depth mainly from:

* contrast
* borders
* layering
* elevation
* spacing

---

# 42. IMPORTANT DATA TERMINOLOGY

Use these exact terms consistently:

**ULPIN**

**3D Spatial Identifier**

**Land Parcel**

**Building**

**Floor**

**Property Unit**

**Vertical Reference**

**Z MIN**

**Z MAX**

**Footprint**

**PolyhedralSurfaceZ**

**Geometry Hash**

**Geometry Version**

**Topology Validation**

**Volumetric Overlap**

**AI Proposal**

**Audit Trail**

**Import Session**

Do not replace these terms with generic terms such as:

"Project"

"Asset"

"Customer"

"Product"

"Workspace item"

This is a cadastral/GIS application.

---

# 43. TECHNICAL SYSTEM CONTEXT

The frontend design must correspond to the actual project architecture.

Frontend:

**React + TypeScript + Vite**

3D:

**Three.js / React Three Fiber**

Backend:

**FastAPI / Python**

Database:

**PostgreSQL + PostGIS**

Geometry:

**PolyhedralSurfaceZ**

Validation:

**Separating Axis Theorem (SAT)**

Hashing:

**SHA-256**

Data:

**GeoJSON + CSV**

AI:

AI-assisted cadastral field mapping/review.

The Figma design should visually expose this technical architecture where appropriate, but never overwhelm the user with implementation details.

---

# 44. DEMO STORY

The prototype must support this complete demonstration:

### Scene 1

Open Dashboard.

Show:

* parcels
* buildings
* property units
* validation status
* 3D building

### Scene 2

Click:

**IMPORT DATA**

Upload:

* parcel.geojson
* buildings.geojson
* floors.csv
* units.geojson

### Scene 3

Analyze data.

Show:

* geometry
* CRS
* feature counts
* validity

### Scene 4

Map fields.

Show source → target mappings.

### Scene 5

AI review.

Approve mapping proposals.

### Scene 6

Run validation.

Show topology checks and volumetric overlap detection.

### Scene 7

Generate 3D records.

Show:

`ULPIN + BUILDING + FLOOR + UNIT + VERSION`

### Scene 8

Open 3D Explorer.

Select:

`Building → Floor → Unit`

### Scene 9

Show inspector.

Display:

* area
* volume
* elevation
* spatial ID
* geometry hash

### Scene 10

Open property history.

Show versioning and audit trail.

---

# 45. FIGMA FILE ORGANIZATION

Create these Figma pages:

## PAGE 01 — COVER

Project title and design direction.

## PAGE 02 — DESIGN SYSTEM

Colors, typography, spacing, buttons, inputs, statuses.

## PAGE 03 — COMPONENTS

All reusable components.

## PAGE 04 — DASHBOARD

Dashboard screens.

## PAGE 05 — IMPORT WORKFLOW

All seven workflow steps.

## PAGE 06 — 3D EXPLORER

Main GIS interface and states.

## PAGE 07 — PROPERTY RECORDS

Property detail and history.

## PAGE 08 — VALIDATION

Validation dashboard and issue states.

## PAGE 09 — SEARCH

Global search and result states.

## PAGE 10 — AUDIT

Audit trail.

## PAGE 11 — SETTINGS

System configuration.

## PAGE 12 — PROTOTYPE FLOW

Connect the complete demo journey.

---

# 46. IMPORTANT VISUAL PRIORITY

The hierarchy of visual importance should be:

1. **3D cadastral model**
2. **Property / spatial information**
3. **Validation state**
4. **Workflow**
5. **Dataset information**
6. **System status**
7. **Secondary controls**

The application must immediately communicate:

> "This is a system for turning 2D land records into validated 3D property records."

---

# 47. DO NOT DESIGN IT AS

Do NOT make it:

* generic admin dashboard
* banking application
* CRM
* e-commerce dashboard
* generic AI application
* gaming interface
* futuristic neon cyberpunk interface
* overly rounded SaaS interface

It should look like:

**Government GIS + cadastral engineering + 3D spatial database + technical survey workstation.**

---

# 48. FINAL FIGMA AI INSTRUCTION

Build the entire interface as a coherent production-ready design system.

Prioritize:

**precision → hierarchy → spatial understanding → technical credibility → usability**

Use realistic cadastral sample data.

Create polished desktop screens at 1440×900.

Create connected prototype interactions.

Use consistent components and variables.

The 3D Explorer should be the visual centerpiece.

The Dashboard should immediately explain the system.

The Import Workflow should make the complete data transformation understandable.

The Property Record should make a 3D property legally/technically identifiable through its spatial identifier, geometry, elevation, volume, and version.

The final design should be suitable for:

* Smart India Hackathon 2026
* Government stakeholder demonstration
* GIS technical presentation
* Cadastral data-management demonstration
* Technical product showcase

Do not simplify away the technical nature of the application.

Make it feel like a serious operational system used by surveyors, GIS engineers, land-record administrators and technical reviewers.
