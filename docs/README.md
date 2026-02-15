# InsightHunter Web Platform

InsightHunter is a Cloudflare‑native, multi‑app financial operations platform built as a modular monorepo. This repository contains:

- The static InsightHunter Web App (HTML/CSS/JS)
- The static Marketing Site
- Shared packages
- Cloudflare Workers
- Infrastructure scripts
- CI/CD pipelines
- CDN automation

This documentation suite provides everything needed to understand, develop, deploy, and contribute to InsightHunter.

## Documentation Index

- [Architecture Overview](architecture.md)
- [Developer Guide](developer-guide.md)
- [API Reference](api-reference.md)
- [App Structure](app-structure.md)
- [Deployment Guide](deployment.md)
- [Contributing](contributing.md)
- [Security & Compliance](security.md)
- [Design System](design-system.md)
- [Troubleshooting](troubleshooting.md)

## Tech Stack

- **Cloudflare Workers** (backend)
- **Cloudflare Pages** (frontend hosting)
- **Cloudflare R2** (storage)
- **Durable Objects** (state)
- **Static HTML/CSS/JS** (frontend)
- **GitHub Actions** (CI/CD)
- **Monorepo** (npm workspaces)

## Quick Start

```bash
./bootstrap.sh
./dev.sh
