# Business Formation Assistance App — Repo-Ready Master Prompt

## Purpose

Use this prompt to design and implement a production-grade business formation and compliance assistance application in `apps/insighthunter-bizforma` using Astro for the frontend and Cloudflare Workers services for backend execution, workflow orchestration, storage, reminders, and tenant isolation.

---

## 🤖 System Prompt

**Role:** You are a senior business formation systems architect, compliance operations strategist, Astro application designer, and Cloudflare Workers platform engineer.

**Task:** Design and generate a business formation and ongoing compliance assistance application that guides founders and service teams through entity selection, filing preparation, supporting-document collection, registration tasks, post-formation requirements, and recurring compliance obligations.

**Critical instruction:** Do not mention any brand or competitor names in user-facing copy, internal docs, prompts, or generated UI text.

---

## Product Objective

Build an application that takes a user from the idea stage of starting a business through entity formation and then into ongoing compliance management, document retention, and deadline tracking.

The app must support:
- Guided self-serve founders.
- Service-assisted formation workflows.
- Ongoing compliance operations after filing.
- Multi-entity users.
- Teams managing many client entities.

---

## Baseline Capability Standard

The application must be designed to meet or exceed the level of functionality users now expect from serious business-formation and compliance services.

Treat the following as baseline requirements:
- Entity-type selection guidance.
- Formation intake and filing preparation.
- EIN assistance workflow.
- Registered-agent workflow support.
- Document vault.
- E-signature readiness.
- Annual / recurring compliance deadline management.
- Business license and permit tracking.
- Amendment and ongoing entity maintenance support.
- Multi-user collaboration and service-team operations.

---

## Astro + Cloudflare Architecture Target

### Frontend
- Build the application in Astro under `apps/insighthunter-bizforma`.
- Use TypeScript only.
- Use Astro pages, layouts, islands, and server endpoints where appropriate.
- Use SSR or hybrid rendering for authenticated workflows.
- Keep flows resume-friendly and state-aware.

### Backend / Platform
- Use Cloudflare Workers as the execution layer.
- Use Durable Objects for coordinated multi-step intake sessions, filing state machines, reminder coordination, and per-entity workflow state where beneficial.
- Use D1 for structured relational data such as entities, owners, filing tasks, deadlines, status history, document metadata, reminders, and collaboration records.
- Use R2 for uploaded formation documents, signed packets, state confirmations, notices, licenses, and compliance correspondence.
- Use Queues for async document processing, reminder fan-out, status refresh jobs, OCR/extraction, and packaged export generation.
- Use Workflows for long-running formation and compliance pipelines such as formation intake to filing-complete state, annual report readiness, or amendment handling.
- Use KV only for low-risk config, state reference data cache, or public guidance snippets — not as the system of record.
- Use Analytics Engine for funnel tracking and operational telemetry.
- Use Workers AI only for assistance such as summarizing formation choices, extracting form data from uploads, and drafting compliance explanations.

### Isolation Requirement
- Every tenant's business-formation and compliance data must remain isolated.
- Every entity, filing, deadline, document, and notice must carry tenant ownership metadata.
- Support the platform's privacy expectations for fully separated customer data boundaries.

---

## Required Product Areas

## 1. Dashboard and Status Overview

Provide a dashboard showing:
- Formation status by entity.
- Missing intake items.
- Signature readiness.
- Filing status.
- EIN progress.
- Upcoming compliance deadlines.
- Overdue tasks.
- New notices or uploaded correspondence.
- Multi-entity summary if applicable.

The dashboard should instantly answer: what is done, what is blocked, what is next, and what is overdue.

---

## 2. Entity Selection Guidance

Requirements:
- Guided comparison among sole proprietorship, single-owner limited-liability structures, multi-owner structures, corporations, and tax-election pathways.
- Collect goals such as liability protection, payroll intent, ownership count, capital raise expectations, state, and administrative preference.
- Explain tradeoffs in plain language.
- Produce recommendation summaries with assumptions and caveats.
- Allow service-team override or manual recommendation notes.

---

## 3. Formation Intake Workflow

Requirements:
- Multi-step guided intake for legal name, alternate name, state, owners, addresses, organizer details, business purpose, management structure, and filing options.
- Save progress automatically.
- Allow draft, in-review, awaiting-signature, ready-to-file, submitted, accepted, rejected, and completed states.
- Surface state-specific blockers early.
- Support entity-specific intake variation.

Use Durable Objects or Workflows where they simplify resumable multi-step orchestration.

---

## 4. Filing Package Preparation

Requirements:
- Generate structured filing packets from intake data.
- Prepare formation documents and support attachments.
- Support operating agreement or bylaws starter generation.
- Support organizer/member/manager records.
- Validate completeness before advancing to submission-ready state.
- Preserve version history for every packet.

---

## 5. Registered-Agent Workflow

Requirements:
- Support workflows where registered-agent service is included, optional, external, or customer-supplied.
- Store service address and contact details where relevant.
- Track agent status, renewal timing, change-of-agent workflows, and replacement events.
- Keep public-facing address/privacy considerations explicit in guidance.

---

## 6. EIN and Post-Formation Setup

Requirements:
- EIN assistance workflow and checklist.
- Capture required business details for EIN-readiness.
- Track whether payroll registration, tax registration, or banking setup tasks remain.
- Provide a structured "next steps after formation" checklist.
- Feed newly formed entities into downstream accounting/bookkeeping onboarding workflows.

---

## 7. Compliance Calendar and Deadline Engine

Requirements:
- Track annual reports, franchise-tax-like obligations, recurring state filings, registered-agent renewals, and internal compliance tasks.
- State-aware recurrence where known.
- Upcoming, due soon, overdue, and completed states.
- Escalation reminders by email, SMS, and in-app notification where configured.
- Per-entity and cross-entity calendar views.
- Maintain reminder history and delivery status.

Use durable scheduling patterns — Queues, Workflows, and/or Durable Objects as appropriate.

---

## 8. License and Permit Tracking

Requirements:
- Maintain a workflow for researching and tracking licenses and permits by state, locality, and industry.
- Track requirement status: unknown, required, in progress, filed, active, expired, not applicable.
- Store notes and evidence.
- Support recurring renewal tracking where relevant.

This area may combine reference data with manual service-team validation.

---

## 9. Document Vault

Requirements:
- Securely store formation docs, filed confirmations, EIN notices, operating documents, amendments, annual reports, licenses, and legal correspondence.
- Filter by entity, jurisdiction, type, effective date, and status.
- Provide timeline/history view.
- Support signed downloads and secure share patterns.
- Preserve version history and source metadata.

Use R2 for durable document storage and D1 for metadata and retrieval indexing.

---

## 10. Collaboration and Signoff

Roles to support:
- Owner.
- Admin.
- Service preparer.
- Reviewer.
- External collaborator.
- Read-only stakeholder.

Requirements:
- Internal notes vs customer-visible notes.
- Task assignment.
- Comment threads.
- Signature readiness and signature-status tracking.
- Approvals and signoff history.
- Clear record of who changed what and when.

---

## 11. Ongoing Entity Maintenance

Requirements:
- Amendments.
- Name changes.
- Address changes.
- Registered-agent changes.
- Member/officer updates.
- Dissolution or withdrawal workflows.
- Foreign qualification support patterns.

The application must continue being useful after the original formation completes.

---

## 12. AI Assistance

Include a feature that provides:
- Plain-language explanation of entity options.
- Intake summarization.
- Missing-item summaries.
- Compliance deadline explanations.
- Draft guidance for next-step tasks.
- Extraction of uploaded form details.

It must not:
- Pretend to provide legal advice beyond defined guardrails.
- Silently file or submit anything.
- Hide uncertainty.
- Replace required review and signoff where filings are sensitive.

---

## UX / Information Architecture

### Main Navigation
- Overview
- Start a Business
- Entity Setup
- Documents
- Compliance Calendar
- Licenses
- Tasks
- Settings

### Key UX Principles
- Reduce intimidation for first-time founders.
- Make every step clearly staged.
- Show what is complete, what is blocked, and what action unlocks progress.
- Preserve a strong document and event timeline.
- Support both guided and service-team-assisted usage.

---

## Data Model Expectations

At minimum, model the following domains:
- Tenant
- User
- Role assignment
- Business entity
- Owner / member / officer / organizer
- Formation intake session
- Filing packet version
- Filing event / status history
- Registered-agent record
- EIN task state
- Compliance task
- Deadline / recurrence rule
- License / permit record
- Document
- Signature status record
- Comment / note
- Reminder event
- Audit event
- AI assistance record

Every relevant record should carry tenant and entity lineage.

---

## API / Worker Surface Expectations

Specify and implement endpoints or route handlers for:
- Dashboard status retrieval.
- Formation intake create/update/resume.
- Entity option recommendation summary.
- Filing packet generation and version retrieval.
- Document upload and metadata retrieval.
- Compliance calendar retrieval and task updates.
- Reminder scheduling and status.
- License / permit tracking CRUD.
- Collaboration comments and notes.
- Signature status updates.
- AI assistance requests.

Use explicit validation, typed contracts, and authz checks.

---

## Security and Controls

Requirements:
- Strong access control and explicit authorization checks.
- Secure document access and signed retrieval where necessary.
- Immutable audit trail for filing-affecting actions.
- Reminder and deadline event history.
- Sensitive-data-aware logging discipline.
- Protection of identity, address, and ownership data.

---

## Performance and Operational Requirements

- Optimize for low-latency authenticated workflows.
- Support resumable multi-step flows.
- Offload heavy work to queues.
- Make reminder delivery and deadline orchestration reliable and observable.
- Provide operational dashboards or event logs for service teams.
- Ensure state transitions are idempotent and traceable.

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
10. Queue and reminder job map.
11. Permissions matrix.
12. API contracts.
13. Key UI screen specifications.
14. Formation workflow map.
15. Compliance workflow map.
16. Phased implementation roadmap.

---

## Output Rules

- Use TypeScript.
- Use Astro and Cloudflare-first architecture.
- Be implementation-ready, not theoretical.
- Use real formation and compliance terminology.
- Treat ongoing compliance as core, not a side feature.
- Do not mention any product or competitor names.
- Do not reduce the application to a one-time filing wizard.
