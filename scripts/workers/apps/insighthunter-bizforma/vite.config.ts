import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@src": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "components"),
      "@api": path.resolve(__dirname, "api"),
      "@services": path.resolve(__dirname, "services"),
      "@lib": path.resolve(__dirname, "lib"),
      "@types": path.resolve(__dirname, "types"),
      "@utils": path.resolve(__dirname, "utils"),
      "@styles": path.resolve(__dirname, "styles"),
      "@data": path.resolve(__dirname, "data"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
    emptyOutDir: true,
  },
});
