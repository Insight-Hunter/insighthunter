import { defineConfig } from "vite";
import { resolve } from "node:path";

const workerTarget = process.env.PBX_API_TARGET ?? "http://127.0.0.1:8787";

export default defineConfig({
  root: "src/frontend",
  publicDir: false,
  server: {
    host: "0.0.0.0",
    port: 4174,
    proxy: {
      "/api": {
        target: workerTarget,
        changeOrigin: true,
      },
      "/health": {
        target: workerTarget,
        changeOrigin: true,
      },
      "/voice": {
        target: workerTarget,
        changeOrigin: true,
      },
      "/webhooks": {
        target: workerTarget,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4174,
  },
  build: {
    outDir: "../../dist/frontend",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(process.cwd(), "src/frontend/index.html"),
    },
  },
});
