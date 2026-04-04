// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'server',           // Required for Cloudflare Pages SSR + middleware
  adapter: cloudflare({
    mode: 'directory',        // Use /functions directory for Pages Functions
    functionPerRoute: false,  // Single catch-all worker
    imageService: 'passthrough',
  }),
  integrations: [
    svelte(),
    sitemap({
      filter: (page) => !page.includes('/dashboard') && !page.includes('/auth'),
    }),
  ],
  site: 'https://insighthunter.app',
  vite: {
    ssr: {
      external: ['node:buffer', 'node:path', 'node:stream', 'node:util'],
    },
    optimizeDeps: {
      exclude: ['@astrojs/svelte'],
    },
  },
});
