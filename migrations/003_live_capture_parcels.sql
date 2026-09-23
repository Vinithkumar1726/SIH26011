-- Migration 003: live-capture parcels for click-to-extract buildings.
-- Run: psql -U postgres -d sih26011 -f migrations/003_live_capture_parcels.sql
CREATE TABLE IF NOT EXISTS cadastral_parcels (
  parcel_id TEXT PRIMARY KEY,
  footprint geometry(Polygon, 4326),
  solid_geom geometry(PolyhedralSurfaceZ),
  height_m DOUBLE PRECISION NOT NULL DEFAULT 12.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
