# Normalization checklist

- Remove all `.DS_Store` files.
- Remove committed `*.tsbuildinfo` files.
- Generate runtime types with Wrangler for every Worker app.
- Keep `wrangler.toml` as the canonical Worker config.
- Replace placeholder app commands with real `wrangler` and `tsc` commands.
