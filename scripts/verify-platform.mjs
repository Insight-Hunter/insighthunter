#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const requiredApps = [
  "insighthunter-main",
  "insighthunter-auth",
  "insighthunter-dashboard",
  "insighthunter-payments",
  "insighthunter-bookkeeping",
  "insighthunter-bizforma",
  "insighthunter-payroll",
  "insighthunter-report",
  "insighthunter-insights",
  "insighthunter-pbx",
];

const requiredMarketingPages = [
  "index.astro",
  "pricing.astro",
  "modules.astro",
  "signup.astro",
  "login.astro",
];

const missing = [];
const check = async (relativePath) => {
  try {
    await access(resolve(root, relativePath));
  } catch {
    missing.push(relativePath);
  }
};

await Promise.all([
  check("docs/ARCHITECTURE.md"),
  ...requiredApps.flatMap((app) => [
    check(`apps/${app}/package.json`),
    check(`apps/${app}/wrangler.toml`),
  ]),
  ...requiredMarketingPages.map((page) => check(`apps/insighthunter-main/src/pages/${page}`)),
]);

const rootPackage = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
if (!rootPackage.packageManager?.startsWith("pnpm@")) {
  missing.push("package.json packageManager (pnpm pin)");
}

if (missing.length > 0) {
  console.error("Insight Hunter platform verification failed. Missing required files:");
  for (const item of missing) console.error(`- ${item}`);
  process.exitCode = 1;
} else {
  console.log(`Verified ${requiredApps.length} deployable applications and ${requiredMarketingPages.length} marketing entry pages.`);
}
