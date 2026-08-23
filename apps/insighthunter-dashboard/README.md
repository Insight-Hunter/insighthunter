# Insight Hunter dashboard

The authenticated dashboard deployed to `app.insighthunter.app`. It forwards a
bearer token only to the auth service binding, uses the verified tier to show
available modules, and never receives direct database bindings or financial
records.

For local development, run the auth Worker locally first and configure a local
service binding in a non-committed development Wrangler configuration.
