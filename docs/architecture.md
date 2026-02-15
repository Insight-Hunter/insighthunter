
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

