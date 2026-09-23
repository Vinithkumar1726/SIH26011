-- Migration 004: store live-capture extrusions as MultiPolygonZ so
-- geoalchemy2/shapely can serialize them (PolyhedralSurface = WKB type 15,
-- which shapely cannot parse). Table is tiny/test-only; USING cast is safe.
-- Run: psql -U postgres -d sih26011 -f migrations/004_solid_geom_multipolygon.sql
ALTER TABLE cadastral_parcels
  ALTER COLUMN solid_geom TYPE geometry(MultiPolygonZ)
  USING solid_geom::geometry;
