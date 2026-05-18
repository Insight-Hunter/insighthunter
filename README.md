# InsightHunter

This repository contains the source code for InsightHunter, a platform providing financial insights and tooling. It is built on a modern stack leveraging Cloudflare's serverless platform.

## Project Structure

The repository is a monorepo managed by pnpm workspaces and Turborepo, organized as follows:

```
/
├── apps/                 → Applications and services
│   ├── insighthunter-main/     → The main marketing and dashboard frontend application
│   ├── insighthunter-auth/     → Authentication service
│   ├── insighthunter-bizforma/ → Business formation service
│   ├── insighthunter-bookkeeping/ → Bookkeeping service
│   └── ...
├── packages/             → Shared libraries (e.g., UI components, types)
├── scripts/              → Build and deployment scripts
└── docs/                 → Project documentation
```

## Technical Stack

-   **Frontend:** Astro, Svelte, React
-   **Backend:** Cloudflare Workers, Hono
-   **Database:** Cloudflare D1
-   **Storage:** Cloudflare R2
-   **Queues:** Cloudflare Queues
-   **AI:** Cloudflare Workers AI
-   **Workflows:** Durable Objects
-   **Build System:** Turborepo, pnpm

## Getting Started

To get started with local development:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Run development server:**
    ```bash
    pnpm dev
    ```
    This will run the development servers for all applications in parallel.

## Build and Deployment

### Build

To build all applications, run the following command:
```bash
pnpm build
```

### Automated Deployment

The easiest way to deploy all applications is to use the provided script:
```bash
bash scripts/deploy.sh
```
This script will deploy all applications in the correct order.

### Manual Deployment

You can also deploy each application manually.

-   **Main App (Astro)**:
    ```bash
    pnpm run deploy:main
    ```
-   **Cloudflare Workers**:
    ```bash
    pnpm run deploy:auth
    pnpm run deploy:bizforma
    pnpm run deploy:payroll
    pnpm run deploy:pbx
    pnpm run deploy:bookkeeping
    pnpm run deploy:report
    pnpm run deploy:scout
    pnpm run deploy:whitelabel
    pnpm run deploy:platform
    pnpm run deploy:tenant-template
    ```

## Services

This monorepo contains the following applications and services:

-   **insighthunter-main**: The main Astro-based frontend application, which includes the marketing site and user dashboard.
-   **insighthunter-auth**: Handles user authentication and session management.
-   **insighthunter-bizforma**: Service for business formation and compliance.
-   **insighthunter-bookkeeping**: Bookkeeping and accounting service.
-   **insighthunter-payroll**: Payroll management service.
-   **insighthunter-pbx**: Cloud-based phone system.
-   **insighthunter-report**: Generates financial reports.
-   **insighthunter-scout**: Data scraping and analysis service.
-   **insighthunter-whitelabel**: Whitelabeling service for partners.
-   **ih-platform-worker**: Core platform worker for tenant management.
-   **ih-tenant-template**: A template for new tenant workers.

## Cloudflare Setup

The following Cloudflare resources need to be provisioned for the platform to function correctly.

### D1 Databases

```bash
wrangler d1 create ih-advisor
wrangler d1 create ih-ledger
wrangler d1 create ih-finops
wrangler d1 create ih-vault-meta
wrangler d1 create ih-notifications
```
*Update all `REPLACE_DB_ID_*` placeholders in `wrangler.jsonc` files with the returned IDs.*

### Queues

```bash
wrangler queues create ih-notifications
wrangler queues create ih-notifications-dlq
wrangler queues create ih-ledger-rules
wrangler queues create ih-ledger-sync
wrangler queues create ih-finops-approvals
wrangler queues create ih-finops-receipts
wrangler queues create ih-finops-pdf
wrangler queues create ih-finops-reminders
```

### R2 Buckets

```bash
wrangler r2 bucket create ih-documents
```

### Secrets

Secrets must be set for each worker. For example:

```bash
# Repeat for each worker that requires these secrets
wrangler secret put AUTH_SECRET --name ih-advisor-api
wrangler secret put VAULT_ENCRYPTION_KEY --name insighthunter-finops
wrangler secret put RESEND_API_KEY --name ih-notification-queue
```

### Database Migrations

Run the following commands to initialize the database schemas:

```bash
wrangler d1 execute ih-advisor --file=apps/insighthunter-advisor/migrations/0001_initial.sql
wrangler d1 execute ih-ledger --file=apps/insighthunter-ledger/migrations/0001_initial.sql
wrangler d1 execute ih-finops --file=apps/insighthunter-finops/migrations/0001_initial.sql
```

## Architectural Principles

-   **Tenant Scoping:** Every D1 query is scoped by `org_id` to ensure data isolation.
-   **Encryption:** Sensitive data like bank account numbers are encrypted at rest using `crypto.subtle` within the Worker.
-   **Asynchronous Processing:** High-volume operations (e.g., imports) are processed asynchronously using Queues.
-   **Stateful Workflows:** Multi-step processes like approvals are managed using Durable Workflows.
-   **Centralized Notifications:** A single `ih-notification-queue` handles all outgoing notifications (email, webhooks, etc.).

## Shared Authentication

All workers validate JWTs issued by `auth.insighthunter.app` using the `shared/middleware/session-validator.ts` middleware. The JWT payload must include `sub` (userId), `orgId`, `email`, `role`, and `plan`. An optional `firmId` is included for users belonging to an accounting firm.
