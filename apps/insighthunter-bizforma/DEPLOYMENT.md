# BizForma Deployment

## Required Cloudflare resources
- Worker service: `insighthunter-bizforma`
- D1 database: `bizforma-prod`
- R2 bucket: `bizforma-documents`
- Queue: `bizforma-document-jobs`
- Browser Rendering binding: `BROWSER`
- Workers AI binding: `AI`

## Required secrets
```bash
wrangler secret put DOWNLOAD_SIGNING_SECRET
```

## Required variables
- `AUTH_ORIGIN=https://auth.insighthunter.app`
- `APP_ORIGIN=https://bizforma.insighthunter.app`
- `AUTH_AUDIENCE=bizforma`

## Deploy flow
```bash
npm install
wrangler d1 migrations apply bizforma-prod --remote
wrangler deploy
```

## Post-deploy checks
1. `GET /health`
2. Auth introspection works with a valid bearer token
3. AI name suggestions return JSON
4. PDF generation creates a queued job and later stores a PDF in R2
5. Signed download URLs open a ready document
