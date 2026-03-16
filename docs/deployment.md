/* deployment.md */

This document explains how to deploy the InsightHunter Web App and backend.

------------------------------------------------------------
Frontend Deployment (Cloudflare Pages)
------------------------------------------------------------
The static web app is deployed to Cloudflare Pages.

Automatic Deployment:
Triggered by GitHub Actions when changes are pushed to main.

Manual Deployment:
1. Open Cloudflare Dashboard
2. Go to Pages
3. Select project: insighthunter-web
4. Deploy from folder: apps/insighthunter-web/public

------------------------------------------------------------
Backend Deployment (Cloudflare Workers)
------------------------------------------------------------
The backend Worker is located in:

packages/core-worker/

To publish backend changes:

cd packages/core-worker
npx wrangler publish

This deploys:
- API routes
- Compliance logic
- Bookkeeping logic
- Report generation
- Durable Object bindings

------------------------------------------------------------
CDN Cache Purge
------------------------------------------------------------
Automatic:
GitHub Actions triggers a purge after deployment.

Manual:
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  --data '{"purge_everything":true}'

------------------------------------------------------------
Environment Variables
------------------------------------------------------------
Set in Cloudflare Dashboard:

CF_ACCOUNT_ID
CF_API_TOKEN
CF_ZONE_ID

These are required for:
- GitHub Actions deployments
- CDN purge automation
- Worker publishing

------------------------------------------------------------
Authentication
------------------------------------------------------------
InsightHunter uses Cloudflare Access.

Access Policy:
Allow emails from:
*@insighthunter.com

------------------------------------------------------------
Deployment Summary
------------------------------------------------------------
Frontend:
- Cloudflare Pages
- Static hosting
- CDN optimized

Backend:
- Cloudflare Workers
- Durable Objects
- R2 storage

CI/CD:
- GitHub Actions
- Auto deploy
- Auto purge
- Auto publish

This deployment pipeline ensures fast, reliable, zero‑downtime updates across the entire platform.
