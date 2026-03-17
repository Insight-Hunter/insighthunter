/* security.md */

This document outlines the security and compliance model for InsightHunter.

------------------------------------------------------------
Security Philosophy
------------------------------------------------------------
InsightHunter is built with a security-first mindset.
Every component is designed to minimize risk, reduce attack surface, and ensure data integrity.

------------------------------------------------------------
1. Authentication (Cloudflare Access)
------------------------------------------------------------
InsightHunter uses Cloudflare Access for all authentication.
Key properties:
- Zero Trust enforcement
- Email domain allowlist
- No passwords stored by InsightHunter
- Sessions handled by Cloudflare

Access Policy:
Allow emails from:
*@insighthunter.com

------------------------------------------------------------
2. Data Storage
------------------------------------------------------------
R2 Storage:
- Stores uploaded documents
- Stores generated PDFs
- Stores bank statements
- Encrypted at rest

Durable Objects:
- Store compliance state
- Store audit logs
- Strong consistency guarantees

No traditional servers are used.

------------------------------------------------------------
3. Encryption
------------------------------------------------------------
Transport:
- HTTPS enforced globally
- HSTS enabled

Storage:
- R2 encrypted at rest
- Signed URLs for file access
- No public buckets

------------------------------------------------------------
4. Logging
------------------------------------------------------------
AuditLogDO records:
- Compliance actions
- Admin actions
- Document generation events
- Access events

No PII is stored in logs.

------------------------------------------------------------
5. Compliance Alignment
------------------------------------------------------------
InsightHunter follows best practices aligned with:
- SOC 2 principles
- GDPR-friendly data handling
- Zero PII in logs
- Minimal data retention

------------------------------------------------------------
6. File Handling
------------------------------------------------------------
Uploads:
- Virus scanning performed externally before ingestion
- Stored in R2 with restricted access

Downloads:
- Signed URLs with short TTLs
- No direct public access

------------------------------------------------------------
7. API Security
------------------------------------------------------------
- All endpoints require Cloudflare Access
- No unauthenticated routes
- Rate limiting applied at the Worker level
- Input validation enforced

------------------------------------------------------------
8. Frontend Security
------------------------------------------------------------
- Static HTML/CSS/JS (no dynamic injection)
- No client-side templates
- No eval or dynamic script execution
- CSP can be added if needed

------------------------------------------------------------
Summary
------------------------------------------------------------
InsightHunter’s security model is built on Cloudflare’s Zero Trust stack, ensuring strong authentication, encrypted storage, immutable audit logs, and minimal attack surface.
