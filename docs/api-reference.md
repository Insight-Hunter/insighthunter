/* api-reference.md */

This document describes the public API endpoints used by the InsightHunter Web App.
All endpoints are served from:

https://api.insighthunter.app

Authentication:
Cloudflare Access (session cookies)

------------------------------------------------------------
Dashboard
------------------------------------------------------------

GET /api/mobile/dashboard
Returns:
- monthlyRevenue (number)
- cashOnHand (number)
- openComplianceItems (number)
- unreconciledTransactions (number)
- recentActivity[] (array of activity objects)

------------------------------------------------------------
Compliance
------------------------------------------------------------

GET /api/compliance/current
Returns:
- items[] (array of compliance items)

POST /api/compliance/current/forms/engagement-letter/pdf
Generates an engagement letter PDF for the current client.

POST /api/compliance/current/cleanup-uploads
Deletes old or unused uploaded files from R2.

------------------------------------------------------------
Bookkeeping
------------------------------------------------------------

GET /api/bookkeeping/current/ledger
Returns:
- entries[] (array of ledger entries)

POST /api/bookkeeping/reconcile/upload
Uploads a bank statement file for reconciliation.
Returns:
- unmatched[] (array of unmatched transactions)

------------------------------------------------------------
Reports
------------------------------------------------------------

POST /api/reports/generate/:type
Generates a financial report.
Supported types:
- pnl
- balance-sheet
- cash-flow

Returns:
- report metadata

------------------------------------------------------------
Clients
------------------------------------------------------------

GET /api/clients
Returns:
- clients[] (array of client objects)

------------------------------------------------------------
Account
------------------------------------------------------------

GET /api/account/profile
Returns user profile information.

PUT /api/account/profile
Updates user profile information.

GET /api/account/notifications
Returns notification preferences.

PUT /api/account/notifications
Updates notification preferences.

------------------------------------------------------------
Summary
------------------------------------------------------------
This API reference covers all endpoints used by the static InsightHunter Web App.
All endpoints require Cloudflare Access authentication.
