import { mkdirSync, writeFileSync } from "node:fs";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const isDev = process.argv.includes("dev");

// @cloudflare/vite-plugin validates wrangler.toml's `main` file exists at
// Vite config-resolution time, which runs during Astro's content-sync step
// and again before the SSR build — both before the real entry.mjs is
// emitted. We seed a throwaway placeholder at both points so the existence
// check passes; the real build then overwrites it with the actual bundle.
function writePlaceholderEntry() {
  mkdirSync("./dist/server", { recursive: true });
  writeFileSync(
    "./dist/server/entry.mjs",
    "export default { fetch() { return new Response('placeholder'); } };\n",
  );
}

if (!isDev) {
  writePlaceholderEntry();
}

function cloudflarePlaceholderWorker() {
  return {
    name: "insighthunter-cloudflare-placeholder-worker",
    hooks: {
      "astro:build:setup": () => {
        writePlaceholderEntry();
      },
    },
  };
}

export default defineConfig({
  site: "https://insighthunter.app",
  output: "server",
  adapter: cloudflare({
    mode: "advanced",
    imageService: "passthrough",
    platformProxy: {
      enabled: isDev,
      configPath: "./wrangler.toml",
    },
  }),
  integrations: [mdx(), sitemap(), cloudflarePlaceholderWorker()],
});
