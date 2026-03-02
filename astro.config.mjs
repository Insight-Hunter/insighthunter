import { defineConfig } from 'astro/config';
import sentry from '@sentry/astro';
import spotlightjs from '@spotlightjs/astro';
// https://astro.build/config
export default defineConfig({
  root: 'apps/insighthunter-main',
  output: 'static',
  integrations: [sentry(), spotlightjs()]
});