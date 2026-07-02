# ADR-0003: Shared accounting engine

Status: Accepted

The accounting engine remains a first-class domain inside the monorepo.

Accounting rules live in shared packages and are executed through ledger-facing APIs instead of being duplicated across apps.
