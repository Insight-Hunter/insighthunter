const { execSync } = require('child_process');
const { writeFileSync, readFileSync, existsSync } = require('fs');
const path = require('path');

const项目根目录 = path.resolve(__dirname, '..');
const appsDir = path.join(项目根目录, 'apps');

// List of app directories to process
const appDirectories = [
  'ih-platform-worker',
  'insighthunter-main',
  'insighthunter-auth',
  'insighthunter-bookkeeping',
  // Add other app directories here...
];

function getWranglerConfig(appDir) {
  const wranglerTomlPath = path.join(appDir, 'wrangler.toml');
  if (existsSync(wranglerTomlPath)) {
    return readFileSync(wranglerTomlPath, 'utf-8');
  }
  return null;
}

function generateBindings() {
  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN) {
    throw new Error('CF_ACCOUNT_ID and CF_API_TOKEN must be set in environment');
  }

  appDirectories.forEach(app => {
    const appPath = path.join(appsDir, app);
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

generateBindings();
