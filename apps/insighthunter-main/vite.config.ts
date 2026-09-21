import { defineConfig } from "vite";

export default defineConfig({
  // Cloudflare Workers SSR — no browser build needed here;
  // Astro handles the client bundle via astro.config.mjs.
  build: {
    target: "es2022",
  },
});
