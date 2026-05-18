/* performance-caching.md */

This document defines the caching strategy for the InsightHunter Web platform.
The goal is to achieve instant load times, predictable behavior, and maximum CDN efficiency.

------------------------------------------------------------
1. Caching Philosophy
------------------------------------------------------------
InsightHunter uses a multi-layer caching strategy:
- Cloudflare CDN (edge caching)
- Browser caching
- Asset versioning
- API caching (selective)
- HTML revalidation

The objective is:
- Cache aggressively where safe
- Revalidate where necessary
- Never serve stale API data
- Always serve fresh HTML

------------------------------------------------------------
2. CDN Cache Rules (Cloudflare)
------------------------------------------------------------
These rules are applied in Cloudflare Dashboard → Rules → Cache Rules.

Rule 1: Cache Everything (HTML included)
Condition:
URL matches *insighthunter.app/*

Action:
- Cache Level: Cache Everything
- Edge TTL: 1 hour
- Browser TTL: 5 minutes

Purpose:
Ensures instant page loads while allowing quick updates.

------------------------------------------------------------
Rule 2: Bypass Cache for API
------------------------------------------------------------
Condition:
URL matches *insighthunter.app/api/*

Action:
- Cache Level: Bypass

Purpose:
API responses must always be fresh and authenticated.

------------------------------------------------------------
Rule 3: Immutable Assets
------------------------------------------------------------
Condition:
URL matches *insighthunter.app/assets/*

Action:
- Cache Level: Cache Everything
- Edge TTL: 1 year
- Browser TTL: 1 year

Purpose:
Static assets never change once versioned.

------------------------------------------------------------
Rule 4: HTML Always Revalidated
------------------------------------------------------------
Condition:
URL matches *insighthunter.app/*.html

Action:
- Browser TTL: 0

Purpose:
Ensures users always receive the latest HTML shell.

------------------------------------------------------------
3. Asset Versioning Strategy
------------------------------------------------------------
Assets are stored in versioned folders:

assets/v1/
assets/v2/
assets/v3/

When updating an asset:
- Create a new version folder
- Update references in HTML
- Do NOT overwrite existing assets

Benefits:
- No CDN purge required
- No browser cache conflicts
- Predictable behavior

------------------------------------------------------------
4. Browser Caching Strategy
------------------------------------------------------------
HTML:
- Browser TTL: 0
- Always revalidated

CSS:
- Cached for 1 year
- Versioned filenames

JS:
- Cached for 1 year
- Versioned filenames

Images:
- Cached for 1 year
- Versioned filenames

APIs:
- No browser caching
- Controlled by Worker

------------------------------------------------------------
5. Preload and Prefetch Strategy
------------------------------------------------------------
Critical resources are preloaded:

<link rel="preload" href="/styles.css" as="style">
<link rel="preload" href="/app.js" as="script">

Marketing pages may preload:
- Hero images
- Fonts (if any)
- Key CSS

Prefetch is used for:
- Next-page navigation
- Marketing site transitions

------------------------------------------------------------
6. HTML Revalidation Strategy
------------------------------------------------------------
HTML is cached at the edge for 1 hour but revalidated by the browser on every load.

This ensures:
- Instant loads from CDN
- Fresh content when needed
- No stale UI

------------------------------------------------------------
7. API Caching Strategy
------------------------------------------------------------
APIs are not cached by the CDN.

However, Workers may implement:
- In-memory caching for static data
- Short-lived caching for expensive operations
- DO-based caching for stateful data

Rules:
- Never cache user-specific data
- Never cache compliance or bookkeeping data
- Only cache static metadata

------------------------------------------------------------
8. Cache Purge Strategy
------------------------------------------------------------
Automatic purge:
- Triggered by GitHub Actions on deploy

Manual purge:
- Cloudflare Dashboard → Caching → Purge Everything

Asset versioning ensures:
- Purges are rarely needed
- Only HTML requires revalidation

------------------------------------------------------------
9. Performance Targets
------------------------------------------------------------
Edge hit ratio: 95%+
HTML TTFB: < 50ms
Asset TTFB: < 20ms
API TTFB: < 100ms
Browser load time: < 1 second

------------------------------------------------------------
Summary
------------------------------------------------------------
InsightHunter’s caching strategy ensures:
- Instant global performance
- Predictable updates
- Zero stale data
- Maximum CDN efficiency
- Minimal operational overhead

This caching layer is designed to scale with the platform as it grows.
