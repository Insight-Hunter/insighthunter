# Insight Hunter BizForma

Cloudflare Worker service for business formation, compliance, documents, EIN prep, licenses, tasks, signatures, maintenance, and AI guidance.

## Bindings

- D1: `BIZFORMA_DB`
- R2: `BIZFORMA_DOCUMENTS`
- KV: `BIZFORMA_CACHE`
- Queues: `PDF_QUEUE`, `REMINDER_QUEUE`
- Analytics Engine: `ANALYTICS`
- Durable Objects: `FORMATION_AGENT`, `COMPLIANCE_AGENT`
- Workers AI: `AI`

## Local setup

1. Install deps:
   `npm install`
2. Generate types:
   `npm run cf-typegen`
3. Apply schema locally:
   `npm run db:migrate:local`
4. Run:
   `npm run dev`

## Auth model

Current scaffold expects:
- `Authorization: Bearer <token>`
- `X-Org-Id: <org_id>`
- `X-User-Id: <user_id>`

Replace `src/middleware/auth.ts` with real JWT/JWKS verification from `auth.insighthunter.app`.

## Key routes

- `GET /health`
- `GET /api/dashboard`
- `GET|POST /api/formation`
- `GET|PATCH /api/formation/:id`
- `POST /api/formation/:id/documents`
- `GET /api/formation/:id/documents`
- `GET /api/documents/:documentId`
- `GET /api/documents/:documentId/download`
- `POST /api/wizard/start`
- `GET /api/wizard/:sessionId`
- `PATCH /api/wizard/:sessionId/step`
- `POST /api/wizard/:sessionId/complete`
- `GET /api/compliance/upcoming`
- `GET /api/compliance/case/:caseId`
- `POST /api/compliance/case/:caseId`
- `PATCH /api/compliance/events/:eventId/complete`
- `POST /api/ein`
- `GET|POST /api/licenses`
- `GET|POST /api/tasks`
- `POST /api/signatures`
- `POST /api/maintenance`
- `POST /api/registered-agent`
- `POST /api/ai/advise`
- `POST /api/ai/recommend-entity`
- `GET /api/ai/compliance-summary/:caseId`

## Next hardening steps

- Replace header-based auth with JWKS validation.
- Add per-route RBAC/entitlements.
- Add stricter Zod schemas everywhere.
- Add document virus scan / OCR / PDF parsing workers.
- Add real reminder delivery channels.
- Add dashboard-specific typed contracts in shared package if desired.
