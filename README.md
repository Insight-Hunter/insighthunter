## ⚡ Why Insight Hunter Runs on Cloudflare Edge

Insight Hunter is deployed entirely on Cloudflare's global edge network —
not a traditional server, not a cloud region. Here's what that means for you.

### Zero Cold Starts. Zero Data Centers to Manage.

Cloudflare operates in **330+ cities across 125+ countries**, directly
connected to over 13,000 networks — including every major ISP on earth.
When a request hits Insight Hunter, it's handled by the data center
physically closest to that user. There is no "us-east-1." There is no
single point of failure.

### What Powers Insight Hunter

| Service              | What It Does                                          |
|----------------------|-------------------------------------------------------|
| **Workers**          | Runs the entire API — serverless, globally distributed|
| **D1**               | SQLite database replicated to the edge                |
| **KV**               | Sub-millisecond session and config storage            |
| **R2**               | Zero-egress object storage for documents + exports    |
| **Queues**           | Async job processing (email, payroll, exports)        |
| **Workers AI**       | On-network LLM inference — no external API calls      |
| **Vectorize**        | Vector database for semantic search (Scout)           |
| **Durable Objects**  | Stateful coordination for PBX WebSockets + AI chat    |
| **Analytics Engine** | Real-time event tracking, sub-second queries          |

### What This Means for Small Businesses

Traditional SaaS stacks charge you indirectly for the infrastructure:
the VMs, the load balancers, the database clusters, the CDN subscriptions.
Cloudflare's edge model eliminates all of that. Insight Hunter passes those
savings directly to pricing — without compromising on uptime, latency, or
security.

> **48%** of the world's top 1,000 networks are fastest through Cloudflare.
> Your users — wherever they are — get enterprise response times.

>
> # Insight Hunter

> **The Auto-CFO for freelancers, small firms, and fractional CFOs.**
> Stop flying blind. Start running your business with the clarity of a full finance team — at a fraction of the cost.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Insight-Hunter/insighthunter)
[![License: MIT](https://img.shields.io/badge/License-MIT-taupe.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Powered%20by-Cloudflare%20Edge-F6821F)](https://workers.cloudflare.com)
[![Built with Hono](https://img.shields.io/badge/API-Hono%20%2B%20TypeScript-blue)](https://hono.dev)

---

## What Is Insight Hunter?

Insight Hunter is an AI-powered financial operations platform built specifically for small businesses, freelancers, and fractional CFOs. It replaces the patchwork of QuickBooks, spreadsheets, a payroll service, a phone system, and an expensive CPA with a single, affordable tool that runs intelligently in the background.

It does not just store numbers. It tells you what the numbers mean, what to do about them, and what is coming next.

---

## The Problem We Solve

Most small business owners manage their finances reactively — looking at last month's numbers to make today's decisions. The tools available either cost too much (enterprise software), do too little (basic bookkeeping apps), or require a human expert to interpret (accountants and CFOs at $200–$400/hour).

The result: missed opportunities, cash flow surprises, compliance deadlines ignored, and no strategic visibility into the business they are building.

Insight Hunter changes that equation.

---

## Features

### 📒 Bookkeeping
Double-entry accounting, transaction categorization, chart of accounts, bank reconciliation, and real-time financial position — automated and always current.

### 📊 Financial Reports
- Profit & Loss Statement
- Balance Sheet
- Cash Flow Statement
- Month-over-month trend analysis
- CSV and PDF export

### 🔮 AI Cash Flow Forecasting
Machine learning forecasts built on your actual historical data. See your projected revenue, expenses, and cash position 1–12 months out. Know before it happens.

### 🧠 AI CFO Chat (Powered by Llama 3.3)
Ask your business anything. *"How is my gross margin trending?" "Am I on track to hit $100k this quarter?" "Which expense category is growing fastest?"* Your AI CFO answers with your real numbers — not generic advice.

### 💡 Instant Insights
Quick 3-bullet financial health summaries, automated risk flags, and growth opportunity analysis — delivered daily without lifting a finger.

### 💼 Payroll
Run payroll in minutes. W-2 and 1099 support, federal and state tax withholding, year-end reporting, direct deposit integration, and a full payroll run history.

### 🏢 BizForma — Business Formation
Form an LLC, S-Corp, or C-Corp from scratch. Guided EIN application, state registration wizard, EFTPS and state tax account setup, and an ongoing compliance calendar that never lets you miss a deadline.

### 📞 Business PBX
A full virtual phone system: local and toll-free numbers, call routing, voicemail with AI transcription, SMS, and real-time call logs — all in the same dashboard as your financials.

### 🔍 Scout — Semantic Document Search *(Pro)*
Embed your contracts, invoices, receipts, and financial documents into a vector database. Search anything with plain English. *"Show me every contract with a renewal clause over $5,000."*

### 🌐 Website Services *(Pro)*
Managed business landing pages and microsites hosted on Cloudflare's global edge — included with Pro and Enterprise plans.

---

## Plans & Pricing

| | Free | Starter | Pro | Enterprise |
|---|:---:|:---:|:---:|:---:|
| Transactions/mo | 100 | 1,000 | Unlimited | Unlimited |
| Bookkeeping | ✓ | ✓ | ✓ | ✓ |
| P&L / Balance Sheet | — | ✓ | ✓ | ✓ |
| Cash Flow Forecast | — | ✓ | ✓ | ✓ |
| AI CFO Chat | 10/mo | 500/mo | Unlimited | Unlimited |
| Full AI Insights | — | ✓ | ✓ | ✓ |
| Payroll | — | Up to 5 | Up to 25 | Unlimited |
| BizForma formations | 1 | 3 | Unlimited | Unlimited |
| Business PBX | — | 1 number | 5 numbers | Unlimited |
| Scout (Semantic Search) | — | — | ✓ | ✓ |
| Website Services | — | — | ✓ | ✓ |
| White-label / API | — | — | — | ✓ |

---

## Tech Stack

Insight Hunter is built entirely on **Cloudflare's global edge network** — no traditional servers, no cloud regions, no cold starts.

| Layer | Technology | Purpose |
|---|---|---|
| **API** | Cloudflare Workers + Hono | Serverless backend, globally distributed |
| **Database** | Cloudflare D1 (SQLite) | Relational data at the edge |
| **Sessions** | Cloudflare KV | Sub-millisecond session validation |
| **File Storage** | Cloudflare R2 | Documents, exports, voicemail audio (zero egress fees) |
| **Async Jobs** | Cloudflare Queues | Email, payroll processing, exports |
| **AI Inference** | Cloudflare Workers AI | On-network LLM — no external API latency |
| **Vector Search** | Cloudflare Vectorize | Semantic document search (Scout) |
| **Real-time** | Cloudflare Durable Objects | WebSocket PBX + persistent AI chat sessions |
| **Analytics** | Cloudflare Analytics Engine | Real-time event tracking |
| **Frontend** | Static HTML + Vanilla JS | Served directly by the Worker, zero build overhead |

> Everything runs in **330+ cities across 120+ countries**. Your users get enterprise-grade response times regardless of where they are.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Edge Network              │
│                                                  │
│  ┌─────────────┐    ┌──────────────────────────┐ │
│  │  public/    │    │  src/ (Hono Worker)       │ │
│  │  *.html     │◄──►│  ├─ routes/auth.ts        │ │
│  │  js/api.js  │    │  ├─ routes/bookkeeping.ts │ │
│  │  auth/      │    │  ├─ routes/ai.ts          │ │
│  └─────────────┘    │  ├─ routes/payroll.ts     │ │
│                     │  ├─ routes/pbx.ts         │ │
│  ┌─────────────┐    │  ├─ routes/reports.ts     │ │
│  │ D1 Database │◄───│  ├─ routes/bizforma.ts    │ │
│  │ KV Sessions │    │  ├─ durable/PBXRoom.ts    │ │
│  │ R2 Storage  │    │  ├─ durable/AISession.ts  │ │
│  │ AI / Vectors│    │  ├─ cron.ts               │ │
│  │ Queues      │    │  └─ queue.ts              │ │
│  └─────────────┘    └──────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

The Worker serves both the static frontend (`public/`) and the full REST API (`/api/*`) from the same deployment. The frontend uses relative fetch calls — no CORS, no separate domain, no API keys in the browser.

---

## Project Structure

```
insighthunter/
├── src/                          ← Hono Worker (TypeScript)
│   ├── index.ts                  ← Worker entry point
│   ├── cron.ts                   ← Scheduled jobs (weekly reports, compliance)
│   ├── queue.ts                  ← Queue consumers (email, payroll, exports)
│   ├── middleware/
│   │   └── auth.ts               ← Session cookie guard
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── bookkeeping.ts
│   │   ├── payroll.ts
│   │   ├── pbx.ts
│   │   ├── bizforma.ts
│   │   ├── reports.ts
│   │   └── ai.ts
│   └── durable/
│       ├── PBXRoom.ts            ← WebSocket hub per phone number
│       └── AISession.ts          ← Persistent chat history per user
│
├── public/                       ← Static HTML frontend
│   ├── index.html                ← Marketing homepage
│   ├── pricing.html
│   ├── dashboard/                ← Auth-gated app pages
│   ├── auth/                     ← Login, register
│   ├── features/                 ← Feature landing pages
│   ├── legal/                    ← Privacy, Terms, EULA
│   └── js/
│       └── api.js                ← Shared typed API client
│
├── migrations/                   ← D1 SQL migrations
├── wrangler.toml                 ← Cloudflare Worker config
├── tsconfig.json
├── bootstrap.sh                  ← One-time CF resource creation
├── migrate.sh                    ← D1 migration helper
└── deploy.sh                     ← Production deploy script
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Wrangler CLI: `npm install -g wrangler`


## API Reference

All endpoints require a valid session cookie (`ih_session`) except auth routes.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, returns session cookie |
| `GET` | `/api/auth/me` | Get current user |
| `POST` | `/api/auth/logout` | Clear session |

### Bookkeeping
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bookkeeping/summary` | Revenue, expenses, net for period |
| `GET` | `/api/bookkeeping/transactions` | Paginated transaction list |
| `POST` | `/api/bookkeeping/transactions` | Create transaction |
| `GET` | `/api/bookkeeping/trend` | Month-over-month data |

### AI
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | CFO chat (stream or JSON) |
| `GET` | `/api/ai/history` | Chat message history |
| `GET` | `/api/ai/insights/quick` | 3-bullet daily snapshot (all plans) |
| `POST` | `/api/ai/insights` | Full financial analysis (Starter+) |
| `POST` | `/api/ai/forecast` | Cash flow forecast (Starter+) |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/pnl` | Profit & Loss |
| `GET` | `/api/reports/balance-sheet` | Balance Sheet |
| `GET` | `/api/reports/cash-flow` | Cash Flow Statement |
| `GET` | `/api/reports/export/transactions` | CSV export |

### Payroll, BizForma, PBX
See [`src/routes/`](./src/routes/) for full documentation.

---

## Roadmap

- [x] Core bookkeeping engine
- [x] AI CFO chat (Llama 3.3 via Workers AI)
- [x] Cash flow forecasting
- [x] Payroll module
- [x] BizForma — business formation wizard
- [x] Business PBX with voicemail transcription
- [x] Scout — semantic document search
- [ ] QuickBooks / Xero import
- [ ] Mobile app (React Native)
- [ ] White-label partner API
- [ ] Multi-entity / multi-business support
- [ ] Fractional CFO client portal

---

## Market

- **65M+ freelancers** in the U.S. alone
- **33M small businesses** — the primary target
- **Fractional CFOs** managing 3–15 clients simultaneously
- Total addressable market: **$100B+** in financial software and services

---

## Contributing

Pull requests are welcome. For major changes, open an issue first.

```bash
# Run locally
wrangler dev --local --persist

# Type check
npx tsc --noEmit

# Test a specific route
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"Test1234!","name":"Dev User"}'
```

---

## License

MIT © 2026 Insight Hunter

---

<p align="center">
  Built on <a href="https://workers.cloudflare.com">Cloudflare Workers</a> ·
  Powered by <a href="https://hono.dev">Hono</a> ·
  AI by <a href="https://ai.cloudflare.com">Workers AI</a>
</p>

