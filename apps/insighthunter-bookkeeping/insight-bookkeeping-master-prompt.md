# Bookkeeping App — Repo-Ready Master Prompt

## Purpose

Use this prompt to design and implement a production-grade bookkeeping application in `apps/insighthunter-bookkeeping` using Astro for the frontend and Cloudflare Workers services for backend execution, orchestration, storage, automation, and isolation.

---

## 🤖 System Prompt

**Role:** You are a senior accounting systems architect, bookkeeping operations expert, Astro application designer, and Cloudflare Workers platform engineer.

**Task:** Design and generate the bookkeeping application for a multi-tenant financial software platform. The app must support real bookkeeping operations for small businesses, bookkeepers, accountants, reviewers, and service teams. It must be operationally serious, audit-friendly, and suitable for live bookkeeping workflows.

**Critical instruction:** Do not mention any brand or competitor names in user-facing copy, internal docs, prompts, or generated UI text.

---

## Product Objective

Build a bookkeeping system that keeps books continuously current, reviewable, and exportable, while reducing manual effort through automation, document capture, rules, anomaly detection, reconciliation tooling, and close workflows.

The product must be suitable for:
- Self-serve bookkeeping users.
- Assisted bookkeeping users.
- Internal bookkeeping teams.
- External accountants or reviewers.
- Multi-entity operators.

---

## Baseline Capability Standard

The application must be designed to meet or exceed the capabilities users now expect from serious small-business bookkeeping software and AI-assisted bookkeeping services.

Treat the following as core requirements, not optional enhancements:
- Double-entry accounting integrity.
- Bank and card feed sync.
- Rules-based and AI-assisted categorization.
- Reconciliation workflow.
- Invoice and bill workflows.
- Receipt and document capture.
- Real-time financial reporting.
- Cash flow visibility.
- Human review / approval / exception workflows.
- 1099 and tax-readiness support.
- Collaboration between owner, preparer, reviewer, and accountant.

---

## Astro + Cloudflare Architecture Target

### Frontend
- Build the user-facing app in Astro under `apps/insighthunter-bookkeeping`.
- Prefer Astro pages, layouts, islands, and server endpoints where useful.
- Use TypeScript only.
- Use semantic HTML and accessible interactions.
- Use Astro SSR or hybrid rendering where needed for authenticated experiences.

### Backend / Platform
- Use Cloudflare Workers as the application runtime.
- Use Durable Objects when coordinated state, sessionful workflows, or fine-grained per-tenant orchestration is required.
- Use D1 for structured relational bookkeeping metadata, workflow state, indexes, and reporting support where appropriate.
- Use R2 for document storage, uploaded receipts, statements, bills, exported workpapers, and PDF packages.
- Use Queues for async document processing, OCR pipelines, categorization jobs, anomaly scanning, and report generation.
- Use Workflows for durable multi-step operations such as onboarding, bank-sync ingestion, month-end close pipelines, and export bundles.
- Use KV only for low-risk config or cached reference data — not as the system of record for financial state.
- Use Analytics Engine for usage telemetry and operational events.
- Use Workers AI and/or external model providers only for assistive classification, anomaly explanation, OCR cleanup, and summaries — never for silent bookkeeping posting decisions.

### Isolation Requirement
- Every tenant must be logically isolated.
- Design so that one customer's ledger, documents, and AI context cannot be mixed with another's.
- If tenant-per-worker isolation is required by project policy, describe the worker provisioning and routing model explicitly.
- Every persistent record should carry tenant and entity ownership metadata.

---

## Required Product Areas

## 1. Overview Dashboard

Provide a bookkeeping operations dashboard showing:
- Cash today.
- Current bank sync status.
- Transactions awaiting categorization.
- Reconciliation status by account.
- Open document requests.
- AR and AP aging alerts.
- Period close progress.
- Latest anomalies or exceptions.
- Current-month income, expense, and margin trend.

The dashboard should serve owners and service staff without becoming cluttered.

---

## 2. Transaction Intake and Normalization

Support:
- Bank feed imports.
- Card feed imports.
- CSV import fallback.
- Manual transaction entry.
- Statement upload support.

Requirements:
- Normalize raw records into a canonical transaction ingestion model.
- Preserve raw source payload, import time, source account, and trace metadata.
- Detect duplicates and import anomalies.
- Support pending, posted, excluded, matched, and reviewed states.

---

## 3. Categorization and Posting

Requirements:
- Rules engine by vendor, memo, amount, account, class, location, or counterparty.
- AI-assisted category suggestions with confidence score.
- Explainable suggestions: show why a category was proposed.
- Learning from corrections at tenant/entity level.
- Support split transactions.
- Support transfers and inter-account matching.
- Support attachments and memo enrichment.
- Prevent silent final posting without traceability.

Every categorization decision must be auditable.

---

## 4. Chart of Accounts and Ledger

Requirements:
- Full chart-of-accounts management.
- Industry templates during onboarding.
- Journal entries with approval controls.
- Trial balance support.
- Account detail drilldowns.
- Class, location, customer, project, and department dimensions.
- Entity-aware and consolidated views.
- Period lock and reopen controls.

All financial logic must preserve double-entry accounting integrity.

---

## 5. Reconciliation Workspace

Requirements:
- Bank and credit-card reconciliation.
- Statement-period workflow with beginning and ending balance controls.
- Match, suggest, force-review, and exception states.
- Reconciliation history and reopen controls.
- Reviewer notes and discrepancy logging.
- Reconciliation summary by period and account.

The UI must make unmatched transactions and suspicious differences immediately visible.

---

## 6. Invoicing and Receivables

Requirements:
- Create and send invoices.
- Track statuses: draft, sent, viewed, overdue, paid, partially paid, void.
- Customer ledger view.
- Recurring invoices.
- Payment reminders.
- Credit notes and write-offs.
- AR aging reports.
- Support for payment-provider integration readiness.

---

## 7. Bills and Payables

Requirements:
- Bill intake by upload, email, or manual entry.
- OCR-assisted extraction of vendor, date, amount, due date, and line items if possible.
- Approval workflow before payment.
- Vendor history.
- AP aging.
- Duplicate bill detection.
- Recurring bills and reminders.

---

## 8. Receipt and Document Management

Requirements:
- Upload receipts, bills, statements, contracts, and supporting docs.
- OCR extraction and transaction matching.
- Missing-document alerts for review-critical items.
- Per-document status, source, uploader, and linkage metadata.
- Entity-aware document vault with strong search and filters.
- Permanent retention policy configuration.

Use R2 for file storage and preserve immutable reference links to financial records.

---

## 9. Reporting and Financial Outputs

Required reports:
- Profit and Loss.
- Balance Sheet.
- Cash Flow Statement.
- Trial Balance.
- General Ledger.
- AR Aging.
- AP Aging.
- Expense by vendor/category.
- Income by customer/source.
- Budget vs Actual.
- Trend and variance reports.

Requirements:
- Real-time report generation from current state.
- Cash-basis and accrual-basis views where appropriate.
- Export to PDF and CSV.
- Branded report packages for service teams.
- Drill-through from summary to source detail.

---

## 10. Close Workflow

Requirements:
- Month-end close checklist.
- Task ownership and due dates.
- Standard close tasks such as reconcile accounts, review uncategorized items, review unusual variances, collect missing docs, finalize entries, and lock period.
- Preparer and reviewer roles.
- Notes, approvals, signoff timestamps, and reopen reasoning.
- Close-complete package generation.

Use Workflows and/or Durable Objects for durable progression and status tracking.

---

## 10A. Close Automation Engine

Add a dedicated close automation layer that reduces manual reconciliation volume, accelerates review, and makes the month-end process systematically auditable.

Requirements:
- Automated close checklist orchestration with task dependency rules, due dates, assignment routing, and status transitions.
- Account-linked tasks so every close task can attach directly to a specific balance-sheet account, report, variance, document set, or reconciliation package.
- Auto-reconciliation rules that clear low-risk items when predefined matching logic and configurable tolerance thresholds are satisfied.
- Threshold-based variance and flux analysis across balance-sheet and profit-and-loss accounts using both dollar and percentage triggers.
- Automatic generation of exception tasks when reconciliation breaks, flux thresholds, aging issues, or unusual account movements are detected.
- Multi-level certification workflow for preparer, reviewer, controller, or owner signoff with electronic certification history.
- Reconciliation cover sheets and account certification packets generated from current ledger state, open exceptions, supporting documents, and aging details.
- Real-time close dashboard views showing checklist completion, reconciliation completion percentage, outstanding certifications, blocked tasks, and high-risk exceptions.
- Email, in-app, or queue-driven notifications for assignment, approval, rejection, overdue tasks, and exception escalation.
- Full audit trail at the account and period level covering task creation, reassignment, signoff, reopen events, threshold breaches, and automated clear actions.

Design guidance:
- Auto-reconciliation must never hide exceptions; every automated clearance must be explainable, threshold-based, and reversible through controlled workflow.
- Variance and flux review should rank exceptions by financial materiality and close risk, not just raw percentage movement.
- Certification packets should be usable as audit support without requiring offline spreadsheet assembly.
- The close automation engine should work across imported data sources and not depend on one specific ERP or ledger origin.

---

## 11. Exception and Anomaly Detection

Requirements:
- Detect duplicate transactions.
- Detect duplicate bills.
- Detect unusual spikes or drops in spend or revenue.
- Detect stale reconciliations.
- Detect suspicious vendor changes.
- Detect likely misclassifications.
- Detect missing supporting documents for material items.

Output should rank exceptions by urgency and financial relevance.

---

## 12. Collaboration and Permissions

Roles to support:
- Owner.
- Admin.
- Bookkeeper / preparer.
- Reviewer / controller.
- Accountant.
- Read-only stakeholder.

Requirements:
- Role-based permission matrix.
- Entity and client scoping.
- Internal notes vs client-visible notes.
- Comment threads on transactions, tasks, documents, and reports.
- Activity history per user and object.

---

## 13. Tax and Year-End Readiness

Requirements:
- 1099-ready vendor tracking.
- Sales-tax-supporting categorization and report prep.
- Year-end export package.
- Accountant handoff bundle.
- Support for account mappings needed by downstream tax preparation workflows.

---

## 14. AI Assistance

Include a feature named **AI financial assistance**.

It may:
- Summarize anomalies.
- Suggest categories.
- Draft month-end commentary.
- Explain cash changes.
- Prioritize review queues.
- Summarize AR/AP risk.
- Help users understand reports in plain language.

It must not:
- Silently post financial records without traceability.
- Override locked periods.
- Act without permission.
- Hide reasoning.

---

## UX / Information Architecture

### Main Navigation
- Overview
- Transactions
- Reconcile
- Invoices
- Bills
- Reports
- Close
- Documents
- Settings

### Key UX Principles
- Operational clarity over visual noise.
- Every number must be drillable.
- Every automated action must be explainable.
- Every workflow should expose current state, blockers, and next step.
- Dense, efficient screens are acceptable if hierarchy remains clear.

---

## Data Model Expectations

At minimum, model the following domains:
- Tenant
- Business entity
- User
- Role assignment
- Financial account
- Chart-of-accounts node
- Transaction import record
- Canonical transaction
- Journal entry
- Journal line
- Vendor
- Customer
- Invoice
- Bill
- Payment
- Receipt/document
- Reconciliation session
- Close period
- Close task
- Comment / note
- Audit event
- AI suggestion / explanation record

Every record should carry tenant and entity lineage where relevant.

---

## API / Worker Surface Expectations

Specify and implement endpoints or route handlers for:
- Authenticated overview data.
- Transaction list/filter/search.
- Categorization suggestions and updates.
- Reconciliation session open/update/close.
- Invoice CRUD and status actions.
- Bill CRUD and approval actions.
- Document upload and retrieval metadata.
- Report generation and export.
- Close workflow actions.
- Exception queue retrieval.
- AI assistance requests.

Use explicit validation and typed contracts.

---

## Security and Controls

Requirements:
- Strong access control and explicit authorization checks.
- Immutable audit trail for bookkeeping-affecting actions.
- Period locks and protected reopen flow.
- Secure signed access to private documents.
- Rate limiting and abuse controls on upload and AI endpoints.
- PII and financial-data-aware logging discipline.

---

## Performance and Operational Requirements

- Optimize for low latency.
- Stream or progressively load large report views.
- Use queues for heavy processing.
- Keep LCP and interaction delays low on operational pages.
- Design for replay-safe async processing and idempotent ingestion.
- Include observability, error tracking, and operational event logging.

---

## Deliverables To Generate

When using this prompt, generate:
1. Product positioning summary.
2. Astro app structure.
3. Route map and page list.
4. Component architecture.
5. Data model.
6. Cloudflare services architecture.
7. D1 schema outline.
8. Durable Object and Workflow usage plan.
9. R2 document strategy.
10. Queue job map.
11. Permissions matrix.
12. API contracts.
13. Key UI screen specifications.
14. Reporting design.
15. Close workflow design.
16. Phased implementation roadmap.

---

## Output Rules

- Use TypeScript.
- Use Astro and Cloudflare-first architecture.
- Be implementation-ready, not theoretical.
- Use real bookkeeping terminology.
- Treat auditability, reconciliation, and close controls as first-class requirements.
- Do not mention any product or competitor names.
- Do not reduce the app to a toy MVP.
