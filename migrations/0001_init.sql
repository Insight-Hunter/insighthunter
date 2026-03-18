

PRAGMA journal_mode = WAL;

-- ── Users & Auth ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT,
  password_hash TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'free', -- free|starter|pro|business
  plan_updated_at TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT,
  deleted_at    TEXT
);
CREATE INDEX idx_users_email ON users(email);

-- ── Bookkeeping ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL, -- checking|savings|credit|loan|asset
  balance    REAL NOT NULL DEFAULT 0,
  currency   TEXT NOT NULL DEFAULT 'USD',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  deleted_at TEXT
);
CREATE INDEX idx_accounts_user ON accounts(user_id);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL, -- income|expense
  color      TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_categories_user ON categories(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  account_id   TEXT REFERENCES accounts(id),
  category_id  TEXT REFERENCES categories(id),
  description  TEXT NOT NULL,
  amount       REAL NOT NULL,
  type         TEXT NOT NULL, -- income|expense
  date         TEXT NOT NULL,
  notes        TEXT,
  reconciled   INTEGER DEFAULT 0,
  created_at   TEXT NOT NULL,
  updated_at   TEXT,
  deleted_at   TEXT
);
CREATE INDEX idx_tx_user_date ON transactions(user_id, date);
CREATE INDEX idx_tx_user_type ON transactions(user_id, type);

-- ── Payroll ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  email           TEXT,
  employment_type TEXT NOT NULL DEFAULT 'w2', -- w2|1099
  pay_type        TEXT NOT NULL DEFAULT 'salary', -- salary|hourly
  pay_rate        REAL NOT NULL,
  filing_status   TEXT,
  allowances      INTEGER DEFAULT 1,
  start_date      TEXT,
  end_date        TEXT,
  created_at      TEXT NOT NULL,
  deleted_at      TEXT
);
CREATE INDEX idx_employees_user ON employees(user_id);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  pay_period   TEXT NOT NULL,
  pay_date     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  total_gross  REAL DEFAULT 0,
  total_tax    REAL DEFAULT 0,
  total_net    REAL DEFAULT 0,
  created_at   TEXT NOT NULL,
  approved_at  TEXT
);
CREATE INDEX idx_runs_user ON payroll_runs(user_id);

-- ── PBX ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pbx_numbers (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id),
  phone_number TEXT NOT NULL,
  sid          TEXT,
  status       TEXT DEFAULT 'active',
  label        TEXT,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pbx_calls (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id       TEXT REFERENCES users(id),
  sid           TEXT,
  from_number   TEXT,
  to_number     TEXT,
  type          TEXT DEFAULT 'call',
  direction     TEXT DEFAULT 'inbound',
  duration_s    INTEGER,
  status        TEXT DEFAULT 'completed',
  recording_url TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_calls_user ON pbx_calls(user_id, created_at);

CREATE TABLE IF NOT EXISTS pbx_voicemails (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id      TEXT REFERENCES users(id),
  from_number  TEXT,
  recording_url TEXT,
  transcript   TEXT,
  listened     INTEGER DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pbx_sms (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id     TEXT REFERENCES users(id),
  from_number TEXT,
  to_number   TEXT,
  body        TEXT,
  direction   TEXT DEFAULT 'inbound',
  read        INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_sms_user ON pbx_sms(user_id, created_at);

-- ── BizForma ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formations (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  business_name       TEXT NOT NULL,
  entity_type         TEXT NOT NULL, 
  state_of_formation  TEXT,
  ein                 TEXT,
  status              TEXT DEFAULT 'draft',
  created_at          TEXT NOT NULL,
  updated_at          TEXT,
  deleted_at          TEXT
);

CREATE TABLE IF NOT EXISTS formation_compliance (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  formation_id  TEXT NOT NULL REFERENCES formations(id),
  title         TEXT NOT NULL,
  description   TEXT,
  due_date      TEXT,
  completed_at  TEXT,
  category      TEXT
);
CREATE INDEX idx_compliance_formation ON formation_compliance(formation_id);

CREATE TABLE IF NOT EXISTS payroll_lines (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES payroll_runs(id),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  gross       REAL DEFAULT 0,
  fed_tax     REAL DEFAULT 0,
  fica        REAL DEFAULT 0,
  state_tax   REAL DEFAULT 0,
  net         REAL DEFAULT 0,
  hours       REAL DEFAULT 80
);
CREATE INDEX idx_lines_run ON payroll_lines(run_id);

-- ── pbx_calls: add notes column ────────────────────────────────
ALTER TABLE pbx_calls ADD COLUMN notes TEXT;
