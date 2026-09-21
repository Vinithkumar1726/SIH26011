-- SIH26011 — Migration 002: Add per-unit Z-range to property_unit
-- Run: psql -U postgres -d sih26011 -f migrations/002_add_unit_z_range.sql

-- Add z_min and z_max columns to property_unit table
ALTER TABLE property_unit 
ADD COLUMN z_min DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN z_max DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill: Set each unit's z_min/z_max from its floor's z_min/z_max
-- This preserves existing data exactly as-is at migration time
UPDATE property_unit pu
SET z_min = f.z_min,
    z_max = f.z_max
FROM floor f
WHERE pu.floor_id = f.id;

-- Remove the temporary defaults now that all existing rows are backfilled.
-- Future INSERTs that omit z_min/z_max will fail with NOT NULL violation
-- instead of silently inserting 0/0.
ALTER TABLE property_unit ALTER COLUMN z_min DROP DEFAULT;
ALTER TABLE property_unit ALTER COLUMN z_max DROP DEFAULT;

-- Add constraint to ensure z_max > z_min
ALTER TABLE property_unit 
ADD CONSTRAINT chk_unit_z CHECK (z_max > z_min);

-- Note: floor.z_min and floor.z_max are retained for genuine floor-level data
-- (e.g., floor-level ceiling height). They are no longer used as the source
-- of truth for individual unit Z-ranges. Unit Z-range now lives on property_unit.