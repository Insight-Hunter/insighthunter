
---

# 📄 **docs/architecture.md**  
**High‑level system architecture.**

```markdown
# InsightHunter Architecture Overview

InsightHunter is designed as a Cloudflare‑native, horizontally scalable platform with a strict separation between:

- **Static frontend** (Cloudflare Pages)
- **Serverless backend** (Cloudflare Workers)
- **Stateful components** (Durable Objects)
- **Object storage** (R2)
- **Authentication** (Cloudflare Access)

## High-Level Diagram

You’re ready to build
docs/
├── README.md
├── architecture.md
├── developer-guide.md
├── api-reference.md
├── app-structure.md
├── deployment.md
├── contributing.md
├── security.md
├── design-system.md
└── troubleshooting.md


## Components

### 1. Frontend (Static)
- Pure HTML/CSS/JS
- No frameworks
- Served from Cloudflare Pages
- CDN‑optimized

### 2. Backend (Workers)
- `/packages/core-worker`
- Handles:
  - Compliance workflows
  - Bookkeeping logic
  - Report generation
  - Audit logging
  - File uploads
  - API routing

### 3. Durable Objects
- `ComplianceStateDO`
- `AuditLogDO`

### 4. Storage (R2)
- `insighthunter-uploads`
- Used for:
  - Bank statements
  - Generated PDFs
  - Client documents

### 5. Authentication
- Cloudflare Access
- Email domain allowlist

### 6. CI/CD
- GitHub Actions
- Auto‑deploy to Pages
- Auto‑publish Workers
- Auto CDN purge

## Design Principles

- **Static first**
- **Cloudflare-native**
- **Zero backend servers**
- **Instant deploys**
- **Modular monorepo**
- **Predictable developer experience**

