-- 012_performance_indexes.sql
-- Add performance indexes for common query patterns

-- Property unit indexes
CREATE INDEX IF NOT EXISTS idx_property_unit_type ON property_unit(unit_type);
CREATE INDEX IF NOT EXISTS idx_property_unit_hash ON property_unit(geometry_hash);
CREATE INDEX IF NOT EXISTS idx_property_unit_version ON property_unit(geometry_version);

-- Building indexes
CREATE INDEX IF NOT EXISTS idx_building_height ON building(height_m);
CREATE INDEX IF NOT EXISTS idx_building_parcel ON building(parcel_id);

-- Floor indexes
CREATE INDEX IF NOT EXISTS idx_floor_building ON floor(building_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- AI Proposal indexes
CREATE INDEX IF NOT EXISTS idx_ai_proposal_status ON ai_proposal(status);
CREATE INDEX IF NOT EXISTS idx_ai_proposal_created ON ai_proposal(created_at DESC);

-- Validation Run indexes
CREATE INDEX IF NOT EXISTS idx_validation_run_status ON validation_run(status);
CREATE INDEX IF NOT EXISTS idx_validation_run_started ON validation_run(started_at DESC);

-- Spatial Identifier indexes
CREATE INDEX IF NOT EXISTS idx_spatial_id_ulpin ON spatial_identifier(ulpin);
CREATE INDEX IF NOT EXISTS idx_spatial_id_building ON spatial_identifier(building_code);
CREATE INDEX IF NOT EXISTS idx_spatial_id_floor ON spatial_identifier(floor_code);