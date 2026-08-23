import { execFileSync } from "node:child_process";

const skipInstall = process.argv.includes("--skip-install");
const major = Number(process.versions.node.split(".")[0]);

if (major < 22) {
  throw new Error(`Node.js 22 or newer is required; found ${process.versions.node}.`);
}

execFileSync("pnpm", ["--version"], { stdio: "inherit" });
if (!skipInstall) {
  execFileSync("pnpm", ["install", "--frozen-lockfile"], { stdio: "inherit" });
}
execFileSync("node", ["scripts/verify-platform.mjs"], { stdio: "inherit" });
