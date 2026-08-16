import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://insighthunter.app",
  output: "server",
  adapter: cloudflare({
    mode: "advanced",
    imageService: "passthrough",
    platformProxy: {
      enabled: true,
      configPath: "./wrangler.toml",
    },
  }),
  integrations: [mdx(), sitemap()],
});
