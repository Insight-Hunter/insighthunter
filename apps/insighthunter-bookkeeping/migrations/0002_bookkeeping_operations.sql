PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bookkeeping_entities (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT 'business',
  currency TEXT NOT NULL DEFAULT 'USD',
  accounting_method TEXT NOT NULL DEFAULT 'accrual'
    CHECK (accounting_method IN ('cash', 'accrual')),
  fiscal_year_end_month INTEGER NOT NULL DEFAULT 12
    CHECK (fiscal_year_end_month BETWEEN 1 AND 12),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, legal_name)
);

CREATE TABLE IF NOT EXISTS bookkeeping_categories (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'transfer')),
  account_id TEXT,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, entity_id, name)
);

CREATE TABLE IF NOT EXISTS bookkeeping_accounts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (
    account_type IN ('asset', 'liability', 'equity', 'income', 'expense')
  ),
  subtype TEXT,
  parent_account_id TEXT REFERENCES bookkeeping_accounts(id),
  currency TEXT NOT NULL DEFAULT 'USD',
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_id, code)
);

CREATE TABLE IF NOT EXISTS bookkeeping_accounting_periods (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'closed', 'reopened')),
  locked_at TEXT,
  locked_by_user_id TEXT,
  reopen_reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (period_start <= period_end),
  UNIQUE (entity_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS bookkeeping_journal_entries (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  memo TEXT NOT NULL,
  reference TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'posted', 'reversed')),
  reverses_entry_id TEXT REFERENCES bookkeeping_journal_entries(id),
  created_by_user_id TEXT NOT NULL,
  posted_by_user_id TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_journal_lines (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  journal_entry_id TEXT NOT NULL REFERENCES bookkeeping_journal_entries(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES bookkeeping_accounts(id),
  debit_minor INTEGER NOT NULL DEFAULT 0 CHECK (debit_minor >= 0),
  credit_minor INTEGER NOT NULL DEFAULT 0 CHECK (credit_minor >= 0),
  memo TEXT,
  customer_id TEXT,
  vendor_id TEXT,
  class_name TEXT,
  location_name TEXT,
  project_name TEXT,
  department_name TEXT,
  CHECK ((debit_minor > 0 AND credit_minor = 0) OR
         (credit_minor > 0 AND debit_minor = 0))
);

CREATE TABLE IF NOT EXISTS bookkeeping_transactions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES bookkeeping_accounts(id),
  journal_entry_id TEXT REFERENCES bookkeeping_journal_entries(id),
  import_id TEXT REFERENCES bookkeeping_imports(id) ON DELETE SET NULL,
  transaction_date TEXT NOT NULL,
  posted_date TEXT,
  description TEXT NOT NULL,
  normalized_description TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  fingerprint TEXT NOT NULL,
  category_id TEXT REFERENCES bookkeeping_categories(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'posted', 'excluded', 'matched', 'reviewed')),
  ai_suggested INTEGER NOT NULL DEFAULT 0 CHECK (ai_suggested IN (0, 1)),
  raw_payload_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS bookkeeping_categorization_rules (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  match_field TEXT NOT NULL
    CHECK (match_field IN ('description', 'amount', 'account', 'counterparty')),
  match_operator TEXT NOT NULL DEFAULT 'contains'
    CHECK (match_operator IN ('contains', 'equals', 'starts_with')),
  match_value TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES bookkeeping_categories(id),
  priority INTEGER NOT NULL DEFAULT 100,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_ai_suggestions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES bookkeeping_transactions(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  proposed_value TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'superseded')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  resolved_by_user_id TEXT
);

CREATE TABLE IF NOT EXISTS bookkeeping_reconciliation_sessions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES bookkeeping_accounts(id),
  statement_document_id TEXT REFERENCES bookkeeping_documents(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  beginning_balance_minor INTEGER NOT NULL,
  ending_balance_minor INTEGER NOT NULL,
  book_balance_minor INTEGER,
  difference_minor INTEGER,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'matched', 'exception', 'approved', 'reopened')),
  prepared_by_user_id TEXT NOT NULL,
  reviewed_by_user_id TEXT,
  reviewer_notes TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS bookkeeping_reconciliation_matches (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES bookkeeping_reconciliation_sessions(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL REFERENCES bookkeeping_transactions(id),
  match_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (match_type IN ('manual', 'suggested', 'automated', 'force_review')),
  status TEXT NOT NULL DEFAULT 'matched'
    CHECK (status IN ('matched', 'unmatched', 'exception')),
  rationale TEXT,
  matched_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (session_id, transaction_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookkeeping_reconciliation_one_match_per_transaction
  ON bookkeeping_reconciliation_matches(transaction_id)
  WHERE status = 'matched';

CREATE TABLE IF NOT EXISTS bookkeeping_invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  invoice_number TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  tax_minor INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
  amount_paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_minor >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'overdue', 'paid', 'partially_paid', 'void')),
  notes TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS bookkeeping_bills (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  vendor_tax_id_last4 TEXT,
  bill_number TEXT,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
  amount_paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_minor >= 0),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'partially_paid', 'paid', 'void')),
  duplicate_of_bill_id TEXT REFERENCES bookkeeping_bills(id),
  approved_by_user_id TEXT,
  approved_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_payments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  invoice_id TEXT REFERENCES bookkeeping_invoices(id),
  bill_id TEXT REFERENCES bookkeeping_bills(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_date TEXT NOT NULL,
  reference TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((invoice_id IS NOT NULL AND bill_id IS NULL) OR
         (invoice_id IS NULL AND bill_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS bookkeeping_document_links (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES bookkeeping_documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (document_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS bookkeeping_close_task_dependencies (
  task_id TEXT NOT NULL REFERENCES bookkeeping_close_tasks(id) ON DELETE CASCADE,
  depends_on_task_id TEXT NOT NULL REFERENCES bookkeeping_close_tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, depends_on_task_id),
  CHECK (task_id <> depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS bookkeeping_comments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id_ref TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal'
    CHECK (visibility IN ('internal', 'client')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookkeeping_exceptions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES bookkeeping_clients(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES bookkeeping_entities(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  financial_impact_minor INTEGER NOT NULL DEFAULT 0,
  related_entity_type TEXT,
  related_entity_id TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to_user_id TEXT,
  resolved_by_user_id TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bk_entities_client
  ON bookkeeping_entities(client_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_bk_accounts_entity_type
  ON bookkeeping_accounts(entity_id, account_type, code);
CREATE INDEX IF NOT EXISTS idx_bk_journal_entity_date
  ON bookkeeping_journal_entries(entity_id, entry_date, status);
CREATE INDEX IF NOT EXISTS idx_bk_journal_lines_entry
  ON bookkeeping_journal_lines(journal_entry_id, account_id);
CREATE INDEX IF NOT EXISTS idx_bk_transactions_entity_date
  ON bookkeeping_transactions(entity_id, transaction_date DESC, status);
CREATE INDEX IF NOT EXISTS idx_bk_transactions_import
  ON bookkeeping_transactions(import_id, client_id);
CREATE INDEX IF NOT EXISTS idx_bk_reconciliation_entity_status
  ON bookkeeping_reconciliation_sessions(entity_id, status, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_bk_invoices_entity_due
  ON bookkeeping_invoices(entity_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_bk_bills_entity_due
  ON bookkeeping_bills(entity_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_bk_exceptions_queue
  ON bookkeeping_exceptions(client_id, status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bk_comments_entity
  ON bookkeeping_comments(client_id, entity_type, entity_id_ref, created_at);

CREATE TRIGGER IF NOT EXISTS bookkeeping_audit_is_immutable_update
BEFORE UPDATE ON bookkeeping_audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit events are immutable');
END;

CREATE TRIGGER IF NOT EXISTS bookkeeping_audit_is_immutable_delete
BEFORE DELETE ON bookkeeping_audit_log
BEGIN
  SELECT RAISE(ABORT, 'audit events are immutable');
END;

CREATE TRIGGER IF NOT EXISTS bookkeeping_posted_journal_lines_are_immutable_update
BEFORE UPDATE ON bookkeeping_journal_lines
WHEN (SELECT status FROM bookkeeping_journal_entries WHERE id = OLD.journal_entry_id) IN ('posted', 'reversed')
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines are immutable');
END;

CREATE TRIGGER IF NOT EXISTS bookkeeping_posted_journal_lines_are_immutable_delete
BEFORE DELETE ON bookkeeping_journal_lines
WHEN (SELECT status FROM bookkeeping_journal_entries WHERE id = OLD.journal_entry_id) IN ('posted', 'reversed')
BEGIN
  SELECT RAISE(ABORT, 'posted journal lines are immutable');
END;

CREATE TRIGGER IF NOT EXISTS bookkeeping_journal_line_ownership
BEFORE INSERT ON bookkeeping_journal_lines
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM bookkeeping_accounts a
    JOIN bookkeeping_journal_entries j ON j.id = NEW.journal_entry_id
    WHERE a.id = NEW.account_id AND a.client_id = NEW.client_id
      AND a.entity_id = NEW.entity_id AND j.client_id = NEW.client_id
      AND j.entity_id = NEW.entity_id AND j.status IN ('draft', 'pending_review')
  )
  THEN RAISE(ABORT, 'journal line ownership or entry status is invalid') END;
END;

CREATE TRIGGER IF NOT EXISTS bookkeeping_journal_posting_controls
BEFORE UPDATE OF status ON bookkeeping_journal_entries
WHEN NEW.status = 'posted' AND OLD.status <> 'posted'
BEGIN
  SELECT CASE WHEN
    (SELECT COALESCE(SUM(debit_minor), 0) FROM bookkeeping_journal_lines
      WHERE journal_entry_id = NEW.id) = 0 OR
    (SELECT COALESCE(SUM(debit_minor), 0) FROM bookkeeping_journal_lines
      WHERE journal_entry_id = NEW.id) <>
    (SELECT COALESCE(SUM(credit_minor), 0) FROM bookkeeping_journal_lines
      WHERE journal_entry_id = NEW.id)
  THEN RAISE(ABORT, 'journal entry must balance before posting') END;

  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM bookkeeping_accounting_periods p
    WHERE p.entity_id = NEW.entity_id
      AND NEW.entry_date BETWEEN p.period_start AND p.period_end
      AND p.status = 'closed'
  )
  THEN RAISE(ABORT, 'accounting period is locked') END;
END;

CREATE TRIGGER IF NOT EXISTS bookkeeping_close_lock_controls
BEFORE UPDATE OF books_locked ON bookkeeping_close_periods
WHEN NEW.books_locked = 1 AND OLD.books_locked = 0
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM bookkeeping_close_tasks
    WHERE close_period_id = NEW.id AND client_id = NEW.client_id AND status <> 'complete'
  )
  THEN RAISE(ABORT, 'close tasks must be complete before locking the period') END;
END;
