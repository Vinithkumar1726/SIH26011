-- 013_seed_password_hashes.sql
-- Seed password hashes for demo users (password: demo123)
-- Hash generated with bcrypt (cost=12)

UPDATE app_user SET 
    password_hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S',
    last_login = NULL,
    is_active = TRUE
WHERE username IN ('admin', 'rajesh.k', 'priya.s', 'amit.p');