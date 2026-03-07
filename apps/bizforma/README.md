# Bizforma — InsightHunters Business Formation Assistant

A full-stack AI-powered business formation wizard that guides entrepreneurs through every step of starting a business — from initial concept to compliance calendar.

---

## Architecture

```
Cloudflare Worker (src/worker.ts)
  ├── Hono router — API at /api/*
  ├── Workers AI — llama-3.1-8b for name suggestions, entity rec, compliance calendar, chat
  ├── D1 (SQLite) — persistent business data, compliance events, sessions
  ├── KV — session cache, fast business lookups
  └── R2 — formation document storage

React SPA (Vite + Tailwind)
  ├── 11-step formation wizard
  ├── Glassmorphism UI / dark theme
  ├── AI-powered suggestions at each step
  └── Downloadable formation summary
```

---

## File Tree

```
bizforma/
├── App.tsx                          # Root React component
├── index.html                       # HTML entry point
├── package.json
├── vite.config.ts
├── wrangler.jsonc                   # Cloudflare Worker config
├── tsconfig.json
├── schema.sql                       # D1 database schema
│
├── src/
│   ├── main.tsx                     # React entry point
│   └── worker.ts                    # Cloudflare Worker (Hono API)
│
├── components/
│   ├── BusinessWizard.tsx           # Main wizard controller + state
│   ├── GlassComponents.tsx          # Glassmorphism UI primitives
│   ├── ProgressStepper.tsx          # Step progress indicator
│   ├── figma/
│   │   └── ImageWithFallback.tsx
│   ├── steps/
│   │   ├── ConceptStep.tsx          # Step 1: Business concept
│   │   ├── NameSelectionStep.tsx    # Step 2: Business name + AI suggestions
│   │   ├── EntityTypeStep.tsx       # Step 3: LLC / Corp / etc + AI rec
│   │   ├── RegistrationStep.tsx     # Step 4: State registration
│   │   ├── EINTaxStep.tsx           # Step 5: EIN + tax election
│   │   ├── ComplianceStep.tsx       # Step 6: State compliance
│   │   ├── AccountingStep.tsx       # Step 7: Accounting setup
│   │   ├── FinancingStep.tsx        # Step 8: Funding & banking
│   │   ├── MarketingStep.tsx        # Step 9: Marketing plan
│   │   ├── WebDesignStep.tsx        # Step 10: Web & domain
│   │   └── CalendarStep.tsx         # Step 11: Compliance calendar (AI-generated)
│   └── ui/                          # shadcn/radix component library
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       └── ... (full shadcn set)
│
├── utils/
│   └── api.ts                       # Frontend API client
│
├── styles/
│   └── globals.css                  # Tailwind v4 + design tokens
│
└── public/
    ├── favicon.svg
    └── robots.txt
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create Cloudflare resources
```bash
# Create D1 database
wrangler d1 create bizforma_db

# Create KV namespace
wrangler kv namespace create BUSINESS_DATA

# Create R2 bucket
wrangler r2 bucket create bizforma-documents

# Initialize the database
wrangler d1 execute bizforma_db --file=./schema.sql
```

### 3. Update wrangler.jsonc
Replace the placeholder IDs in `wrangler.jsonc` with the real IDs from the commands above.

### 4. Set secrets
```bash
# Optional — for Claude-powered premium AI features
wrangler secret put ANTHROPIC_API_KEY
```

### 5. Run locally
```bash
# Start the React dev server (port 3000)
npm run dev

# In a second terminal — start the Cloudflare Worker (port 8787)
npm run worker:dev
```

Vite proxies `/api/*` to `localhost:8787` automatically.

### 6. Deploy
```bash
npm run worker:deploy
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| POST | /api/session | Create or resume wizard session |
| PUT | /api/session/:id | Save session progress |
| POST | /api/business | Save completed business data |
| GET | /api/business?name= | Retrieve business by name |
| POST | /api/ai/name-suggestions | AI business name ideas |
| POST | /api/ai/entity-recommendation | AI entity type recommendation |
| POST | /api/ai/compliance-calendar | AI compliance calendar |
| POST | /api/ai/chat | Streaming AI business advisor chat |
| POST | /api/documents/:businessId | Upload formation document to R2 |
| GET | /api/documents/:businessId/:filename | Download formation document |
| GET | /api/compliance/:businessId | Get compliance events |
| POST | /api/compliance/:businessId | Add compliance event |

---

## Wizard Steps

1. **Concept** — Business idea, target market, value proposition
2. **Naming** — Business name + AI-powered suggestions
3. **Entity Type** — LLC, S-Corp, C-Corp, Sole Prop + AI recommendation
4. **Registration** — Registered agent, business address, state filing
5. **EIN & Tax** — Apply for EIN, tax election (S-Corp, default LLC, etc.)
6. **Compliance** — SOS filing, annual report, sales tax permit
7. **Accounting** — Software selection, CPA, tax strategy
8. **Financing** — Startup costs, funding sources, business banking
9. **Marketing** — Strategy, channels, budget
10. **Web & Domain** — Domain name, hosting, DNS, email
11. **Calendar** — AI-generated compliance + tax deadline calendar

---

## Built With

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Cloudflare Workers + Hono
- **AI**: Cloudflare Workers AI (llama-3.1-8b-instruct)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2
- **UI**: shadcn/ui + Radix UI + Lucide Icons

---

*Built by InsightHunters — making business formation simple.*
