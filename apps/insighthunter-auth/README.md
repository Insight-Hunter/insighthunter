# insighthunter-auth

Branded Cloudflare Access authentication Worker for `auth.insighthunter.app`.

## Architecture

```
User → auth.insighthunter.app
         ↓
  Cloudflare Access intercepts
         ↓
  Serves branded login page (#0F172A navy)
         ↓
  Access injects sign-in buttons (Google/GitHub/OTP)
         ↓
  POST /callback → validateAccessJWT → set ih_user cookie
         ↓
  Redirect → insighthunter-platform-worker.dmco.workers.dev/dashboard
```

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set secrets
```bash
wrangler secret put TEAM_DOMAIN
# → https://<your-team>.cloudflareaccess.com

wrangler secret put POLICY_AUD
# → AUD tag from Zero Trust → Access → Applications → your app → Configure
```

### 3. Configure Zero Trust
- Go to Zero Trust → Access → Applications
- Set Application domain: `auth.insighthunter.app`
- Set Custom login page: `auth.insighthunter.app`
- Copy the AUD tag → paste as POLICY_AUD secret

### 4. DNS
In Cloudflare DNS for insighthunter.app:
```
CNAME  auth  →  <your-team>.cloudflareaccess.com
```

### 5. Deploy
```bash
npm run deploy
```

## Brand Colors
| Token               | Hex       | Usage                  |
|---------------------|-----------|------------------------|
| Primary Brand       | #0F172A   | Background (slate-900) |
| Surface             | #1E293B   | Card (slate-800)       |
| Accent              | #38BDF8   | CTAs, links (sky-400)  |
| Accent Hover        | #0EA5E9   | Hover (sky-500)        |
| Text Primary        | #F1F5F9   | Headings (slate-100)   |
| Text Muted          | #94A3B8   | Body copy (slate-400)  |
| Success             | #4ADE80   | Metrics (green-400)    |
| Warning             | #FB923C   | Alerts (orange-400)    |

## Files
```
src/
├── index.ts       — Main Worker fetch handler + /callback logic
├── access.ts      — CF Access JWT validation + identity resolver
├── login-page.ts  — Branded HTML login page generator
└── types.ts       — Env interface + type definitions
wrangler.toml      — Worker config + routes
tsconfig.json      — TypeScript config
package.json       — Dependencies
```
