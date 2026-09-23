-- Migration 006: model_verifier must stay NULL until a human actually
-- records a decision (previously backfilled with "human-reviewer" at
-- proposal creation time, before any review happened).
-- Run: psql -U postgres -d sih26011 -f migrations/006_verifier_nullable.sql
ALTER TABLE ai_proposal ALTER COLUMN model_verifier DROP NOT NULL;
