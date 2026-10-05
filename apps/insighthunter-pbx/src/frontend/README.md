# apps/insighthunter-pbx/src/frontend/

Structural placeholder matching the target layout in
`../../docs/file-structure.md`. **No React/Vite build tooling exists for
this app yet** — no app in this monorepo currently depends on React (verified
across every `apps/*/package.json` and `packages/*/package.json`); the
closest sibling convention (`insighthunter-marketing`) is Astro-based, and
its `vite.config.ts` is actually a Vitest config, not a bundler config (see
`../../vite.config.ts` here, which follows the same pattern).

Every file under this directory is therefore a **non-functional TODO
placeholder**:

- Files are plain `.tsx`-extension TypeScript (no real JSX markup, no React
  import) so they parse under Biome without needing React types installed.
- They are intentionally excluded from `tsc --noEmit` — `tsconfig.json`'s
  `include` glob is `src/**/*.ts`, which does not match `.tsx`.
- Nothing imports or bundles these files; there is no dev server, no build
  step, and no route that serves them.

## Before building this out for real

1. Decide on the actual frontend framework/build tool (React+Vite is assumed
   by `docs/file-structure.md`, but that should be confirmed against the
   rest of the product roadmap/monorepo direction before adding the
   dependency weight).
2. Add `react`, `react-dom`, `@vitejs/plugin-react`, and a real
   `vite.config.ts` bundler config (this will replace/extend today's
   Vitest-only `vite.config.ts` at the app root).
3. Replace these placeholders with real components, wiring them to the
   `/api/*` routes in `../backend/routes/`.
