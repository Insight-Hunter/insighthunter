/* performance-network.md */

This document defines the network optimization strategy for the InsightHunter Web platform.
The goal is to minimize latency, reduce bandwidth usage, and ensure fast global performance.

------------------------------------------------------------
1. HTTP/3 and QUIC
------------------------------------------------------------
InsightHunter uses HTTP/3 for all traffic.

Benefits:
- Faster connection setup
- Better performance on mobile
- Improved packet loss handling
- Reduced latency on poor networks

Cloudflare automatically negotiates HTTP/3 when supported.

------------------------------------------------------------
2. Keep-Alive Connections
------------------------------------------------------------
API calls reuse connections via:
- HTTP/3 multiplexing
- Cloudflare Access session cookies

Benefits:
- Reduced handshake overhead
- Faster API responses
- Lower CPU usage

------------------------------------------------------------
3. Compression
------------------------------------------------------------
Cloudflare automatically applies:
- Brotli compression (preferred)
- Gzip fallback

Compressed resources:
- HTML
- CSS
- JS
- JSON
- SVG

WebP images are already compressed.

------------------------------------------------------------
4. Minimal API Calls
------------------------------------------------------------
InsightHunter avoids unnecessary network requests.

Rules:
- Only fetch data for the current page
- No background polling
- No redundant calls
- No prefetching API data

Examples:
- Dashboard metrics load only on dashboard.html
- Ledger loads only on bookkeeping.html

------------------------------------------------------------
5. Efficient API Design
------------------------------------------------------------
API responses are:
- Small
- JSON only
- No nested structures unless required
- No unnecessary metadata

Workers return:
- Minimal payloads
- Consistent shapes
- Predictable fields

------------------------------------------------------------
6. Connection Warm-Up
------------------------------------------------------------
Preconnect is used for:
https://api.insighthunter.app

This reduces:
- DNS lookup time
- TLS handshake time
- Initial API latency

------------------------------------------------------------
7. Avoiding Blocking Requests
------------------------------------------------------------
The frontend avoids:
- Synchronous XHR
- Blocking fetch chains
- Large payloads
- Unnecessary redirects

All API calls use async/await.

------------------------------------------------------------
8. CORS Optimization
------------------------------------------------------------
CORS is configured to:
- Allow only the web app domain
- Block all other origins
- Use credentials for Access cookies

This reduces:
- Attack surface
- Preflight overhead

------------------------------------------------------------
9. Network Error Handling
------------------------------------------------------------
The frontend handles:
- Timeouts
- 403 Access errors
- 500 Worker errors
- Network offline states

User experience:
- No crashes
- No blank screens
- Clear fallback messages

------------------------------------------------------------
10. Performance Targets
------------------------------------------------------------
API TTFB: < 100ms  
API payload size: < 10 KB  
Total requests per page: < 5  
Global latency: < 200ms  

------------------------------------------------------------
Summary
------------------------------------------------------------
InsightHunter’s network strategy ensures:
- Fast global performance
- Minimal latency
- Efficient API usage
- Reliable behavior on all networks

This system is optimized for both desktop and mobile environments.
