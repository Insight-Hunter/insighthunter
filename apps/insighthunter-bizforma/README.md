# BizForma v2

Production-leaning starter for `bizforma.insighthunter.app`.

## Included
- Standalone Cloudflare Worker with Hono API
- Auth redirects to `auth.insighthunter.app`
- Auth callback path that introspects an access token and creates a Worker session
- Static frontend shell in `public/` with hash routing and dashboard pages
- D1-backed business, formation, and compliance flows
- R2-backed document storage path with fetchable signed-path endpoint
- Queue placeholders for document rendering and reminders

## Deploy
1. Replace D1/KV IDs in `wrangler.jsonc`
2. Run `wrangler d1 execute bizforma --file=schema.sql`
3. Run `npm install`
4. Run `npm run dev`
5. Run `npm run smoke`
6. Deploy with `npm run deploy`

## Auth expectation
The auth service should redirect back to:
`https://bizforma.insighthunter.app/api/session/callback?access_token=...&redirect_to=/app`

The callback handler then introspects the token at:
`https://auth.insighthunter.app/api/introspect`
