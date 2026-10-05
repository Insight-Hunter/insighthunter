# Insight Hunter PBX

`apps/insighthunter-pbx` is Insight Hunter's subscription-entitled business
communications module (voice, SMS/MMS, voicemail, and, in later phases,
contact-center, AI receptionist, and video). See
[docs/insight-pbx-master-prompt.md](./docs/insight-pbx-master-prompt.md) for
the full product/architecture specification this module is built against.

## Current scope (what is implemented today)

This module is in **Phase 1/2 (foundation + core telephony/messaging)** of
the specification's implementation order. It currently supports:

- Inbound voice → greeting → voicemail recording (TwiML), with tenant
  resolution, webhook idempotency, audit logging, and usage-ledger entries.
- Outbound SMS send (authenticated API) with opt-out suppression enforcement,
  audit logging, and a usage-ledger entry per message.
- Inbound SMS webhook with STOP/START/HELP compliance handling and an
  append-only inbound message log.
- Voicemail listing and mark-read (authenticated API) with audit logging.
- Entitlement gating via `X-Org-Plan` (Growth tier and above).

**Not yet implemented** (tracked against the master prompt, highest-value
next): number/extension/department management UI, call-flow designer and
runtime, call queues and agent presence, softphone client, AI receptionist,
video rooms, billing reconciliation jobs and tenant usage dashboard, A2P 10DLC
/ toll-free verification workflow UI, and Durable Object-backed real-time
call/queue state. See [docs/insight-pbx-master-prompt.md](./docs/insight-pbx-master-prompt.md)
§16 for the full phased plan.

## Local setup

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in local Twilio test credentials
pnpm --filter @insighthunter/pbx dev
```

Requires a provisioned D1 database bound as `DB` (see `wrangler.toml`):

```bash
wrangler d1 create insighthunter-pbx
# update wrangler.toml database_id with the output, then:
wrangler d1 migrations apply insighthunter-pbx --local   # or --remote
```

## Required secrets

Set via `wrangler secret put <NAME>` in each environment (never in
`wrangler.toml` or source):

| Secret | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio account identifier |
| `TWILIO_AUTH_TOKEN` | Used to send messages and to verify inbound webhook signatures |

## Twilio webhook configuration

In the Twilio Console, configure the following webhook URLs on each number
assigned to a tenant (see "Tenant isolation model" below for how tenancy is
resolved):

- Voice inbound: `POST https://<deployment-host>/voice/inbound`
- Voice recording status callback: configured automatically via the
  `action` attribute on the TwiML `<Record>` verb.
- Messaging inbound: `POST https://<deployment-host>/webhooks/sms/inbound`

All webhook requests are validated using `X-Twilio-Signature` before any
processing occurs (`src/backend/providers/twilio/TwilioWebhookVerifier.ts`); invalid
signatures receive `403` and are not processed.

## Architecture

- **Runtime**: Cloudflare Worker (Hono), D1 for relational storage.
- **Provider abstraction**: `src/backend/providers/interfaces/` defines
  provider-neutral `MessagingProvider` / `TelephonyProvider` contracts.
  `src/backend/providers/twilio/*` is the first (and currently only) implementation.
  Business routes depend on the interfaces, not on Twilio directly, so an
  alternate/blended carrier can be added later without rewriting routes.
- **Auth**: delegates to the platform's existing edge-auth convention — an
  upstream authenticated gateway verifies the Insight Hunter session and
  forwards trusted `X-User-Id` / `X-Org-Id` / `X-User-Role` / `X-User-Email`
  headers (`src/backend/middleware/auth.ts`), matching the pattern already used by
  `insighthunter-scout` and `insighthunter-bizforma`. This module does not
  implement a second login/tenant identity system.
- **Entitlement gating**: `src/backend/middleware/tier-gate.ts` checks `X-Org-Plan`
  against a minimum tier. This is a placeholder until the module integrates
  with the platform's real entitlement service; it does not yet model PBX
  add-on-specific allowances (minutes, numbers, AI credits, etc.) from
  §5.1 of the master prompt.

## File layout

`src/` is split into `src/backend/` (the Worker — routes, middleware,
services, provider implementations, Durable Object agent stubs, D1
schema/migration references, utils) and `src/frontend/` (the eventual
tenant-facing SPA). This mirrors the target tree in
[docs/file-structure.md](./docs/file-structure.md).

Most files under `src/backend/` beyond what's listed in "Current scope"
above are **planning stubs**: Hono routers that return `501 not_implemented`,
or service/provider classes with a single TODO-throwing method. Each stub's
header comment cites the relevant section of
[docs/insight-pbx-master-prompt.md](./docs/insight-pbx-master-prompt.md) and
notes what it depends on. They exist so the route surface, import graph, and
directory layout already match the target architecture — mounting a real
implementation later is a matter of filling in a file, not restructuring the
app.

`src/frontend/` is **entirely non-functional today** — no app in this
monorepo currently has React/Vite tooling wired up, so every file there is a
plain-TypeScript placeholder excluded from `tsc` and not served by anything.
See [src/frontend/README.md](./src/frontend/README.md) before building it out.

The real, applied D1 migrations remain at the app-root
[`migrations/`](./migrations) directory (per `wrangler.toml`'s
`migrations_dir`). `src/backend/db/schema.sql` and
`src/backend/db/migrations/*.sql` are non-authoritative reference/planning
files only — see
[src/backend/db/migrations/README.md](./src/backend/db/migrations/README.md).

## Tenant isolation model

Inbound Twilio webhooks never trust a caller- or URL-supplied tenant ID
directly. `src/backend/services/tenant-resolution.ts` resolves the tenant from the
Twilio `To` number against a trusted `phone_numbers` mapping table. Because
number provisioning/assignment UI does not exist yet, the code falls back to
an `org` query parameter (set by an admin when configuring the Twilio
console webhook URL, and covered by the Twilio request signature) when no
mapping row exists yet — and records that resolution as `verified: false` in
the audit log so it is visible and traceable. **This fallback is a known,
documented gap**: once number provisioning exists, all numbers should be
present in `phone_numbers` and the fallback should be removed/alerted on.

Every authenticated API route also enforces `org_id` scoping on all D1
queries (no cross-tenant reads/writes).

## Usage accounting model

`src/backend/services/usage-ledger.ts` writes an append-only `usage_ledger` row for
billable events (SMS sent/received, voicemail recording seconds). Twilio's
own usage/billing records are treated purely as an input for later
reconciliation — never as Insight Hunter's authoritative billing source —
per the master prompt's billing guardrails. A reconciliation job against
Twilio's usage API is **not yet implemented** (Phase 6 of the spec).

## Known provider/legal limitations

- No A2P 10DLC / toll-free verification workflow or status surface yet —
  operators must manage registration directly in the Twilio console today.
- No emergency/E911 address handling yet.
- Physical mail/address/freight add-ons are explicitly out of scope for this
  module until a partner-backed fulfillment path exists — see
  [docs/physical-services-feasibility.md](./docs/physical-services-feasibility.md).

## Rollback strategy

- This module is additive: it introduces new routes/tables and does not
  modify any other `apps/insighthunter-*` module or shared package.
- To roll back a deployment, redeploy the previous Worker version
  (`wrangler deployments list` / `wrangler rollback`). D1 migrations in this
  module are additive-only (new tables/columns); no migration drops or
  mutates existing tenant data, so a Worker rollback alone is safe.
- To disable the module without a deploy, remove/raise the `X-Org-Plan`
  entitlement at the gateway so `requirePbxTier` rejects all `/api/*` traffic
  tenant-wide; Twilio webhook routes remain live (so in-flight calls do not
  error) but write no new tenant-facing state changes beyond what is already
  implemented.

## Testing

```bash
pnpm --filter @insighthunter/pbx test        # vitest
pnpm --filter @insighthunter/pbx typecheck
pnpm --filter @insighthunter/pbx lint
```

Twilio webhook signature verification, STOP/START/HELP classification, and
tenant resolution are covered by unit tests under `src/backend/**/*.test.ts` using
signed request fixtures and an in-memory D1 stub — no live Twilio calls are
made in tests.
