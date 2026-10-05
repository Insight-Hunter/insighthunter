# apps/insighthunter-pbx/src/backend/db/migrations/

This directory exists to satisfy the file list in
`docs/file-structure.md`, which documents a *planned* migration sequence
(`0001`…`0009`) for the full PBX data model described in
`docs/insight-pbx-master-prompt.md` §6 ("Data model requirements").

**These files are planning stubs only — comment-only, no executable DDL.**
They are intentionally **not** referenced by `wrangler.toml` and are
**not** applied to any database.

## Where the real, applied migrations live

The actual Wrangler-managed D1 migrations for this Worker live at the
app root: [`../../../migrations/`](../../../migrations). That directory
is what `wrangler.toml`'s `migrations_dir = "migrations"` points at, and
it is the only source of truth for the live schema
(`0001_init.sql`, `0002_compliance_and_ledger.sql`, …).

Do not copy real schema changes into this directory, and do not apply
anything from this directory with `wrangler d1 migrations apply` — doing
so would create a second, conflicting migration history for the same
database.

## How to use this directory

When a feature area (e.g. call flows, queues, AI receptionist) is ready to
be built for real:

1. Design the schema change.
2. Add a new, real migration file under the app-root `migrations/`
   directory (next sequential number after the current highest).
3. Update the matching planning-stub file here to note that it has been
   superseded, pointing at the real migration file.

See `../schema.sql` for a non-authoritative, documentation-only snapshot
of the schema that *is* currently live (kept in sync with the app-root
migrations, not the other way around).
