-- Migration 005: payload storage for live-capture proposals.
-- Holds everything needed to materialize the parcel on approval:
-- {wkt, height_m, ulpin, lat, lon, source} where source is exactly
-- "vision" or "synthetic_fallback".
-- Run: psql -U postgres -d sih26011 -f migrations/005_proposal_data.sql
ALTER TABLE ai_proposal ADD COLUMN IF NOT EXISTS proposal_data JSONB;
