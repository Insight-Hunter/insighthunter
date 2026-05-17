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
  server: {
    host: '0.0.0.0',
    port: 5000,
  },
  vite: {
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: true,
    },
    resolve: {
      alias: {
        '@ih/auth-client/jwt': new URL('../../packages/ih-auth-client/src/jwt.ts', import.meta.url).pathname,
        '@ih/auth-client/session': new URL('../../packages/ih-auth-client/src/session.ts', import.meta.url).pathname,
        '@ih/auth-client/middleware': new URL('../../packages.ih-auth-client/src/middleware.ts', import.meta.url).pathname,
        '@ih/auth-client': new URL('../../packages/ih-auth-client/src/index.ts', import.meta.url).pathname,
        '@ih/types': new URL('../../packages/ih-types/src/index.ts', import.meta.url).pathname,
        '@ih/ui': new URL('../../packages/ih-ui/src/index.ts', import.meta.url).pathname,
        '@ih/tier-config': new URL('../../packages/ih-tier-config/src/index.ts', import.meta.url).pathname,
      },
    },
    ssr: {
        noExternal: ['svelte'],
    }
  },
  build: {
    outDir: '../../dist',
  },
});
