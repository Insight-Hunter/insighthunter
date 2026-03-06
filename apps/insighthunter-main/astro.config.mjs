// apps/insighthunter-main/astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Deployed URL — used for sitemap, canonical URLs, OG tags
  site: 'https://insighthunter.app',

  // Hybrid: static pages pre-render to HTML, API routes run at edge
  output: 'static',

  adapter: cloudflare({
    // Cloudflare platform APIs available in Astro.locals.runtime
    platformProxy: {
      enabled: true,
      configPath: './wrangler.jsonc',
    },
    // Use the advanced build mode — required for service bindings + KV
    mode: 'advanced',
    // Bundle all server-side code into _worker.js
    routes: {
      extend: {
        include: [{ pattern: '/api/*' }],  // always server-render API routes
        exclude: [{ pattern: '/fonts/*' }, { pattern: '/icons/*' }],
      },
    },
  }),

  integrations: [
    // Svelte islands
    svelte(),
    // Auto-generate sitemap.xml
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/account'),
    }),
  ],

  // Vite config
  vite: {
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(process.env.npm_package_version),
    },
    // Prevent bundling Node-only libs into the edge worker
    ssr: {
      external: ['node:async_hooks'],
      noExternal: ['@insighthunter/types', '@insighthunter/utils'],
    },
    // Optimize dev startup
    optimizeDeps: {
      exclude: ['@astrojs/cloudflare'],
    },
  },

  // Pre-render ALL marketing pages as static HTML (zero CPU cost at edge)
  // Dashboard + API routes stay server-rendered
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
