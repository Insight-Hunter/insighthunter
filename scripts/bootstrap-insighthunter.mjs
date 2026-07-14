import { execSync } from 'node:child_process';

execSync('corepack enable', { stdio: 'inherit' });
execSync('corepack prepare pnpm@10.15.0 --activate', { stdio: 'inherit' });
execSync('pnpm install', { stdio: 'inherit' });
