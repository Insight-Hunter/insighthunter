# apps/insighthunter-pbx/tests/

`docs/file-structure.md` lists a top-level `tests/` directory. This app's
actual convention — matching the rest of this monorepo — is to colocate unit
tests next to the source file they cover (e.g.
[`../src/backend/services/consent.test.ts`](../src/backend/services/consent.test.ts)),
run via `npm test` (Vitest). That remains the convention; this directory is
reserved for future integration/e2e tests that don't have a single obvious
source-file home (e.g. end-to-end Twilio webhook flows against a local
Miniflare instance).
