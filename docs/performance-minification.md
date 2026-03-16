/* performance-minification.md */

This document defines the minification and compression strategy for the InsightHunter Web platform.
The goal is to reduce file sizes, improve load times, and maximize CDN efficiency without adding build complexity.

------------------------------------------------------------
1. Philosophy
------------------------------------------------------------
InsightHunter uses a static-first architecture with:
- No bundlers
- No frameworks
- No build steps

Minification is applied only where it provides meaningful benefit without increasing complexity.

The strategy:
- Minify CSS
- Minify JS
- Keep HTML readable (optional minification)
- Compress everything with Brotli at the CDN edge

------------------------------------------------------------
2. CSS Minification
------------------------------------------------------------
styles.css and marketing.css are manually optimized:
- Remove unnecessary whitespace
- Remove unused selectors
- Remove redundant properties
- Combine repeated declarations
- Use short hex values where possible
- Avoid deep selectors

Optional automated minification:
- Use a one-time pass through a CSS minifier before committing
- Example tools: cssnano, clean-css (run manually, not in CI)

Rationale:
- CSS rarely changes
- Manual optimization keeps the file readable
- Automated minification is optional, not required

------------------------------------------------------------
3. JavaScript Minification
------------------------------------------------------------
app.js and marketing.js are manually optimized:
- Remove unused functions
- Remove console logs
- Use const/let efficiently
- Avoid large inline objects
- Keep functions small and focused

Optional automated minification:
- Use terser or esbuild (manual run only)

Rationale:
- JS is already lightweight
- No bundlers needed
- Manual optimization keeps debugging simple

------------------------------------------------------------
4. HTML Minification
------------------------------------------------------------
HTML is intentionally NOT aggressively minified.

Reasons:
- HTML is cached at the edge
- HTML is small compared to assets
- Readability is important for contributors
- Cloudflare automatically compresses HTML with Brotli

Optional micro-optimizations:
- Remove unnecessary whitespace
- Remove unused attributes
- Use short class names (only when consistent)

------------------------------------------------------------
5. Image Minification
------------------------------------------------------------
InsightHunter uses:
- SVG for icons and logos
- WebP for marketing images
- CSS gradients for hero backgrounds

SVG optimization:
- Remove metadata
- Remove comments
- Collapse groups
- Minify paths

WebP optimization:
- Use lossless for UI elements
- Use high-quality lossy for marketing images
- Keep sizes under 200 KB when possible

------------------------------------------------------------
6. Compression (Cloudflare Edge)
------------------------------------------------------------
Cloudflare automatically applies:
- Brotli compression (preferred)
- Gzip fallback

Compression applies to:
- HTML
- CSS
- JS
- JSON
- SVG
- WebP (already compressed, minimal gain)

No additional compression steps are required in the repo.

------------------------------------------------------------
7. Asset Versioning
------------------------------------------------------------
Versioned assets ensure:
- Long-term caching (1 year)
- No stale files
- No need for cache purges

Structure:
assets/v1/
assets/v2/
assets/v3/

When updating:
- Create a new version folder
- Update references in HTML
- Never overwrite existing assets

------------------------------------------------------------
8. Minification Tools (Optional)
------------------------------------------------------------
These tools may be used manually, not automatically:

CSS:
- cssnano
- clean-css

JS:
- terser
- esbuild --minify

SVG:
- svgo

WebP:
- cwebp

These tools are optional and should be used only when needed.

------------------------------------------------------------
9. CI/CD Considerations
------------------------------------------------------------
Minification is NOT performed in CI/CD.

Reasons:
- Predictable builds
- No hidden transformations
- Easy debugging
- Static-first philosophy

Developers may run minification manually before committing.

------------------------------------------------------------
10. Performance Targets After Minification
------------------------------------------------------------
CSS size: < 20 KB  
JS size: < 25 KB  
HTML size: < 10 KB per page  
SVG icons: < 5 KB  
WebP images: < 200 KB  
66
These targets ensure:
- Instant load times
- Minimal bandwidth usage
- Excellent Lighthouse scores

------------------------------------------------------------
Summary
------------------------------------------------------------
InsightHunter’s minification strategy balances:
- Performance
- Simplicity
- Maintainability
- Developer experience

By combining manual optimization, optional tooling, and Cloudflare’s compression, the platform achieves top-tier performance without introducing unnecessary build complexity.
