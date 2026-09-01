-- apps/insighthunter-bookkeeping/migrations/0001_bookkeeping_foundation.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bookkeeping_clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE,
  owner_user_id TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  dba_name TEXT,
  entity_type TEXT,
  ein_last4 TEXT,
  industry TEXT,
  accounting_method TEXT CHECK (accounting_method IN ('cash', 'accrual')),
  fiscal_year_end_month INTEGER CHECK (fiscal_year_end_month BETWEEN 1 AND 12),
  plan_code TEXT NOT NULL DEFAULT 'startup'
    CHECK (plan_code IN ('startup', 'standard', 'pro')),
  subscription_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (subscription_status IN ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  onboarding_status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (onboarding_status IN ('not_started', 'in_progress', 'ready_for_review', 'active')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_onboarding_steps (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'complete', 'blocked')),
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, step_key)
);

CREATE TABLE IF NOT EXISTS bookkeeping_imports (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  uploader_user_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('csv', 'ofx', 'qfx')),
  original_filename TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'queued', 'processing', 'review_required', 'completed', 'failed')),
  error_message TEXT,
  imported_transaction_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_audit_log (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES bookkeeping_clients(id) ON DELETE SET NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  request_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_service_tiers (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rank INTEGER NOT NULL UNIQUE,
  billing_family TEXT NOT NULL DEFAULT 'insight_hunter',
  description TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_feature_flags (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_tier_features (
  tier_code TEXT NOT NULL REFERENCES bookkeeping_service_tiers(code) ON DELETE CASCADE,
  feature_code TEXT NOT NULL REFERENCES bookkeeping_feature_flags(code) ON DELETE CASCADE,
  included INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tier_code, feature_code)
);

CREATE TABLE IF NOT EXISTS bookkeeping_subscriptions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe' CHECK (provider IN ('stripe')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT UNIQUE,
  provider_price_lookup_key TEXT,
  tier_code TEXT NOT NULL REFERENCES bookkeeping_service_tiers(code),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  subscription_status TEXT NOT NULL
    CHECK (subscription_status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  unit_amount INTEGER NOT NULL DEFAULT 0 CHECK (unit_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  entitlement_snapshot_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS bookkeeping_bank_connections (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('plaid', 'csv', 'ofx', 'manual')),
  provider_item_id TEXT,
  provider_account_id TEXT,
  institution_name TEXT,
  account_name TEXT,
  account_mask TEXT,
  account_type TEXT,
  account_subtype TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'error', 'revoked', 'disconnected')),
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS bookkeeping_documents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  uploader_user_id TEXT NOT NULL,
  document_category TEXT NOT NULL
    CHECK (document_category IN (
      'bank_statement',
      'receipt',
      'invoice',
      'tax_document',
      'payroll',
      'formation',
      'other'
    )),
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  visibility TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'client', 'shared')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_import_batches (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  import_id TEXT NOT NULL REFERENCES bookkeeping_imports(id) ON DELETE CASCADE,
  source_account_connection_id TEXT
    REFERENCES bookkeeping_bank_connections(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'mapped', 'review_required', 'posted', 'failed')),
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_staged_transactions (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES bookkeeping_import_batches(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  transaction_date TEXT NOT NULL,
  posted_date TEXT,
  description TEXT NOT NULL,
  normalized_description TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  reference TEXT,
  external_transaction_id TEXT,
  hash_fingerprint TEXT NOT NULL,
  category_hint TEXT,
  status TEXT NOT NULL DEFAULT 'staged'
    CHECK (status IN ('staged', 'matched', 'ignored', 'ready_to_post', 'posted', 'duplicate', 'failed')),
  review_notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, hash_fingerprint)
);

CREATE TABLE IF NOT EXISTS bookkeeping_posting_runs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  batch_id TEXT REFERENCES bookkeeping_import_batches(id) ON DELETE SET NULL,
  started_by_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  staged_count INTEGER NOT NULL DEFAULT 0 CHECK (staged_count >= 0),
  posted_count INTEGER NOT NULL DEFAULT 0 CHECK (posted_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  ledger_response_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS bookkeeping_close_periods (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'client_review', 'closed', 'reopened')),
  checklist_percent INTEGER NOT NULL DEFAULT 0 CHECK (checklist_percent BETWEEN 0 AND 100),
  books_locked INTEGER NOT NULL DEFAULT 0 CHECK (books_locked IN (0, 1)),
  closed_at TEXT,
  closed_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS bookkeeping_close_tasks (
  id TEXT PRIMARY KEY,
  close_period_id TEXT NOT NULL REFERENCES bookkeeping_close_periods(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('system', 'client', 'bookkeeper', 'reviewer')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'complete', 'blocked')),
  due_at TEXT,
  completed_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (close_period_id, task_key)
);

CREATE TABLE IF NOT EXISTS bookkeeping_reconciliations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  connection_id TEXT REFERENCES bookkeeping_bank_connections(id) ON DELETE SET NULL,
  statement_document_id TEXT REFERENCES bookkeeping_documents(id) ON DELETE SET NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  statement_ending_balance_minor INTEGER NOT NULL,
  book_ending_balance_minor INTEGER,
  difference_minor INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'matched', 'exception', 'approved')),
  prepared_by_user_id TEXT,
  reviewed_by_user_id TEXT,
  prepared_at TEXT,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, connection_id, period_year, period_month)
);

CREATE TABLE IF NOT EXISTS bookkeeping_messages (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  author_user_id TEXT NOT NULL,
  author_role TEXT NOT NULL CHECK (author_role IN ('client', 'bookkeeper', 'reviewer', 'system')),
  visibility TEXT NOT NULL DEFAULT 'shared'
    CHECK (visibility IN ('shared', 'internal')),
  subject TEXT,
  body TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  read_by_client_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_tasks (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_on_client', 'resolved', 'canceled')),
  assigned_user_id TEXT,
  due_at TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_metrics_daily (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  metric_date TEXT NOT NULL,
  cash_balance_minor INTEGER,
  revenue_mtd_minor INTEGER,
  expense_mtd_minor INTEGER,
  uncategorized_count INTEGER NOT NULL DEFAULT 0,
  unreconciled_account_count INTEGER NOT NULL DEFAULT 0,
  open_client_tasks INTEGER NOT NULL DEFAULT 0,
  close_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, metric_date)
);

CREATE TABLE IF NOT EXISTS bookkeeping_report_cache (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  report_code TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payload_json TEXT NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  UNIQUE (client_id, report_code, period_start, period_end, currency)
);

CREATE TABLE IF NOT EXISTS bookkeeping_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('stripe')),
  provider_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  payload_json TEXT NOT NULL,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS bookkeeping_customer_checkouts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  requested_tier_code TEXT NOT NULL REFERENCES bookkeeping_service_tiers(code),
  requested_interval TEXT NOT NULL CHECK (requested_interval IN ('month', 'year')),
  stripe_checkout_session_id TEXT UNIQUE,
  checkout_status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (checkout_status IN ('initiated', 'completed', 'expired', 'failed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS bookkeeping_team_assignments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('owner', 'bookkeeper', 'reviewer', 'cfo')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  UNIQUE (client_id, user_id, assignment_role)
);

CREATE TABLE IF NOT EXISTS bookkeeping_client_settings (
  client_id TEXT PRIMARY KEY REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  dashboard_preferences_json TEXT NOT NULL DEFAULT '{}',
  notification_preferences_json TEXT NOT NULL DEFAULT '{}',
  statement_delivery_day INTEGER CHECK (statement_delivery_day BETWEEN 1 AND 28),
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_clients_owner
  ON bookkeeping_clients(owner_user_id);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_imports_client_status
  ON bookkeeping_imports(client_id, status);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_onboarding_steps_client
  ON bookkeeping_onboarding_steps(client_id, status);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_audit_client_created
  ON bookkeeping_audit_log(client_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_subscriptions_client_status
  ON bookkeeping_subscriptions(client_id, subscription_status);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_bank_connections_client_status
  ON bookkeeping_bank_connections(client_id, status);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_documents_client_category
  ON bookkeeping_documents(client_id, document_category, created_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_import_batches_client_status
  ON bookkeeping_import_batches(client_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_staged_transactions_batch_status
  ON bookkeeping_staged_transactions(batch_id, status, transaction_date);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_posting_runs_client_started
  ON bookkeeping_posting_runs(client_id, started_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_close_periods_client_period
  ON bookkeeping_close_periods(client_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_close_tasks_period_status
  ON bookkeeping_close_tasks(close_period_id, status);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_reconciliations_client_period
  ON bookkeeping_reconciliations(client_id, period_year, period_month, status);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_messages_client_created
  ON bookkeeping_messages(client_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_tasks_client_status_priority
  ON bookkeeping_tasks(client_id, status, priority, due_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_metrics_daily_client_date
  ON bookkeeping_metrics_daily(client_id, metric_date);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_report_cache_client_report
  ON bookkeeping_report_cache(client_id, report_code, generated_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_webhook_events_status
  ON bookkeeping_webhook_events(status, received_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_customer_checkouts_org_status
  ON bookkeeping_customer_checkouts(organization_id, checkout_status, created_at);

CREATE INDEX IF NOT EXISTS idx_bookkeeping_team_assignments_client_role
  ON bookkeeping_team_assignments(client_id, assignment_role, active);

INSERT OR IGNORE INTO bookkeeping_service_tiers (
  code,
  name,
  rank,
  billing_family,
  description,
  active
) VALUES
  (
    'startup',
    'Startup',
    1,
    'insight_hunter',
    'Entry bookkeeping tier for setup, document intake, and core bookkeeping workspace.',
    1
  ),
  (
    'standard',
    'Standard',
    2,
    'insight_hunter',
    'Monthly bookkeeping, reconciliations, close workflow, and client collaboration.',
    1
  ),
  (
    'pro',
    'Pro',
    3,
    'insight_hunter',
    'Priority bookkeeping operations, expanded reporting, and advisory-grade service workflow.',
    1
  );

INSERT OR IGNORE INTO bookkeeping_feature_flags (
  code,
  name,
  category,
  description,
  active
) VALUES
  (
    'bookkeeping.workspace',
    'Bookkeeping workspace',
    'core_access',
    'Access to the bookkeeping app shell and client dashboard.',
    1
  ),
  (
    'bookkeeping.documents',
    'Bookkeeping document vault',
    'documents',
    'Receipt, statement, and bookkeeping file storage.',
    1
  ),
  (
    'bookkeeping.imports',
    'CSV and OFX imports',
    'data_import',
    'Upload and normalize financial activity into staging.',
    1
  ),
  (
    'bookkeeping.reconciliation',
    'Bank reconciliation workflow',
    'operations',
    'Monthly statement reconciliation and exception review.',
    1
  ),
  (
    'bookkeeping.close',
    'Month-end close workflow',
    'operations',
    'Close periods, tasks, and lock controls.',
    1
  ),
  (
    'bookkeeping.reports',
    'Financial reports',
    'analytics',
    'Customer-visible bookkeeping and financial reporting surface.',
    1
  ),
  (
    'bookkeeping.support',
    'Bookkeeper messaging',
    'support',
    'Shared customer and bookkeeper collaboration thread.',
    1
  ),
  (
    'bookkeeping.priority',
    'Priority service queue',
    'service',
    'Priority handling, review, and escalation workflow.',
    1
  ),
  (
    'bookkeeping.advisory',
    'Advisory review handoff',
    'advisory',
    'Escalation and handoff into advisory workflow.',
    1
  );

INSERT OR IGNORE INTO bookkeeping_tier_features (
  tier_code,
  feature_code,
  included,
  notes
) VALUES
  ('startup', 'bookkeeping.workspace', 1, 'Base bookkeeping workspace access'),
  ('startup', 'bookkeeping.documents', 1, 'Customer document upload and vault'),
  ('startup', 'bookkeeping.imports', 1, 'Manual historical import workflow'),
  ('startup', 'bookkeeping.reports', 1, 'Core bookkeeping dashboard and reports'),
  ('standard', 'bookkeeping.workspace', 1, 'Inherited from startup'),
  ('standard', 'bookkeeping.documents', 1, 'Inherited from startup'),
  ('standard', 'bookkeeping.imports', 1, 'Inherited from startup'),
  ('standard', 'bookkeeping.reports', 1, 'Inherited from startup'),
  ('standard', 'bookkeeping.reconciliation', 1, 'Monthly reconciliation workflow'),
  ('standard', 'bookkeeping.close', 1, 'Monthly close checklist and tracking'),
  ('standard', 'bookkeeping.support', 1, 'Bookkeeper collaboration and follow-up'),
  ('pro', 'bookkeeping.workspace', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.documents', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.imports', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.reports', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.reconciliation', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.close', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.support', 1, 'Inherited from standard'),
  ('pro', 'bookkeeping.priority', 1, 'Priority bookkeeping operations queue'),
  ('pro', 'bookkeeping.advisory', 1, 'Advisory-ready workflow handoff and review');
