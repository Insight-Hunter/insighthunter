/* app-structure.md */

This document describes the structure of the InsightHunter Web App.

------------------------------------------------------------
Location
------------------------------------------------------------
The static web app is located in:

apps/insighthunter-web/public/

This folder contains:
- HTML pages
- CSS stylesheets
- JavaScript logic
- Marketing site
- Assets
- SEO files

------------------------------------------------------------
Application Pages
------------------------------------------------------------
index.html
dashboard.html
compliance.html
admin-compliance.html
bookkeeping.html
reconciliation.html
reports.html
clients.html
settings.html
profile.html
notifications.html

Each page is fully static and wired to the backend via app.js.

------------------------------------------------------------
Marketing Site
------------------------------------------------------------
Located in:

public/marketing/

Includes:
- index.html (landing)
- features.html
- pricing.html
- contact.html
- about.html
- faq.html

Legal:
- legal/privacy.html
- legal/terms.html

Blog:
- blog/index.html
- blog/post.html

------------------------------------------------------------
Assets
------------------------------------------------------------
public/assets/
Contains:
- logo.svg
- icons
- hero images
- marketing illustrations

Versioning strategy:
assets/v1/
assets/v2/
assets/v3/

------------------------------------------------------------
Scripts
------------------------------------------------------------
public/app.js
Handles:
- API calls
- Dashboard metrics
- Compliance table
- Bookkeeping ledger
- Reconciliation
- Reports
- Clients
- Profile
- Notifications

public/marketing/marketing.js
Handles:
- Contact form
- Marketing interactions

------------------------------------------------------------
Styles
------------------------------------------------------------
public/styles.css
Global design system for the app.

public/marketing/marketing.css
Marketing theme and layout.

------------------------------------------------------------
Summary
------------------------------------------------------------
The InsightHunter Web App is a fully static, Cloudflare Pages–hosted frontend with a clean, predictable structure designed for maintainability and performance.
