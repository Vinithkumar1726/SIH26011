-- 011_cascade_deletes.sql
-- Add CASCADE DELETE to foreign keys for proper cleanup

-- Building -> LandParcel
ALTER TABLE building DROP CONSTRAINT IF EXISTS building_parcel_id_fkey;
ALTER TABLE building ADD CONSTRAINT building_parcel_id_fkey 
    FOREIGN KEY (parcel_id) REFERENCES land_parcel(id) ON DELETE CASCADE;

-- Floor -> Building
ALTER TABLE floor DROP CONSTRAINT IF EXISTS floor_building_id_fkey;
ALTER TABLE floor ADD CONSTRAINT floor_building_id_fkey 
    FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE CASCADE;

-- PropertyUnit -> Floor
ALTER TABLE property_unit DROP CONSTRAINT IF EXISTS property_unit_floor_id_fkey;
ALTER TABLE property_unit ADD CONSTRAINT property_unit_floor_id_fkey 
    FOREIGN KEY (floor_id) REFERENCES floor(id) ON DELETE CASCADE;

-- SpatialIdentifier -> PropertyUnit
ALTER TABLE spatial_identifier DROP CONSTRAINT IF EXISTS spatial_identifier_property_unit_id_fkey;
ALTER TABLE spatial_identifier ADD CONSTRAINT spatial_identifier_property_unit_id_fkey 
    FOREIGN KEY (property_unit_id) REFERENCES property_unit(id) ON DELETE CASCADE;

-- SpatialIdentifierHistory -> SpatialIdentifier
ALTER TABLE spatial_identifier_history DROP CONSTRAINT IF EXISTS spatial_identifier_history_identifier_id_fkey;
ALTER TABLE spatial_identifier_history ADD CONSTRAINT spatial_identifier_history_identifier_id_fkey 
    FOREIGN KEY (identifier_id) REFERENCES spatial_identifier(id) ON DELETE CASCADE;

-- ValidationIssue -> ValidationRun (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'validation_issue_run_id_fkey'
    ) THEN
        ALTER TABLE validation_issue DROP CONSTRAINT validation_issue_run_id_fkey;
        ALTER TABLE validation_issue ADD CONSTRAINT validation_issue_run_id_fkey 
            FOREIGN KEY (run_id) REFERENCES validation_run(id) ON DELETE CASCADE;
    END IF;
END $$;

-- AIProposal -> Building
ALTER TABLE ai_proposal DROP CONSTRAINT IF EXISTS ai_proposal_building_id_fkey;
ALTER TABLE ai_proposal ADD CONSTRAINT ai_proposal_building_id_fkey 
    FOREIGN KEY (building_id) REFERENCES building(id) ON DELETE SET NULL;

-- AuditLog -> AppUser
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES app_user(id) ON DELETE SET NULL;