-- 008: SCD Type 2 temporal columns for live-captured parcels.
-- Non-destructive: all columns nullable-or-defaulted; existing rows
-- backfilled as active since now. Existing height_source enum untouched.
ALTER TABLE cadastral_parcels
    ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS parent_building_id TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cadastral_parcel_status') THEN
        ALTER TABLE cadastral_parcels
            ADD CONSTRAINT chk_cadastral_parcel_status
            CHECK (status IN ('active', 'demolished', 'altered', 'unauthorized_expansion'));
    END IF;
END
$$;

UPDATE cadastral_parcels
SET valid_from = COALESCE(created_at, NOW()), status = 'active'
WHERE status IS NULL OR status = 'active';

CREATE INDEX IF NOT EXISTS idx_cadastral_parcels_spatiotemporal
    ON cadastral_parcels USING gist (footprint, tstzrange(valid_from, valid_to));
