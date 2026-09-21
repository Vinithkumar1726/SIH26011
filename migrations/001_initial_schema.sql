-- SIH26011 — Database Schema
-- PostgreSQL 15+ with PostGIS 3.4+
-- Aligned to ISO 19152 LADM concepts
--
-- Run: psql -U postgres -d sih26011 -f migrations/001_initial_schema.sql

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Enums ─────────────────────────────────────────────────────

CREATE TYPE height_source AS ENUM (
    'LIDAR', 'DSM', 'SURVEY', 'PROVIDED', 'BIM', 'OSM', 'AI', 'ESTIMATED', 'SYNTHETIC'
);

CREATE TYPE user_role AS ENUM ('admin', 'surveyor', 'reviewer', 'viewer');

CREATE TYPE import_status AS ENUM ('PERSISTED', 'REJECTED');

CREATE TYPE validation_severity AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'INFO');

CREATE TYPE ai_proposal_status AS ENUM ('REVIEW_REQUIRED', 'APPROVED', 'REJECTED');

-- ─── Land Parcel (LA_SpatialUnit) ──────────────────────────────

CREATE TABLE land_parcel (
    id TEXT PRIMARY KEY,
    ulpin VARCHAR(14) NOT NULL,
    name TEXT NOT NULL,
    area_sqm DOUBLE PRECISION NOT NULL,
    srid INTEGER NOT NULL DEFAULT 4326,
    geometry geometry(MultiPolygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_land_parcel_ulpin ON land_parcel(ulpin);

-- ─── Building (LA_SpatialUnit) ─────────────────────────────────

CREATE TABLE building (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL REFERENCES land_parcel(id),
    name TEXT NOT NULL,
    height_m DOUBLE PRECISION NOT NULL,
    height_source height_source NOT NULL,
    floors_count INTEGER NOT NULL,
    footprint geometry(Polygon, 4326),
    solid_geom geometry(PolyhedralSurfaceZ),  -- Real 3D solid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_building_parcel ON building(parcel_id);

-- ─── Floor (LA_SpatialUnit) ────────────────────────────────────

CREATE TABLE floor (
    id TEXT PRIMARY KEY,
    building_id TEXT NOT NULL REFERENCES building(id),
    floor_code VARCHAR(3) NOT NULL,  -- B01, F00, F01, etc.
    floor_label TEXT NOT NULL,
    z_min DOUBLE PRECISION NOT NULL,
    z_max DOUBLE PRECISION NOT NULL,
    area_sqm DOUBLE PRECISION NOT NULL,
    solid_geom geometry(PolyhedralSurfaceZ),
    CONSTRAINT chk_floor_z CHECK (z_max > z_min),
    CONSTRAINT chk_floor_code CHECK (floor_code ~ '^[BF][0-9]{2}$')
);

CREATE INDEX idx_floor_building ON floor(building_id);

-- ─── Property Unit (LA_SpatialUnit) ────────────────────────────

CREATE TABLE property_unit (
    id TEXT PRIMARY KEY,
    floor_id TEXT NOT NULL REFERENCES floor(id),
    unit_code VARCHAR(10) NOT NULL,
    unit_type VARCHAR(20) NOT NULL,  -- apartment, parking, commercial, common, lobby
    label TEXT NOT NULL,
    area_sqm DOUBLE PRECISION NOT NULL,
    volume_cum DOUBLE PRECISION NOT NULL,
    footprint geometry(Polygon, 4326),
    solid_geom geometry(PolyhedralSurfaceZ),  -- Real 3D solid
    geometry_hash VARCHAR(64) NOT NULL,  -- SHA-256 of normalized geometry
    geometry_version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_unit_area CHECK (area_sqm > 0),
    CONSTRAINT chk_unit_volume CHECK (volume_cum > 0),
    CONSTRAINT chk_unit_version CHECK (geometry_version > 0)
);

CREATE INDEX idx_property_unit_floor ON property_unit(floor_id);
CREATE INDEX idx_property_unit_hash ON property_unit(geometry_hash);

-- ─── Spatial Identifier ────────────────────────────────────────
-- Proposed standards-aligned extension of ECCMA/ISO 8000-118

CREATE TABLE spatial_identifier (
    id TEXT PRIMARY KEY,
    identifier_string TEXT NOT NULL UNIQUE,
    ulpin VARCHAR(14) NOT NULL,
    building_code VARCHAR(10) NOT NULL,
    floor_code VARCHAR(3) NOT NULL,
    unit_code VARCHAR(10) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    geometry_hash VARCHAR(64) NOT NULL,
    property_unit_id TEXT NOT NULL UNIQUE REFERENCES property_unit(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_spatial_id_string ON spatial_identifier(identifier_string);
CREATE INDEX idx_spatial_id_ulpin ON spatial_identifier(ulpin);

-- ─── Spatial Identifier History ────────────────────────────────

CREATE TABLE spatial_identifier_history (
    id TEXT PRIMARY KEY,
    identifier_string TEXT NOT NULL,
    version INTEGER NOT NULL,
    geometry_hash VARCHAR(64) NOT NULL,
    retired_geom geometry(PolyhedralSurfaceZ),  -- nullable: don't fabricate for pre-existing
    retired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    identifier_id TEXT NOT NULL REFERENCES spatial_identifier(id)
);

CREATE INDEX idx_sid_history_identifier ON spatial_identifier_history(identifier_id);

-- ─── Validation ────────────────────────────────────────────────

CREATE TABLE validation_run (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(10) NOT NULL,  -- RUNNING, PASSED, FAILED
    total_checks INTEGER DEFAULT 0,
    passed_checks INTEGER DEFAULT 0,
    failed_checks INTEGER DEFAULT 0
);

CREATE TABLE validation_issue (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES validation_run(id),
    severity validation_severity NOT NULL,
    code VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id TEXT
);

CREATE INDEX idx_validation_issue_run ON validation_issue(run_id);

-- ─── AI Proposals ──────────────────────────────────────────────

CREATE TABLE ai_proposal (
    id TEXT PRIMARY KEY,
    building_id TEXT REFERENCES building(id),
    model_primary VARCHAR(50) NOT NULL,  -- SegFormer / MiT-B0
    model_verifier VARCHAR(50) NOT NULL,  -- DeepLabV3 / ResNet-50
    footprint_proposed jsonb,
    footprint_verified jsonb,
    iou_score DOUBLE PRECISION,
    agreement_score DOUBLE PRECISION,
    status ai_proposal_status NOT NULL DEFAULT 'REVIEW_REQUIRED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Import Sessions ───────────────────────────────────────────

CREATE TABLE import_session (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status import_status NOT NULL,
    file_manifest jsonb,
    source_crs VARCHAR(20),
    target_srid INTEGER,
    generated_ids jsonb,
    error_message TEXT
);

-- ─── Users & Audit ────────────────────────────────────────────

CREATE TABLE app_user (
    id TEXT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    role user_role NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES app_user(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details jsonb
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- ─── Spatial Config ────────────────────────────────────────────

CREATE TABLE spatial_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    project_srid INTEGER NOT NULL DEFAULT 32643,
    vertical_reference VARCHAR(20) NOT NULL DEFAULT 'ellipsoidal',
    linear_unit VARCHAR(10) NOT NULL DEFAULT 'metre'
);

-- Insert default config
INSERT INTO spatial_config (id, project_srid, vertical_reference, linear_unit)
VALUES ('default', 32643, 'ellipsoidal', 'metre');

-- ─── Demo Data ─────────────────────────────────────────────────

-- Parcel
INSERT INTO land_parcel (id, ulpin, name, area_sqm, srid)
VALUES (
    'parcel-001',
    '29384756102934',
    'Sector 48 · Plot A-12',
    4800,
    4326
);

-- Building
INSERT INTO building (id, parcel_id, name, height_m, height_source, floors_count)
VALUES (
    'bldg-001',
    'parcel-001',
    'Tower A — Residential',
    36,
    'LIDAR',
    12
);

-- Floors
INSERT INTO floor (id, building_id, floor_code, floor_label, z_min, z_max, area_sqm) VALUES
    ('fl-b01', 'bldg-001', 'B01', 'Basement 1 · Parking', -3.5, 0, 420),
    ('fl-f00', 'bldg-001', 'F00', 'Ground · Lobby + Commercial', 0, 3.5, 380),
    ('fl-f01', 'bldg-001', 'F01', 'First Floor', 3.5, 6.5, 400),
    ('fl-f02', 'bldg-001', 'F02', 'Second Floor', 6.5, 9.5, 400),
    ('fl-f03', 'bldg-001', 'F03', 'Third Floor', 9.5, 12.5, 400),
    ('fl-f04', 'bldg-001', 'F04', 'Fourth Floor', 12.5, 15.5, 400),
    ('fl-f05', 'bldg-001', 'F05', 'Fifth Floor', 15.5, 18.5, 400),
    ('fl-f06', 'bldg-001', 'F06', 'Sixth Floor', 18.5, 21.5, 400);

-- Users
INSERT INTO app_user (id, username, role, display_name) VALUES
    ('u1', 'admin', 'admin', 'System Administrator'),
    ('u2', 'rajesh.k', 'surveyor', 'Rajesh Kumar'),
    ('u3', 'priya.s', 'reviewer', 'Priya Sharma'),
    ('u4', 'amit.p', 'viewer', 'Amit Patel');
