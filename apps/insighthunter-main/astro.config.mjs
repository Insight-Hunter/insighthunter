import { defineConfig } from 'astro/config';
<<<<<<< HEAD
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'directory' }),
  integrations: [svelte()]
=======
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
>>>>>>> 67612b7d33a6889fca29e77e31214f4791cbb16f
});
