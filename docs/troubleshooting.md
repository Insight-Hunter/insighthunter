/* troubleshooting.md */

This document provides solutions to common issues encountered while developing or running the InsightHunter platform.

------------------------------------------------------------
1. Worker Not Responding
------------------------------------------------------------
Symptoms:
- API calls fail
- Dashboard metrics do not load
- Compliance table remains empty

Possible Causes:
- Worker not running locally
- Wrong API_BASE value
- Cloudflare Access session expired

Fixes:
- Run: npx wrangler dev
- Verify API_BASE in app.js is correct
- Log out and log back in through Cloudflare Access

------------------------------------------------------------
2. Frontend Not Loading
------------------------------------------------------------
Symptoms:
- Blank page
- Missing styles
- 404 errors for static files

Possible Causes:
- Static server not running
- Incorrect file paths
- Missing assets

Fixes:
- Run: python3 -m http.server inside public/
- Check relative paths in HTML
- Ensure assets exist in public/assets/

------------------------------------------------------------
3. CDN Not Updating After Deployment
------------------------------------------------------------
Symptoms:
- Old HTML or CSS still showing
- Changes not reflected immediately

Possible Causes:
- CDN cache not purged
- Browser cache still active

Fixes:
- Trigger CDN purge workflow in GitHub Actions
- Manually purge via Cloudflare Dashboard
- Hard refresh browser (Shift + Reload)

------------------------------------------------------------
4. API 403 Errors
------------------------------------------------------------
Symptoms:
- Forbidden responses
- User cannot access API routes

Possible Causes:
- Cloudflare Access token expired
- Wrong Access policy
- Missing session cookie

Fixes:
- Log out and log back in
- Verify Access policy allows your email domain
- Ensure cookies are enabled

------------------------------------------------------------
5. Missing Ledger Data
------------------------------------------------------------
Symptoms:
- Ledger table empty
- Reconciliation not showing transactions

Possible Causes:
- Worker cannot reach Durable Object
- DO binding missing in wrangler.toml
- Ledger state not initialized

Fixes:
- Check Durable Object binding in wrangler.toml
- Restart Worker with wrangler dev
- Inspect DO logs for errors

------------------------------------------------------------
6. Reconciliation Upload Failing
------------------------------------------------------------
Symptoms:
- Upload button does nothing
- No unmatched transactions returned

Possible Causes:
- File input empty
- Wrong formData key
- Worker upload route failing

Fixes:
- Ensure a file is selected before clicking upload
- Confirm formData.append("file", ...) is correct
- Check Worker logs for upload errors

------------------------------------------------------------
7. Reports Not Generating
------------------------------------------------------------
Symptoms:
- No report appears in the list
- No PDF generated

Possible Causes:
- Wrong report type
- Worker route not implemented
- R2 write failure

Fixes:
- Verify report type matches backend route
- Check Worker logs
- Ensure R2 bucket permissions are correct

------------------------------------------------------------
8. Profile Not Saving
------------------------------------------------------------
Symptoms:
- Profile fields do not update
- No confirmation message

Possible Causes:
- PUT request blocked
- JSON payload malformed
- Worker validation failed

Fixes:
- Check network tab for request errors
- Ensure JSON.stringify is used
- Validate required fields

------------------------------------------------------------
9. Notifications Not Saving
------------------------------------------------------------
Symptoms:
- Checkbox states not persisted
- No success alert

Possible Causes:
- Wrong payload format
- Worker route not implemented
- Access session expired

Fixes:
- Verify payload matches backend schema
- Check Worker logs
- Re-authenticate via Cloudflare Access

------------------------------------------------------------
10. Marketing Site Issues
------------------------------------------------------------
Symptoms:
- Contact form not working
- FAQ not expanding
- Blog links broken

Possible Causes:
- marketing.js not loaded
- Incorrect relative paths
- Missing assets

Fixes:
- Ensure <script src="./marketing.js"> is correct
- Check folder structure
- Verify all marketing assets exist

------------------------------------------------------------
Summary
------------------------------------------------------------
This troubleshooting guide covers the most common issues encountered during development and deployment of the InsightHunter platform. For persistent issues, check Worker logs, Cloudflare Access policies, and CDN caching behavior.
