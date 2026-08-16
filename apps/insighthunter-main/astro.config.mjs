import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://insighthunter.app',
  output: 'server',
  adapter: cloudflare({
    mode: 'advanced',          // ← outputs dist/_worker.js (single Worker file)
    platformProxy: {
      enabled: true,
      configPath: './wrangler.toml'   // ← points at the correct file now
    }
  }),
  integrations: [mdx(), sitemap()],
});
