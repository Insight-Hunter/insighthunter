import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const isDev = process.argv.includes("dev");

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
  integrations: [mdx(), sitemap()],
});
