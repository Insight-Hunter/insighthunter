/* performance-preloading.md */

This document defines the preload, prefetch, and resource-hint strategy for the InsightHunter Web platform.
These optimizations ensure instant rendering, smooth navigation, and minimal blocking behavior.

------------------------------------------------------------
1. Overview
------------------------------------------------------------
InsightHunter uses resource hints to optimize:
- Initial page load
- Navigation between pages
- Marketing site transitions
- API responsiveness

The strategy includes:
- Preload (critical resources)
- Prefetch (likely next resources)
- Preconnect (network warm-up)
- DNS-prefetch (fallback)
- Prerender (optional for marketing)

------------------------------------------------------------
2. Preload Strategy
------------------------------------------------------------
Preload is used for resources required immediately on page load.

Critical resources:
<link rel="preload" href="/styles.css" as="style">
<link rel="preload" href="/app.js" as="script">

Marketing pages may preload:
<link rel="preload" href="/marketing/marketing.css" as="style">

Rules:
- Only preload resources used above the fold
- Avoid preloading large images unless essential
- Avoid preloading fonts (system font stack used)

------------------------------------------------------------
3. Prefetch Strategy
------------------------------------------------------------
Prefetch is used for resources likely to be needed soon.

Examples:
- Next-page HTML
- Marketing images
- Blog post thumbnails

Usage:
<link rel="prefetch" href="/dashboard.html">
<link rel="prefetch" href="/marketing/features.html">

Rules:
- Prefetch only small or medium resources
- Avoid prefetching large images on mobile
- Avoid prefetching API calls

------------------------------------------------------------
4. Preconnect Strategy
------------------------------------------------------------
Pre
