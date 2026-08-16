# insighthunter-auth

Auth service for Insight Hunter. Handles registration, login, session
verification, and provisioning of each user's isolated `UserVault` Durable
Object. Deployed at `auth.insighthunter.app`.

## Setup

```bash
npm install
npx wrangler d1 create insighthunter-auth-db      # copy id into wrangler.toml
npx wrangler kv namespace create SESSIONS          # copy id into wrangler.toml
npx wrangler d1 execute insighthunter-auth-db --file=./schema.sql
npx wrangler secret put SESSION_SECRET             # paste a long random value
```

## Local dev

```bash
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Example requests

Register:

```bash
curl -X POST http://localhost:8787/register \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"correct-horse-battery-staple","tier":"startup"}'
```

Response:

```json
{
  "userId": "b3f1...",
  "email": "owner@example.com",
  "tier": "startup",
  "token": "eyJ...body.sig",
  "expiresAt": 1755400000000
}
```

Login:

```bash
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"correct-horse-battery-staple"}'
```

Verify session (used by dashboard + every module worker):

```bash
curl http://localhost:8787/session/verify \
  -H "Authorization: Bearer eyJ...body.sig"
```

Logout:

```bash
curl -X POST http://localhost:8787/logout \
  -H "Authorization: Bearer eyJ...body.sig"
```

## package.json (types only, no runtime deps)

```json
{
  "name": "insighthunter-auth",
  "private": true,
  "type": "module",
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250801.0",
    "wrangler": "^3.90.0",
    "typescript": "^5.6.0"
  }
}
```

## How module workers use this

Every other module (bookkeeping, reports, insights, etc.) should, on each
request:

1. Read the `Authorization: Bearer <token>` header.
2. Call `GET https://auth.insighthunter.app/session/verify` (or, once this is
   stable, switch to local JWT verification using a shared public key to
   avoid the extra network hop — noted as a follow-up optimization).
3. On success, get `userId` — use it to derive the same Durable Object id
   (`env.USER_VAULT.idFromString(vaultDoId)`, fetched once from the `users`
   table) so the module operates only on that user's isolated storage.
4. Check the `entitlements` table for `(userId, module)` before serving any
   tier-gated feature.

## Known follow-ups (flagged, not silently skipped)

- Password reset / email verification flow not yet built.
- No OAuth (Google/Microsoft) yet — email+password only.
- Session verification requires a round trip to this worker; fine at low
  volume, worth revisiting (local JWT verify) once traffic grows.
- `vault_do_id` is generated but the vault itself is only a generic KV-like
  store right now — module workers will layer their own key schemas on it.
