# insighthunter-auth

Insight Hunter Auth Service — Cloudflare Worker
JWT issuance · Session management · PBKDF2 password hashing · RBAC · Email verification

## Stack
- **Runtime**: Cloudflare Workers (Hono router)
- **DB**: D1 (users, sessions, roles, audit log)
- **KV**: Session tokens, refresh JTIs, reset/verify tokens
- **Hashing**: PBKDF2 via Web Crypto API (no bcrypt)
- **JWT**: HS256 via Web Crypto API (no jsonwebtoken)
- **Email**: MailChannels Send API

## Quick Start

```bash
cp .env.example .dev.vars

# Create D1 database
wrangler d1 create insighthunter-auth

# Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create TOKENS

# Update IDs in wrangler.toml

# Run migrations
npm run migrate:local

# Set secrets
wrangler secret put JWT_SECRET
wrangler secret put REFRESH_SECRET
wrangler secret put MAILCHANNELS_API_KEY

# Dev
npm run dev

# Deploy
npm run deploy


Register/Login
  → accessToken  (HS256 JWT, 1hr, verified by all services)
  → refreshToken (HS256 JWT, 30d, rotated on use, JTI stored in KV)

Service-to-service token validation:
  GET /auth/verify
  Authorization: Bearer <accessToken>
  → { valid: true, payload: { sub, email, orgId, role, tier } }

Security Notes
•	Passwords hashed with PBKDF2-SHA256 (100k iterations) — no native bcrypt needed
•	Refresh tokens use JTI rotation — old JTI revoked on every refresh
•	Rate limiting per IP per route stored in KV
•	Email enumeration prevented on forgot-password endpoint
•	Audit log writes on login, failed login, register, role changes
