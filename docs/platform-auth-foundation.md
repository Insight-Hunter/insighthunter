# Platform Auth Foundation

## What this PR adds

### New migration: `packages/database/migrations/0007_platform_auth.sql`
- `organizations` — multi-tenant root with plan + Stripe fields
- `users` — email/password accounts with MFA support
- `org_members` — user ↔ org with role (owner/admin/finance_manager/analyst/bookkeeper/viewer)
- `sessions` — D1 audit trail for KV-backed sessions
- `audit_logs` — unified audit table (consolidates existing `audit_logs` shape)
- `verification_tokens` — email verify + password reset tokens
- `notifications` — in-app notification inbox

### `apps/insighthunter-auth` — Full auth Worker
Replaces the stub. Provides:
- `GET/POST /login` — email + password, sets `ih_session` cookie
- `GET/POST /register` — creates user + org + owner membership in one D1 batch, sends verification email via Resend
- `GET /verify-email` — consumes token, marks email verified
- `GET /logout` — deletes KV session + D1 row, clears cookie
- `GET/POST /forgot-password` + `GET/POST /reset-password` — full password reset flow
- `GET /api/session` — validates cookie or `X-Session-Token` header, returns `IHSession` JSON

Requires two secrets in Cloudflare dashboard:
```
AUTH_SECRET=<32+ random chars>
RESEND_API_KEY=<your Resend API key>
```

Replace placeholder IDs in `wrangler.jsonc`:
```bash
wrangler d1 create insighthunter-db   # copy database_id
wrangler kv namespace create KV_SESSIONS  # copy id
```

Apply migration:
```bash
wrangler d1 execute insighthunter-db --file=packages/database/migrations/0007_platform_auth.sql
```

### `packages/authz` — Extended shared package
| File | What changed |
|------|-------------|
| `src/types.ts` | Added `IHSession`, `OrgPlan`, backward-compat types preserved |
| `src/index.ts` | Re-exports everything; adds `ROLE_PERMISSIONS` map |
| `src/middleware.ts` | NEW — `authGuard()`, `apiAuthGuard()`, `requireRole()`, `requirePermission()`, `getSession()`, `getOrgId()` |
| `src/audit.ts` | NEW — `writeAuditLog()`, `getAuditLog()` |
| `src/notifications.ts` | NEW — `sendEmail()`, `createInAppNotification()`, `getUnreadNotifications()`, `markNotificationRead()` |
| `src/session.ts` | Fixed template literal bug (was using `'` instead of `` ` ``) |
| `src/legacy.ts` | NEW — existing JWT auth logic moved here; zero breaking changes |

### `apps/insighthunter-main` — Dashboard launcher
MS365-style app grid at `app.insighthunter.app`. Protected by `authGuard()`. Shows all 12 apps with icons and descriptions.

## How to add auth to any existing app

```ts
import { authGuard, getSession } from '@insighthunter/authz';

app.use('/*', authGuard());  // redirects to login if no session

app.get('/', (c) => {
  const session = getSession(c); // { userId, orgId, role, plan, name, ... }
  // All DB queries should be scoped by session.orgId
});
```

Add `KV_SESSIONS` binding to the app's `wrangler.jsonc` with the same namespace ID.
