import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false,
  }),
  integrations: [
    svelte(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    resolve: {
      alias: {
        '@ih/auth-client': '../../packages/ih-auth-client/src',
        '@ih/types': '../../packages/ih-types/src',
        '@ih/ui': '../../packages/ih-ui/src',
      },
    },
  },
});
