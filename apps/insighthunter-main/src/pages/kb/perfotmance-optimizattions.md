/* performance-optimizations.md */

This document details the specific optimizations applied to the InsightHunter Web platform.
These optimizations ensure instant load times, smooth rendering, and minimal network overhead.

------------------------------------------------------------
1. HTML Optimizations
------------------------------------------------------------
InsightHunter uses static HTML for all pages.
Key optimizations:
- No client-side rendering
- No hydration
- No runtime templating
- No inline scripts
- Minimal DOM depth
- Semantic structure for faster parsing

Critical resources are preloaded:
<link rel="preload" href="/styles.css" as="style">
<link rel="preload" href="/app.js" as="script">

HTML is cached at the edge but revalidated by the browser on every load.

------------------------------------------------------------
2. CSS Optimizations
------------------------------------------------------------
styles.css is:
- Single file
- Lightweight
- Zero unused selectors
- Zero framework overhead
- Zero runtime CSS generation

Optimizations:
- No @import statements
- No blocking CSS beyond the main stylesheet
- Minimal use of complex selectors
- GPU-accelerated transitions only

Marketing CSS is isolated to:
public/marketing/marketing.css

This prevents unnecessary CSS from loading on app pages.

------------------------------------------------------------
3. JavaScript Optimizations
------------------------------------------------------------
app.js is:
- Pure vanilla JavaScript
- No dependencies
- No bundlers
- No frameworks
- No polyfills required

Optimizations:
- Deferred script loading
- Minimal global variables
- Event listeners only where needed
- No DOM thrashing
- No synchronous XHR
- No blocking operations

API calls:
- Only triggered when the relevant page is loaded
- Use async/await for non-blocking behavior

------------------------------------------------------------
4. Image Optimizations
------------------------------------------------------------
InsightHunter uses:
- SVG for logos and icons
- WebP for marketing images
- Lazy loading for non-critical images
- Preloaded hero images for marketing pages

Hero backgrounds use CSS gradients instead of images.

All images follow:
- Responsive sizing
- No oversized assets
- No unnecessary retina variants

------------------------------------------------------------
5. Font Optimizations
------------------------------------------------------------
InsightHunter uses the system font stack:
system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif

Benefits:
- Zero font downloads
- Zero layout shifts
- Instant rendering
- Maximum OS integration

No external fonts are used.

------------------------------------------------------------
6. Rendering Optimizations
------------------------------------------------------------
The UI avoids:
- Heavy box shadows
- Excessive blur filters
- Large DOM trees
- Forced reflows
- Layout thrashing

GPU-accelerated properties:
- transform
- opacity

Cards and grids are optimized for:
- Smooth scrolling
- Low repaint cost
- Minimal compositing layers

------------------------------------------------------------
7. Network Optimizations
------------------------------------------------------------
All static assets:
- Served from Cloudflare edge
- Compressed with Brotli
- Cached for 1 year (versioned)

API calls:
- Use HTTP/3
- Use keep-alive
- Avoid redundant requests
- Never block rendering

------------------------------------------------------------
8. JavaScript Execution Minimization
------------------------------------------------------------
InsightHunter avoids:
- Framework initialization
- Virtual DOM diffing
- Hydration
- Large bundles
