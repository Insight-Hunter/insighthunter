-- apps/insighthunter-bookkeeping/db/schema.sql
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      REAL NOT NULL,
  category    TEXT NOT NULL DEFAULT '',
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tx_user     ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_date     ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(user_id, category);
