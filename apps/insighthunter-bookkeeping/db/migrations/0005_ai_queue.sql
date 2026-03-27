CREATE TABLE IF NOT EXISTS ai_classification_queue (
  id                    TEXT PRIMARY KEY,
  org_id                TEXT NOT NULL,
  transaction_id        TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  question              TEXT NOT NULL,
  suggested_account_id  TEXT REFERENCES accounts(id),
  suggested_account_name TEXT,
  confidence            REAL NOT NULL,
  ai_reasoning          TEXT NOT NULL,
  alternatives          TEXT NOT NULL DEFAULT '[]',
  status                TEXT NOT NULL DEFAULT 'pending',
  human_answer          TEXT,
  resolved_account_id   TEXT REFERENCES accounts(id),
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at           TEXT
);
CREATE INDEX IF NOT EXISTS idx_aiq_org    ON ai_classification_queue(org_id, status);
CREATE INDEX IF NOT EXISTS idx_aiq_tx     ON ai_classification_queue(transaction_id);
