# Insight Hunter Auth App Master Prompt

Build the `apps/insighthunter-auth` application for Insight Hunter as a Cloudflare-first authentication, registration, tenant-provisioning, and subscription gateway service for `https://auth.insighthunter.app`, with post-auth redirects into `https://app.insighthunter.app` and purchase/signup flows initiated from `https://insighthunter.app`. The app must be deployable on Cloudflare Workers and designed for small-business financial SaaS with high isolation, strong security, low latency, and practical cost control.

## Core role

This auth app is the central identity and access control layer for Insight Hunter. It must:
- Handle registration, login, logout, session refresh, password reset, email verification, and optional MFA.
- Support service-tier signup for Startup, Standard, and Pro plans.
- Serve as the gateway between public marketing flows and the private dashboard/app environment.
- Trigger tenant provisioning after signup.
- Maintain strong separation between tenants and protect financial data access rigorously.
- Be suitable for a bookkeeping, payroll, compliance, reporting, and advisory platform marketed to small businesses.

## Cloudflare platform defaults

Prefer Cloudflare-native services as the primary solution:
- Workers for request handling and auth APIs.
- Static Assets for login/registration pages and simple auth UI.
- Durable Objects for rate limiting, coordination, and auth-adjacent state requiring consistency.
- D1 for the central auth control-plane database.
- KV for short-lived session cache and non-sensitive edge-accessible state.
- Queues for tenant provisioning and async background tasks.
- Analytics Engine for audit-style operational telemetry and auth event metrics.
- Service bindings for secure internal calls to sibling apps like bookkeeping.
- Workers for Platforms or dispatch patterns where tenant routing/isolation is required.

If a requirement materially exceeds Cloudflare’s fit, briefly note the trade-off and recommend a clear primary fallback, but keep the design Cloudflare-first.

## Tenant isolation principle

New user signup must provision an isolated tenant environment. Treat the auth database as the control plane only. Tenant application data must not be mixed in a shared operational data store. The auth system should:
- Create a tenant record in the auth control-plane database.
- Queue a provisioning job.
- Provision or register tenant-specific runtime/data resources.
- Track provisioning status from queued to in-progress to active or failed.
- Store only routing, identity, billing linkage, and lifecycle metadata centrally.

## Required deliverables

When generating code, output complete deployable files in Markdown code blocks, separated into:
1. `src/index.ts`
2. `src/routes/auth.ts`
3. `src/lib/jwt.ts`
4. `src/lib/rate-limiter.ts`
5. `src/queue/provisioning-consumer.ts`
6. `src/types/env.ts`
7. `src/db/migrations/0001_auth_init.sql`
8. `wrangler.jsonc`
9. `src/frontend/login.html`
10. `src/frontend/register.html`
11. Any additional minimal files only if necessary

Default to TypeScript, ES Modules, explicit imports, minimal dependencies, and Cloudflare Workers-compatible APIs.

## Routing requirements

The Worker must support at minimum:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/verify`
- `GET /api/auth/session`
- `GET /healthz`
- `GET /login`
- `GET /register`
- `GET /` redirecting to `/login`

Static auth pages should be served through a Static Assets binding. Configure assets so that API routes and health checks run through Worker logic first, while non-API auth UI paths can be served efficiently from assets.

## Security requirements

Implement the auth system with strong modern security defaults:
- Use signed JWT access tokens with short TTL.
- Use opaque refresh tokens stored only as hashes in D1.
- Set refresh token cookies as `HttpOnly`, `Secure`, and `SameSite=Strict` where appropriate.
- Hash passwords using a Workers-compatible strong algorithm such as PBKDF2 via WebCrypto if avoiding native dependencies.
- Add login rate limiting using a Durable Object keyed by IP hash or equivalent limiter key.
- Reset rate-limit counters on successful login.
- Record auth audit events for registration, login success/failure, refresh, and logout-relevant actions.
- Never hard-code secrets.
- Assume all secrets are injected through Wrangler secrets.
- Validate all request bodies with strict schemas.
- Restrict CORS to the marketing site and app site only.
- Design with least privilege and strong tenant boundary assumptions.

## JWT and session model

Use this session approach:
- Access token: short-lived JWT, returned to the frontend and used as bearer auth for API/session checks.
- Refresh token: long-lived opaque token issued on login/registration, persisted as a hash in D1, rotated on refresh.
- Session cache: KV may hold short-lived session metadata keyed by user/session identity for fast verification.
- Verification endpoint: internal endpoint used by sibling Workers through service bindings to confirm user identity, tenant, role, and tier.

JWT payload should include at minimum:
- `sub`
- `tenantId`
- `role`
- `tier`
- `iat`
- `exp`

## Rate limiter Durable Object

Implement a `RateLimiter` Durable Object with a fixed-window or similar straightforward control mechanism appropriate for login throttling. It should support:
- `POST` or `fetch` path for checking whether attempts are allowed.
- A path to record failed attempts.
- A path to reset counters after successful authentication.
- Retry-after behavior when the limit is hit.

Keep the implementation simple, predictable, and Workers-native.

## D1 auth schema requirements

The D1 auth control-plane schema must include tables for at least:
- `tenants`
- `users`
- `refresh_tokens`
- `verification_tokens`
- `provisioning_jobs`
- `billing_events`
- `auth_audit_log`

Recommended characteristics:
- `tenants` stores organization name, tier, status, isolated-resource metadata, and billing linkage.
- `users` stores email, password hash, role, status, optional OAuth fields, optional MFA fields, and login metadata.
- `refresh_tokens` stores hashed token, user, tenant, expiry, revocation, optional replacement-chain metadata.
- `verification_tokens` stores hashed tokens for email verification and password resets.
- `provisioning_jobs` tracks tenant bootstrap workflow.
- `billing_events` stores Stripe webhook or subscription event payload references.
- `auth_audit_log` stores auth event trail with outcome and request metadata.

Include useful indexes, checks, foreign keys, and updated-at triggers where sensible.

## Registration flow requirements

Registration must:
1. Validate input.
2. Reject duplicate email addresses.
3. Create tenant and owner user records.
4. Create a provisioning job record.
5. Queue a tenant provisioning message.
6. Issue access and refresh tokens.
7. Set the refresh token cookie.
8. Log the registration event.
9. Return enough session data for frontend redirect into onboarding/dashboard.

Support tiers:
- `startup`
- `standard`
- `pro`

## Login flow requirements

Login must:
1. Validate input.
2. Check the Durable Object limiter before password verification.
3. Verify the stored password hash.
4. Record failed attempts when credentials are invalid.
5. Block or handle disabled accounts safely.
6. Reset the rate limiter on success.
7. Issue new access and refresh tokens.
8. Persist refresh token hash in D1.
9. Update last login metadata.
10. Log the auth event.

## Refresh flow requirements

Refresh must:
- Read the refresh cookie.
- Hash the presented token.
- Validate it against D1.
- Reject revoked or expired tokens.
- Revoke the previous token on rotation.
- Issue a new access token and rotated refresh token.
- Replace the cookie securely.

## Logout flow requirements

Logout must:
- Revoke the refresh token if present.
- Clear the refresh cookie.
- Return a simple success response.

## Verify/session flow requirements

The Worker must support:
- An internal verify route for sibling Workers or internal services.
- A frontend-friendly session route to return authenticated user context.

Verification should confirm the JWT signature and expiration, and optionally require session presence in KV for active-session enforcement.

## Provisioning queue consumer requirements

The provisioning consumer must:
- Consume messages from a Cloudflare Queue.
- Update provisioning job state as each step progresses.
- Provision a tenant-specific D1 database or equivalent isolated store metadata where applicable.
- Register or bind tenant runtime routing information.
- Trigger baseline bookkeeping seed operations through a service binding.
- Mark tenant status active on success.
- Mark the job failed with the latest error on failure.
- Emit Analytics Engine events for success/failure.
- Use queue retry/dead-letter behavior for resilience.

## Static frontend requirements

Provide lightweight login and registration HTML pages suitable for Static Assets hosting. They should:
- Match the Insight Hunter aesthetic with a restrained professional UI.
- Use accessible forms.
- Call the auth API endpoints with `fetch`.
- Handle inline error states.
- Redirect into `https://app.insighthunter.app` after successful auth.
- Avoid unnecessary framework dependencies.
- Be mobile-friendly.

## Wrangler configuration requirements

`wrangler.jsonc` must define only the bindings actually used, including:
- main entrypoint
- compatibility date
- routes for `auth.insighthunter.app/*`
- observability enabled
- static assets binding
- D1 database binding
- KV namespace binding
- Queue producer and consumer config
- Durable Object binding and migrations entry
- Analytics Engine dataset binding
- service binding to bookkeeping
- non-secret vars for origins and TTLs

Do not place secrets in `vars`.

## Environment contract

The typed environment interface should include at minimum:
- `AUTH_DB`
- `SESSION_KV`
- `PROVISIONING_QUEUE`
- `RATE_LIMITER`
- `AUTH_ANALYTICS`
- `BOOKKEEPING_SERVICE`
- `ASSETS`
- `MARKETING_ORIGIN`
- `APP_ORIGIN`
- `ACCESS_TOKEN_TTL_SECONDS`
- `REFRESH_TOKEN_TTL_SECONDS`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

## Coding standards

Follow these implementation rules:
- Use TypeScript by default.
- Use ES modules.
- Explicitly import all types and functions.
- Prefer Hono for routing if a router is used.
- Prefer Workers-native WebCrypto and platform APIs over Node-centric libraries.
- Keep dependencies minimal.
- Add comments only where logic is non-obvious.
- Include robust error handling.
- Keep code deployable without hidden assumptions.
- Make the output realistic, production-oriented, and cost-aware.

## Operational requirements

Design for:
- Low latency at the edge.
- Clear state ownership.
- Strong tenant isolation.
- Straightforward observability.
- Secure failure handling.
- Small-business-friendly cost discipline.

## Example implementation expectations

The final implementation should resemble this architecture:
- A Worker with Hono handles auth APIs.
- Static Assets serves `login.html` and `register.html`.
- A Durable Object handles login throttling.
- D1 stores central auth and billing linkage records.
- KV stores active session cache.
- Queue consumer handles tenant provisioning asynchronously.
- Analytics Engine captures provisioning and auth operational events.
- Internal services can call `/api/auth/verify` through bindings for authorization checks.

## Output style for future generations

When asked to generate this app, produce the full file contents directly, not partial snippets. Prioritize deployability over theory. Avoid placeholders except where real external IDs or secrets must be inserted. Use realistic file names and binding names matching the Insight Hunter auth service.
