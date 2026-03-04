import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true }
  }),
  integrations: [svelte()],
  image: {
    service: { entrypoint: "astro/assets/services/compile" },
  } 
});
