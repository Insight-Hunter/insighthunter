-- apps/insighthunter-lite/migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS uploads (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT NOT NULL,
  filename    TEXT NOT NULL,
  r2_key      TEXT NOT NULL,
  row_count   INTEGER DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | processing | done | error
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  upload_id   TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  txn_date    TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      REAL NOT NULL,
  category    TEXT NOT NULL DEFAULT 'Uncategorized',
  type        TEXT NOT NULL DEFAULT 'expense', -- income | expense
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  upload_id    TEXT NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  report_type  TEXT NOT NULL DEFAULT 'summary', -- summary | pl | cashflow | forecast
  data_json    TEXT NOT NULL,
  ai_summary   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_uploads_user     ON uploads(user_id, created_at DESC);
CREATE INDEX idx_txns_upload      ON transactions(upload_id);
CREATE INDEX idx_txns_user_date   ON transactions(user_id, txn_date DESC);
CREATE INDEX idx_reports_upload   ON reports(upload_id);
