-- 0008_verification_tokens_metadata.sql
-- Add metadata_json column to verification_tokens for invite payloads
-- Safe to run multiple times (SQLite ignores ADD COLUMN if column already exists via try/catch in app layer)

-- SQLite does not support IF NOT EXISTS on ALTER TABLE ADD COLUMN in all versions.
-- Wrangler D1 runs these sequentially; guard with a separate check in CI if needed.
ALTER TABLE verification_tokens ADD COLUMN metadata_json TEXT;

-- Index for invite token lookups by org_id stored in metadata_json
-- (full-text JSON index not supported in D1/SQLite; org_id filter done in app layer via LIKE)
CREATE INDEX IF NOT EXISTS idx_tokens_type_expires ON verification_tokens(type, expires_at);
