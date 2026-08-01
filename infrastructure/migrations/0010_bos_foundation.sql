-- infrastructure/migrations/0010_bos_foundation.sql
-- Business Operating System: Foundation Schema
-- Creates: organizations, org_members, org_health_metrics, audit_logs
-- Run with: wrangler d1 execute insighthunter-platform --file=infrastructure/migrations/0010_bos_foundation.sql

-- ─── Organizations (tenant root) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id            TEXT    PRIMARY KEY,
  name          TEXT    NOT NULL,
  slug          TEXT    UNIQUE NOT NULL,
  plan          TEXT    NOT NULL DEFAULT 'starter',
                        -- starter | growth | pro | enterprise
  status        TEXT    NOT NULL DEFAULT 'active',
                        -- active | suspended | cancelled
  owner_user_id TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─── Org Members (RBAC) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_members (
  id          TEXT    PRIMARY KEY,
  org_id      TEXT    NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     TEXT    NOT NULL,
  role        TEXT    NOT NULL DEFAULT 'read_only',
              -- owner | admin | accountant | payroll_manager | advisor | read_only
  status      TEXT    NOT NULL DEFAULT 'active',
              -- active | invited | suspended
  invited_by  TEXT,
  joined_at   TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, user_id)
);

-- ─── Users ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id             TEXT     PRIMARY KEY,
  email          TEXT     UNIQUE NOT NULL,
  name           TEXT     NOT NULL,
  password_hash  TEXT     NOT NULL,
  email_verified INTEGER  NOT NULL DEFAULT 0,
  mfa_enabled    INTEGER  NOT NULL DEFAULT 0,
  mfa_secret     TEXT,
  created_at     TEXT     NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT     NOT NULL DEFAULT (datetime('now'))
);

-- ─── Email Verifications ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_verifications (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT     UNIQUE NOT NULL,
  used        INTEGER  NOT NULL DEFAULT 0,
  expires_at  TEXT     NOT NULL,
  created_at  TEXT     NOT NULL DEFAULT (datetime('now'))
);

-- ─── Password Resets ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_resets (
  id          INTEGER  PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT     UNIQUE NOT NULL,
  used        INTEGER  NOT NULL DEFAULT 0,
  expires_at  TEXT     NOT NULL,
  created_at  TEXT     NOT NULL DEFAULT (datetime('now'))
);

-- ─── Business Health Metrics ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS org_health_metrics (
  id            INTEGER  PRIMARY KEY AUTOINCREMENT,
  org_id        TEXT     NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_key    TEXT     NOT NULL,
                         -- cash_position | revenue_growth | debt_risk |
                         -- payroll_burden | customer_concentration | compliance_status
  metric_value  REAL     NOT NULL,   -- normalized 0–100
  raw_value     REAL,                -- actual dollar/percent value
  recorded_at   TEXT     NOT NULL DEFAULT (datetime('now'))
);

-- ─── Audit Log (immutable) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id             INTEGER  PRIMARY KEY AUTOINCREMENT,
  org_id         TEXT     NOT NULL,
  user_id        TEXT     NOT NULL,
  action         TEXT     NOT NULL,
                          -- user.login | user.logout | user.password_change |
                          -- user.mfa_enabled | org.created | org.member_invited |
                          -- org.role_changed | billing.subscription_started |
                          -- billing.subscription_cancelled | payroll.submitted |
                          -- payroll.approved | report.deleted | report.exported |
                          -- admin.action
  resource_type  TEXT,    -- organization | user | report | payroll_run | etc.
  resource_id    TEXT,
  metadata       TEXT,    -- JSON blob for extra context
  ip             TEXT,
  user_agent     TEXT,
  created_at     TEXT     NOT NULL DEFAULT (datetime('now'))
);

-- ─── Notifications ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT     PRIMARY KEY,
  org_id      TEXT     NOT NULL,
  user_id     TEXT     NOT NULL,
  title       TEXT     NOT NULL,
  body        TEXT,
  type        TEXT     NOT NULL DEFAULT 'info',
              -- info | warning | error | success
  read        INTEGER  NOT NULL DEFAULT 0,
  action_url  TEXT,
  created_at  TEXT     NOT NULL DEFAULT (datetime('now'))
);

-- ─── Indexes ──────────────────────────────────────────────────────────────

-- Org lookups
CREATE INDEX IF NOT EXISTS idx_orgs_slug
  ON organizations(slug);

CREATE INDEX IF NOT EXISTS idx_orgs_status
  ON organizations(status);

-- Member lookups
CREATE INDEX IF NOT EXISTS idx_members_org
  ON org_members(org_id);

CREATE INDEX IF NOT EXISTS idx_members_user
  ON org_members(user_id);

CREATE INDEX IF NOT EXISTS idx_members_org_user
  ON org_members(org_id, user_id);

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

-- Token lookups
CREATE INDEX IF NOT EXISTS idx_email_verify_token
  ON email_verifications(token);

CREATE INDEX IF NOT EXISTS idx_email_verify_user
  ON email_verifications(user_id, used);

CREATE INDEX IF NOT EXISTS idx_password_reset_token
  ON password_resets(token);

-- Health metrics
CREATE INDEX IF NOT EXISTS idx_health_org_key
  ON org_health_metrics(org_id, metric_key, recorded_at DESC);

-- Audit log
CREATE INDEX IF NOT EXISTS idx_audit_org_date
  ON audit_logs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user_date
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON audit_logs(action, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_user
  ON notifications(org_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_unread
  ON notifications(user_id, read);
