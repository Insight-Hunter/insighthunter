/* developer-guide.md */

This guide explains how to set up, run, and work on InsightHunter locally.

------------------------------------------------------------
Requirements
------------------------------------------------------------
- Node 20 or higher
- npm 10 or higher
- Wrangler CLI
- Python 3 (for static file server)
- Git

------------------------------------------------------------
Installation
------------------------------------------------------------
Run the bootstrap script to generate the full monorepo structure:

./bootstrap.sh

This creates:
- apps/
- packages/
- infra/
- config files
- scripts
- workspace definitions

------------------------------------------------------------
Starting Development
------------------------------------------------------------
Use the dev script to launch all major components:

./dev.sh

This starts:
- Core Worker via wrangler dev
- Desktop App via Tauri
- Mobile App via Expo
- Web App via a static server

------------------------------------------------------------
Folder Structure Overview
------------------------------------------------------------
apps/
  insighthunter-web/
  insighthunter-mobile/
  insighthunter-desktop/

packages/
  core-worker/
  shared-utils/
  shared-types/

infra/
  scripts/
  access/
  sql/

------------------------------------------------------------
Frontend Development
------------------------------------------------------------
All static web files live in:

apps/insighthunter-web/public/

Edit:
- HTML pages
- styles.css
- app.js
- marketing site files

No build step is required.

------------------------------------------------------------
Backend Development
------------------------------------------------------------
Worker code is located in:

packages/core-worker/src/

To publish backend changes:

npx wrangler publish

------------------------------------------------------------
API Base URL
------------------------------------------------------------
All frontend API calls use:

https://api.insighthunter.app

Authentication is handled automatically
