# 🚀 BizForma — Complete Business Formation App

> Part of the [InsightHunter](https://insighthunter.app) platform  
> Located at: `apps/insighthunter-bizforma`

BizForma is a full-featured, step-by-step business formation guide that walks entrepreneurs through every stage of starting a business — from conceptualization through launch — with legal compliance, tax setup, digital presence, and marketing built in.

---

## 📋 Features

### 5 Phases / 23 Steps covering:

| Phase | Steps |
|-------|-------|
| 💡 **Conceptualize** | Business idea, market research, business model canvas, name check, legal structure selection |
| 📋 **Register** | State registration, EIN/federal tax ID, licenses & permits, registered agent, operating agreement |
| 💰 **Finance & Tax** | Business bank account, accounting setup, federal tax (IRS), state tax, payroll, funding strategy |
| 🌐 **Digital Presence** | Domain selection + DNS check, website platform, SEO strategy, social media setup |
| 🚀 **Launch & Market** | Brand identity, marketing plan, launch readiness checklist |

### Backend Features (Cloudflare Workers)
- **Business name availability** check with AI-powered alternatives
- **Real DNS domain availability** check across 7 TLDs
- **AI document generation** (operating agreement outline, business plan summary, marketing strategy)
- **Tax deadline calendar** with all federal + payroll deadlines
- **Progress persistence** via KV (90-day TTL)
- **Analytics tracking** via Analytics Engine
- **Export progress** as JSON or text summary

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Framer Motion |
| Design System | Apple Human Interface Guidelines |
| Backend | Cloudflare Workers + Hono |
| Storage | Cloudflare KV + D1 |
| AI | Cloudflare Workers AI (Llama 3.1) |
| Analytics | Cloudflare Analytics Engine |
| Build | Vite 5 |
| Deploy | Cloudflare Pages + Workers |

---

## 🚀 Setup & Deployment

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

### Step 1: Clone and Install
```bash
cd apps/insighthunter-bizforma
npm install
```

### Step 2: Authenticate Wrangler
```bash
wrangler login
```

### Step 3: Create Cloudflare Resources
```bash
# Create D1 database
wrangler d1 create bizforma
# → Copy the database_id to wrangler.jsonc

# Create KV namespace
wrangler kv namespace create BIZFORMA_KV
# → Copy the id and preview_id to wrangler.jsonc
```

### Step 4: Update wrangler.jsonc
Replace the placeholder IDs with your actual resource IDs:
```jsonc
"kv_namespaces": [{
  "binding": "BIZFORMA_KV",
  "id": "YOUR_ACTUAL_KV_ID",          // ← replace
  "preview_id": "YOUR_PREVIEW_KV_ID"  // ← replace
}],
"d1_databases": [{
  "binding": "BIZFORMA_DB",
  "database_name": "bizforma",
  "database_id": "YOUR_ACTUAL_D1_ID"  // ← replace
}]
```

### Step 5: Run Database Migrations
```bash
# Local development
npm run db:migrate:local

# Production
npm run db:migrate
```

### Step 6: Local Development
```bash
npm run dev
# Frontend: http://localhost:5173
# Worker:   http://localhost:8787
```

### Step 7: Deploy to Production
```bash
npm run deploy
```

---

## 🔧 API Reference

### `GET /api/health`
Health check.

### `POST /api/progress`
Save form progress.
```json
{ "sessionId": "uuid", "businessName": "Acme LLC", "data": { ... } }
```

### `GET /api/progress/:sessionId`
Load saved progress.

### `POST /api/check-name`
Check business name availability + AI suggestions.
```json
{ "name": "Acme Solutions", "state": "Delaware" }
```

### `POST /api/check-domain`
Check domain availability across 7 TLDs via real DNS.
```json
{ "domain": "acmesolutions" }
```

### `GET /api/resources/:step`
Get curated resources for a given step (e.g., `/api/resources/ein`).

### `POST /api/generate-doc`
AI-powered document generation.
```json
{
  "docType": "operating_agreement",
  "businessData": { "name": "Acme LLC", "state": "Delaware", "member_count": 2 }
}
```
Supported docTypes: `operating_agreement`, `business_plan_summary`, `marketing_strategy`, `launch_checklist`

### `GET /api/deadlines`
Federal and payroll tax deadline calendar.

### `POST /api/export`
Export progress as a formatted summary.

---

## 📁 Project Structure

```
apps/insighthunter-bizforma/
├── src/
│   ├── main.jsx        # React entry point
│   ├── index.jsx       # BizForma React app (all 23 steps)
│   └── worker.ts       # Cloudflare Worker API
├── schema.sql          # D1 database schema
├── wrangler.jsonc      # Cloudflare configuration
├── vite.config.ts      # Vite build configuration
├── package.json
├── index.html
└── README.md
```

---

## ⚖️ Legal Disclaimer

BizForma provides educational guidance and general information. It is not a substitute for advice from a licensed attorney, CPA, or financial advisor. Always consult qualified professionals for your specific business situation, especially for tax elections, contracts, and regulatory compliance.

---

## 🔗 Useful Links

- [IRS Small Business Center](https://www.irs.gov/businesses/small-businesses-self-employed)
- [SBA Business Guide](https://www.sba.gov/business-guide)
- [SCORE Free Mentoring](https://www.score.org)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers)

---

*Built with ❤️ by InsightHunter | [insighthunter.app](https://insighthunter.app)*
