// apps/insighthunter-pbx/vite.config.ts
//
// This is a Vitest config, not a real Vite application bundler config —
// matching the convention used elsewhere in this monorepo (see
// apps/insighthunter-marketing/vite.config.ts). No app in this monorepo
// currently uses React/Vite for its frontend build; the `src/frontend/`
// tree here is a structural placeholder (see src/frontend/README.md) and
// has no build tooling wired up yet. This file exists to satisfy
// docs/file-structure.md and to give Vitest an explicit config target.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
