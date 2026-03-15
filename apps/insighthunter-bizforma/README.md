# Bizforma — InsightHunters Business Formation Assistant
### Astro + Svelte + Hono + Cloudflare Workers PWA

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Astro 5** (hybrid SSR/static) |
| UI Components | **Svelte 5** (reactive, zero-bundle overhead) |
| API Router | **Hono** (runs on Cloudflare Workers) |
| AI | **Workers AI** (llama-3.1-8b-instruct) |
| Database | **Cloudflare D1** (SQLite at the edge) |
| Cache/Sessions | **Cloudflare KV** |
| Document Storage | **Cloudflare R2** |
| Styling | **Tailwind CSS v3** + CSS custom properties (Apple HIG tokens) |
| PWA | Web App Manifest + Service Worker (offline-capable) |
| Design | Apple Human Interface Guidelines — dark mode, SF Pro fonts, glass materials |

---

## File Tree

```
bizforma/
├── astro.config.mjs              ← Astro + Svelte + Cloudflare adapter
├── wrangler.jsonc                ← D1, KV, R2, AI, Assets bindings
├── tailwind.config.js            ← Apple color tokens
├── tsconfig.json
├── schema.sql                    ← D1 database schema
│
├── worker/
│   └── index.ts                  ← Hono API (all /api/* routes)
│
├── src/
│   ├── pages/
│   │   └── index.astro           ← Single entry page
│   ├── layouts/
│   │   └── Base.astro            ← PWA meta, Apple HIG CSS tokens, SW registration
│   ├── stores/
│   │   └── wizard.ts             ← Svelte reactive store (all 11 step state)
│   ├── lib/
│   │   └── api.ts                ← Frontend API client (fetch + stream)
│   └── components/
│       ├── WizardShell.svelte    ← Main shell: nav, progress, step routing, chat
│       ├── ui/
│       │   ├── ProgressBar.svelte  ← Apple-style sticky progress indicator
│       │   ├── AiChat.svelte       ← Floating AI assistant (bottom sheet / side panel)
│       │   └── GlassField.svelte   ← Reusable glass-morphism form field
│       └── steps/
│           ├── ConceptStep.svelte      ← Step 1: Business idea
│           ├── NamingStep.svelte       ← Step 2: Name + AI suggestions
│           ├── EntityStep.svelte       ← Step 3: Entity type + AI recommendation
│           ├── RegistrationStep.svelte ← Step 4: State registration
│           ├── EINTaxStep.svelte       ← Step 5: EIN + tax election
│           ├── ComplianceStep.svelte   ← Step 6: State compliance
│           ├── AccountingStep.svelte   ← Step 7: Accounting
│           ├── FinancingStep.svelte    ← Step 8: Funding
│           ├── MarketingStep.svelte    ← Step 9: Marketing
│           ├── WebDesignStep.svelte    ← Step 10: Web & domain
│           └── CalendarStep.svelte     ← Step 11: AI compliance calendar + .ics export
│
└── public/
    ├── manifest.json             ← PWA manifest (installable)
    ├── sw.js                     ← Service worker (offline support)
    └── icons/                    ← App icons (add your own PNGs here)
```

---

## Apple HIG Design Features

- **SF Pro system font** — uses `-apple-system, BlinkMacSystemFont` stack
- **Dark mode by default** — `#0a0a14` background, white labels at varying opacities
- **Glassmorphism** — `backdrop-filter: blur(20px)` nav + card surfaces
- **Safe area insets** — `env(safe-area-inset-*)` for notch/home indicator
- **Spring animations** — `cubic-bezier(0.34, 1.56, 0.64, 1)` for interactive elements
- **Apple color system** — blue `#0a84ff`, green `#30d158`, orange `#ff9f0a`, etc.
- **iOS toggle switches** — native-looking boolean toggles with spring transitions
- **Bottom sheet** — AI chat presents as an iOS-style bottom sheet on mobile, side panel on desktop
- **`100dvh`** — uses dynamic viewport height for proper mobile layout
- **Haptic-style interactions** — `scale(0.96)` on button press

---

## Quick Start

```bash
# Install
npm install

# Create Cloudflare resources
npm run db:create      # D1 database
npm run kv:create      # KV namespace
npm run r2:create      # R2 bucket
npm run db:init        # Initialize schema

# Update wrangler.jsonc with real IDs from above commands

# Set secrets
wrangler secret put ANTHROPIC_API_KEY   # optional

# Local development
npm run dev            # Astro dev server (port 4321)
npm run worker:dev     # Hono Worker (port 8787) — proxied by Vite

# Deploy
npm run deploy
```

---

## API Routes (Hono Worker)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| POST | /api/session | Create/resume wizard session (KV) |
| PUT | /api/session/:id | Save step progress (KV) |
| POST | /api/business | Save business data (D1 + KV) |
| GET | /api/business | Retrieve by name or ID |
| POST | /api/ai/names | AI business name suggestions |
| POST | /api/ai/entity | AI entity type recommendation |
| POST | /api/ai/calendar | AI compliance calendar |
| POST | /api/ai/chat | Streaming AI chat (SSE) |
| POST | /api/documents/:id | Upload to R2 |
| GET | /api/documents/:id/:file | Download from R2 |
| GET | /api/compliance/:id | Get compliance events (D1) |
| POST | /api/compliance/:id | Save compliance event (D1) |

---

*Built by InsightHunters — making business formation simple.*
