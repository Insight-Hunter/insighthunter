# Insight Hunter

## Structure
```
public/   → Cloudflare Pages  (static HTML/CSS/JS)
apps/     → Cloudflare Workers (API services)
docs/     → Documentation
```

## Quick Start
```bash
# Deploy pages
# Push to main — GitHub Actions handles it

# Run a worker locally
cd apps/insighthunter-auth
npm install
npm run dev
```
