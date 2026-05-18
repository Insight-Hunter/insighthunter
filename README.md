# InsightHunter

This repository contains the source code for InsightHunter, a platform providing financial insights and tooling. It is built on a modern stack leveraging Cloudflare's serverless platform.

## Project Structure

The repository is a monorepo managed by Turborepo, organized as follows:

```
/
├── apps/                 → Cloudflare Workers for API services
│   ├── insighthunter-advisor/
│   ├── insighthunter-auth/
│   ├── insighthunter-finops/
│   ├── insighthunter-ledger/
│   └── ...
├── docs/                 → Project documentation
├── packages/             → Shared libraries (e.g., UI components, types)
├── public/               → Static assets for the marketing site (Cloudflare Pages)
└── scripts/              → Build and deployment scripts
```

## Quick Start

To get started with local development:

1.  **Clone and build the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-name>
    npm install
    ```

2.  **Run a worker locally:**
    ```bash
    cd apps/insighthunter-auth
    npm run dev
    ```

## Build and Deployment

The project is built using a custom script and deployed via GitHub Actions.

### Initial Build

To create a new instance of the InsightHunter project, run the build script:

```bash
bash build-insighthunter.sh my-insighthunter
cd my-insighthunter
npm install
```

### Deployment

-   **Cloudflare Pages (Marketing Site):** Pushing to the `main` branch triggers a GitHub Action that deploys the `public/` directory to Cloudflare Pages.
-   **Cloudflare Workers (API Services):** Deployment of workers is also handled via GitHub Actions. The deployment order is critical:

    1.  `shared/workers/notification-queue`
    2.  `shared/workers/document-vault`
    3.  `apps/insighthunter-advisor`
    4.  `apps/insighthunter-ledger`
    5.  `apps/insighthunter-finops`

## Technical Stack

-   **Frontend:** Astro, Svelte, React
-   **Backend:** Cloudflare Workers, Hono
-   **Database:** Cloudflare D1
-   **Storage:** Cloudflare R2
-   **Queues:** Cloudflare Queues
-   **AI:** Cloudflare Workers AI
-   **Workflows:** Durable Objects
-   **Build System:** Turborepo

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
