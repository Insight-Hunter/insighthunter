import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'advanced' }),
  integrations: [svelte()],
  vite: {
    css: { preprocessorOptions: { scss: { additionalData: `@use '/src/styles/_vars.scss' as *;` } } },
  },
});