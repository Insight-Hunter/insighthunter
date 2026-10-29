import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    mode: "advanced",
    imageService: "passthrough",
    platformProxy: {
      enabled: process.argv.includes("dev"),
      configPath: "./wrangler.toml",
    },
  }),
});
