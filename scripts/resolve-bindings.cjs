const { execSync } = require('child_process');
const { writeFileSync, readFileSync, existsSync } = require('fs');
const path = require('path');

const direct = path.resolve(__dirname, '..');
const appsDir = path.join(direct, 'apps');
const workersDir = path.join(direct, 'workers');

// List of app directories to process
const appDirectories = [
  'ih-platform-worker',
  'insighthunter-main',
  'ih-tenant-template',
  'insighthunter-auth',
  'insighthunter-bookkeeping',
  'insighthunter-bizforma',
  'insighthunter-ledger',
  'insighthunter-advisor',
  'insighthunter-finops',
  'insighthunter-payroll',
  'insighthunter-report',
  'insighthunter-roadmap',
  'insighthunter-scout',
  'insighthunter-whitelabel',
  'insighthunter-pro-services'
];

const workerDirectories = [
  'insight-platform-update',
  'insighthunter-auth',
  'insighthunter-bookkeeping',
  'insighthunter-cron',
  'insighthunter-dispatch',
  'insighthunter-insights',
  'insighthunter-notifications',
  'insighthunter-reports',
  'tenant-base-worker'
];

function getWranglerConfig(appDir) {
  const wranglerTomlPath = path.join(appDir, 'wrangler.toml');
  if (existsSync(wranglerTomlPath)) {
    return readFileSync(wranglerTomlPath, 'utf-8');
  }
  return null;
}

function generateBindings(directories, baseDir) {
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN) {
    throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN must be set in environment');
  }

  directories.forEach(app => {
    const appPath = path.join(baseDir, app);
    const mainWranglerConfig = getWranglerConfig(appPath);

    if (mainWranglerConfig) {
      const command = `npx wrangler-transform`;
      try {
        const generatedConfig = execSync(command, {
          cwd: appPath,
          env: { ...process.env, WRANGLER_TOML: mainWranglerConfig },
          encoding: 'utf-8',
        });

        const generatedTomlPath = path.join(appPath, 'wrangler.generated.toml');
        writeFileSync(generatedTomlPath, generatedConfig);
        console.log(`Generated wrangler.generated.toml for ${app}`);
      } catch (error) {
        console.error(`Failed to generate bindings for ${app}:`, error.stderr);
      }
    }
  });
}

generateBindings(appDirectories, appsDir);
generateBindings(workerDirectories, workersDir);
