-- Migration: add plan expiry + BizForma promo tracking
-- apps/insighthunter-auth/db/migrations/002_plan_expiry.sql

ALTER TABLE users ADD COLUMN plan_expires   TEXT    DEFAULT NULL;
ALTER TABLE users ADD COLUMN plan_source    TEXT    NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN bizforma_paid  INTEGER NOT NULL DEFAULT 0;

-- When BizForma payment confirmed, run:
-- UPDATE users
--   SET plan = 'standard',
--       plan_expires = datetime('now', '+6 months'),
--       plan_source = 'bizforma_promo',
--       bizforma_paid = 1,
--       updated_at = datetime('now')
-- WHERE id = ?;

-- Cron job (Cloudflare Worker Cron) — downgrade expired standard/lite plans:
-- UPDATE users
--   SET plan = 'free', plan_source = 'expired', updated_at = datetime('now')
-- WHERE plan_expires IS NOT NULL
--   AND plan_expires < datetime('now')
--   AND plan NOT IN ('pro');
