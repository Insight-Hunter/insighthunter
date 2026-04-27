
# InsightHunter Advisor — Phase I

`advisor.insighthunter.app` — Multi-client Advisor Portal

## Stack
- **Backend:** Cloudflare Worker (Hono), D1, KV, Queues, Analytics Engine
- **Frontend:** React 18, Vite, TypeScript

## Local dev

```bash
npm install

# Start Vite frontend (proxies /api → localhost:8787)
npm run dev

# Start Worker locally (separate terminal)
npm run worker:dev
```

## Deploy

```bash
# 1. Create D1 database
wrangler d1 create insighthunter-advisor

# 2. Update database_id in wrangler.jsonc

# 3. Run migration
npm run db:migrate

# 4. Build frontend
npm run build

# 5. Deploy Worker + static assets
npm run worker:deploy
```

## Phase I Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/firms | List firms for authenticated user |
| POST | /api/firms | Create firm |
| GET | /api/firms/:id | Get firm |
| PATCH | /api/firms/:id | Update firm |
| GET | /api/firms/:fid/members | List staff |
| POST | /api/firms/:fid/members/invite | Invite member |
| PATCH | /api/firms/:fid/members/:uid | Update role |
| DELETE | /api/firms/:fid/members/:uid | Remove member |
| GET | /api/firms/:fid/clients | List clients |
| POST | /api/firms/:fid/clients | Attach client |
| PATCH | /api/firms/:fid/clients/:id | Update client |
| DELETE | /api/firms/:fid/clients/:id | Offboard client |
| GET | /api/firms/:fid/alerts | Alert feed (unresolved) |
| POST | /api/firms/:fid/alerts | Create alert |
| PATCH | /api/firms/:fid/alerts/:id/resolve | Resolve alert |
| GET | /api/firms/:fid/clients/:cid/notes | List notes |
| POST | /api/firms/:fid/clients/:cid/notes | Create note |
| PATCH | /api/firms/:fid/clients/:cid/notes/:nid | Update note |
| DELETE | /api/firms/:fid/clients/:cid/notes/:nid | Delete note |
| GET | /api/firms/:fid/clients/:cid/overview | Client health snapshot |

## Auth
The Worker resolves auth from a Bearer JWT (`sub` claim → `userId`).  
During local development, pass `x-demo-user-id: user_demo_001` header — the frontend shim does this automatically.  
Replace with real JWT validation against `auth.insighthunter.app` before production.

## Pages
| Route | Component |
|-------|-----------|
| `#` | Dashboard home |
| `#client/:id` | ClientOverviewCard |
| `#settings` | FirmSettings |
