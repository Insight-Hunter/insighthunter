<!-- DEPLOYMENT.md -->

# Deployment

All applications run as Cloudflare Workers. The static marketing shell is
served by `insighthunter-main`. API traffic is routed through
`insighthunter-gateway`.

---

## Automated deployment (GitHub Actions)

The `deploy.yml` workflow fires on every push to `main` after CI passes.
It runs `wrangler deploy` for each Worker in dependency order:

1. `insighthunter-auth`
2. `insighthunter-ledger`
3. `insighthunter-finops`
4. `insighthunter-advisor`
5. `insighthunter-bizforma`
6. `insighthunter-dispatch`
7. `insighthunter-gateway`
8. `insighthunter-main`

---

## Manual deployment

```bash
cd apps/<app-name>
pnpm build          # dry-run validation
wrangler deploy     # push to Cloudflare
```

---

## Database migrations

D1 migrations live in `packages/database/migrations/`.

Apply with:

```bash
wrangler d1 execute insighthunter-ledger --file packages/database/migrations/0003_accounting_core.sql
wrangler d1 execute insighthunter-main   --file packages/database/migrations/0004_onboarding.sql
```

---

## Environment variables / secrets

Set secrets per Worker via Wrangler:

```bash
wrangler secret put JWT_SECRET           --name insighthunter-auth
wrangler secret put CLOUDFLARE_API_TOKEN --name insighthunter-gateway
```

Variables that are not sensitive are declared under `[vars]` in each
`wrangler.toml`.

Required secrets per service:

| Worker                  | Secret            |
|-------------------------|-------------------|
| insighthunter-auth      | JWT_SECRET        |
| insighthunter-gateway   | CF_API_TOKEN      |
| insighthunter-ledger    | (none — uses D1)  |
| insighthunter-main      | (none — uses D1)  |

---

## CDN cache purge

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  --data '{"purge_everything":true}'
```

---

## Access policy

Cloudflare Access protects internal routes.

Allow list: `*@insighthunter.app`
