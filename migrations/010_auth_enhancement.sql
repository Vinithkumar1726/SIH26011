-- 010_auth_enhancement.sql
-- Add password_hash, last_login, is_active to app_user

ALTER TABLE app_user ADD COLUMN password_hash VARCHAR(128);
ALTER TABLE app_user ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_user ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Create index on username for faster login lookups
CREATE INDEX idx_app_user_username ON app_user(username);