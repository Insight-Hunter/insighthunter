/* performance-cdn-config.md */

This document defines the Cloudflare CDN configuration for the InsightHunter Web platform.
These settings ensure instant global performance, predictable caching, and minimal latency.

------------------------------------------------------------
1. Overview
------------------------------------------------------------
InsightHunter uses Cloudflare’s global edge network to deliver:
- Static HTML
- CSS and JS assets
- Marketing site content
- Images and icons
- API routing (via Workers)
- R2 storage access

The CDN configuration is designed to:
- Maximize cache hit ratio
- Minimize TTFB
- Avoid stale data
- Support versioned assets
- Ensure secure, authenticated API access

------------------------------------------------------------
2. Cloudflare Pages Configuration
------------------------------------------------------------
Cloudflare Pages hosts the static frontend.

Key settings:
- Build command: none
- Output directory: public
- Clean URLs: enabled
- HTTP/3: enabled
- Brotli compression: enabled
- Always Online: enabled

Headers:
- Cache-Control for HTML: no-store, must-revalidate
- Cache-Control for assets: public, max-age=31536000, immutable

------------------------------------------------------------
3. Cloudflare Worker Configuration
------------------------------------------------------------
Workers handle:
- API routing
- Authentication enforcement
- Durable Object access
- R2 file operations

Worker settings:
- Compatibility date: latest stable
- Durable Object bindings: required
- R2 bucket bindings: required
- Access enforcement: required

Worker caching:
- API responses: never cached
- Static metadata: optional short-lived caching
- Signed URLs: short TTL

------------------------------------------------------------
4. Cache Rules (Edge)
------------------------------------------------------------
These rules are configured in Cloudflare Dashboard → Rules → Cache Rules.

Rule 1: Cache Everything (HTML included)
Condition:
URL matches *insighthunter.app/*

Action:
- Cache Level: Cache Everything
- Edge TTL: 1 hour
- Browser TTL: 5 minutes

Purpose:
Fast global delivery with safe revalidation.

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
Versioned assets never change.

------------------------------------------------------------
Rule 4: HTML Revalidation
------------------------------------------------------------
Condition:
URL matches *insighthunter.app/*.html

Action:
- Browser TTL: 0

Purpose:
Ensures users always receive the latest HTML shell.

------------------------------------------------------------
5. R2 Configuration
------------------------------------------------------------
Bucket:
insighthunter-uploads

Settings:
- Public access: disabled
- Signed URLs: enabled
- Encryption: enabled
- Versioning: optional
- Lifecycle rules: optional cleanup for old uploads

Performance considerations:
- R2 → Worker traffic has zero egress cost
- Worker should stream files when possible
- Avoid large in-memory buffers

------------------------------------------------------------
6. Durable Objects Configuration
------------------------------------------------------------
Durable Objects used:
- ComplianceStateDO
- AuditLogDO

Performance settings:
- Minimize blocking operations
- Use alarms for scheduled tasks
- Keep state small and structured
- Avoid storing large blobs

------------------------------------------------------------
7. Network Optimization
------------------------------------------------------------
Cloudflare features enabled:
- HTTP/3
- 0-RTT
- TLS 1.3
- Brotli compression
- Argo Smart Routing (optional)
- Tiered Caching (recommended)

These reduce latency and improve global performance.

------------------------------------------------------------
8. Security Headers
------------------------------------------------------------
Recommended headers:

Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()

These can be added via Cloudflare Transform Rules.

------------------------------------------------------------
9. CDN Purge Strategy
------------------------------------------------------------
Automatic purge:
- Triggered by GitHub Actions after deployment

Manual purge:
- Cloudflare Dashboard → Caching → Purge Everything

Asset versioning ensures:
- Purges are rarely needed
- Only HTML requires revalidation

------------------------------------------------------------
10. Performance Targets
------------------------------------------------------------
Edge hit ratio: 95%+
HTML TTFB: < 50ms
Asset TTFB: < 20ms
API TTFB: < 100ms
Global load time: < 1 second

------------------------------------------------------------
Summary
------------------------------------------------------------
This CDN configuration ensures:
- Instant global performance
- Predictable caching behavior
- Secure API access
- Efficient asset delivery
- Minimal operational overhead

InsightHunter’s CDN layer is designed to scale effortlessly as traffic grows.
