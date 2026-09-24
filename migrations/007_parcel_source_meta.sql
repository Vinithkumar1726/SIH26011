-- 007: nullable source-metadata for live-captured parcels.
-- AIProposal rows already carry JSONB proposal_data; only cadastral_parcels
-- needs a new column. Existing height_source enum is untouched.
ALTER TABLE cadastral_parcels
    ADD COLUMN IF NOT EXISTS source_meta JSONB;
