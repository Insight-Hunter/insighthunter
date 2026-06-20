# InsightHunter SaaS Architecture

## Auth Flow (Post-Refactor)

```
User visits insighthunter.app
  → Cloudflare Access authenticates (Google / GitHub / OTP / Email)
  → cf-access-authenticated-user-email header injected on every request
  → /api/me reads header → auto-creates user row in D1 if first visit
  → Astro middleware checks onboarding_complete
  → If false → redirect /onboarding
  → Onboarding collects business_name + plan
  → If paid plan → Stripe Checkout
  → Stripe webhook activates subscription in D1
  → /dashboard unlocked
  → Feature gating via user.plan on every API route
```

## Key Files

| File | Purpose |
|---|---|
| `functions/api/middleware/access.ts` | Core: reads Access header, auto-creates user, plan checks |
| `functions/api/me.ts` | `GET /api/me` — identity endpoint used by all frontend |
| `functions/api/onboard.ts` | `POST /api/onboard` — collects business info, triggers Stripe |
| `functions/api/stripe/webhook.ts` | Stripe events → D1 subscription updates |
| `functions/api/billing/portal.ts` | Stripe Customer Portal redirect |
| `shared/db/schema.sql` | Full D1 schema with users, audit_log, feature_flags |
| `packages/ui/src/stores/user.ts` | Svelte store — replaces all localStorage auth |
| `apps/insighthunter-main/src/pages/onboarding.astro` | Onboarding UI |
| `apps/insighthunter-main/src/middleware/index.ts` | Astro SSR middleware: auth guard + onboarding redirect |

## Cloudflare Access Policy (REQUIRED)

Change your Access policy from:
```
Allow: *@insighthunter.com  ← BLOCKS ALL CUSTOMERS
```
To:
```
Allow: Login Methods → Google + GitHub + One-time PIN
```

Exclude `/api/stripe/webhook` from Access (bypass policy).

## Environment Variables

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_LITE=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
APP_URL=https://insighthunter.app
```

## D1 Setup

```bash
# Create DB (first time)
wrangler d1 create insighthunter-db

# Run schema
wrangler d1 execute insighthunter-db --file=shared/db/schema.sql

# If upgrading existing DB
wrangler d1 execute insighthunter-db --file=shared/db/migrate.sql
```

## Feature Gating Pattern

```ts
import { withAccessUser, requireAuth, requirePlan } from '../middleware/access';

export const onRequestGet: PagesFunction<AccessEnv> = async ({ request, env }) => {
  const { user, email } = await withAccessUser(request, env);
  const authErr = requireAuth(user, email);
  if (authErr) return authErr;

  // Require pro+ for payroll
  const planErr = requirePlan(user!, 'pro');
  if (planErr) return planErr;  // Returns 402 with upgrade_url

  // ... your handler
};
```
