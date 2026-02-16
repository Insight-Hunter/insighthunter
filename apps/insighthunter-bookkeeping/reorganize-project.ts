#!/usr/bin/env ts-node
// reorganize-project.ts

import * as fs from 'fs';
import * as path from 'path';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
} as const;

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Target directory structure
const DIRECTORIES: string[] = [
  'src/backend/durable-objects',
  'src/backend/integrations',
  'src/backend/utils',
  'src/pages',
  'src/components/auth',
  'src/components/payment',
  'src/components/banking',
  'src/components/upload',
  'src/components/bookkeeping',
  'src/components/onboarding',
  'src/components/quickbooks',
  'src/components/shared',
  'src/hooks',
  'src/utils',
  'src/types',
  'src/layouts',
  'src/styles',
  'public/icons',
  'docs',
];

// File pattern mapping
interface FilePattern {
  pattern: RegExp;
  target: string;
}

const FILE_PATTERNS: Record<string, FilePattern[]> = {
  backend: [
    { pattern: /^(src\/)?index\.ts$/, target: 'src/backend/index.ts' },
    { pattern: /^(src\/)?worker\.ts$/, target: 'src/backend/index.ts' },
    { pattern: /BookkeepingLedger\.ts$/, target: 'src/backend/durable-objects/BookkeepingLedger.ts' },
    { pattern: /InvoiceManager\.ts$/, target: 'src/backend/durable-objects/InvoiceManager.ts' },
    { pattern: /SubscriptionManager\.ts$/, target: 'src/backend/durable-objects/SubscriptionManager.ts' },
    { pattern: /BankConnectionManager\.ts$/, target: 'src/backend/durable-objects/BankConnectionManager.ts' },
    { pattern: /quickbooks\.ts$/, target: 'src/backend/integrations/quickbooks.ts' },
    { pattern: /plaid\.ts$/, target: 'src/backend/integrations/plaid.ts' },
    { pattern: /stripe\.ts$/, target: 'src/backend/integrations/stripe.ts' },
    { pattern: /ai-reconciliation\.ts$/, target: 'src/backend/integrations/ai-reconciliation.ts' },
    { pattern: /pricing\.ts$/, target: 'src/backend/utils/pricing.ts' },
    { pattern: /validators\.ts$/, target: 'src/backend/utils/validators.ts' },
  ],
  
  components: [
    { pattern: /SignupForm\.tsx$/, target: 'src/components/auth/SignupForm.tsx' },
    { pattern: /LoginForm\.tsx$/, target: 'src/components/auth/LoginForm.tsx' },
    { pattern: /AuthForms\.css$/, target: 'src/components/auth/AuthForms.css' },
    { pattern: /PricingCards\.tsx$/, target: 'src/components/payment/PricingCards.tsx' },
    { pattern: /PricingCards\.css$/, target: 'src/components/payment/PricingCards.css' },
    { pattern: /CheckoutForm\.tsx$/, target: 'src/components/payment/CheckoutForm.tsx' },
    { pattern: /CheckoutForm\.css$/, target: 'src/components/payment/CheckoutForm.css' },
    { pattern: /SubscriptionStatus\.tsx$/, target: 'src/components/payment/SubscriptionStatus.tsx' },
    { pattern: /PaymentMethod\.tsx$/, target: 'src/components/payment/PaymentMethod.tsx' },
    { pattern: /PlaidLink\.tsx$/, target: 'src/components/banking/PlaidLink.tsx' },
    { pattern: /BankAccountList\.tsx$/, target: 'src/components/banking/BankAccountList.tsx' },
    { pattern: /BankAccountList\.css$/, target: 'src/components/banking/BankAccountList.css' },
    { pattern: /TransactionSync\.tsx$/, target: 'src/components/banking/TransactionSync.tsx' },
    { pattern: /BankingComponents\.css$/, target: 'src/components/banking/BankingComponents.css' },
    { pattern: /SpreadsheetUploader\.tsx$/, target: 'src/components/upload/SpreadsheetUploader.tsx' },
    { pattern: /SpreadsheetUploader\.css$/, target: 'src/components/upload/SpreadsheetUploader.css' },
    { pattern: /FileProcessor\.tsx$/, target: 'src/components/upload/FileProcessor.tsx' },
    { pattern: /ImportWizard\.tsx$/, target: 'src/components/upload/ImportWizard.tsx' },
    { pattern: /LedgerTable\.tsx$/, target: 'src/components/bookkeeping/LedgerTable.tsx' },
    { pattern: /LedgerTable\.css$/, target: 'src/components/bookkeeping/LedgerTable.css' },
    { pattern: /TransactionRow\.tsx$/, target: 'src/components/bookkeeping/TransactionRow.tsx' },
    { pattern: /TransactionRow\.css$/, target: 'src/components/bookkeeping/TransactionRow.css' },
    { pattern: /AIReconciliation\.tsx$/, target: 'src/components/bookkeeping/AIReconciliation.tsx' },
    { pattern: /AIReconciliation\.css$/, target: 'src/components/bookkeeping/AIReconciliation.css' },
    { pattern: /InvoiceManager\.tsx$/, target: 'src/components/bookkeeping/InvoiceManager.tsx' },
    { pattern: /InvoiceManager\.css$/, target: 'src/components/bookkeeping/InvoiceManager.css' },
    { pattern: /ReconciliationWizard\.tsx$/, target: 'src/components/bookkeeping/ReconciliationWizard.tsx' },
    { pattern: /ReconciliationWizard\.css$/, target: 'src/components/bookkeeping/ReconciliationWizard.css' },
    { pattern: /ReportCard\.tsx$/, target: 'src/components/bookkeeping/ReportCard.tsx' },
    { pattern: /ReportCard\.css$/, target: 'src/components/bookkeeping/ReportCard.css' },
    { pattern: /MetricsDashboard\.tsx$/, target: 'src/components/bookkeeping/MetricsDashboard.tsx' },
    { pattern: /MetricsDashboard\.css$/, target: 'src/components/bookkeeping/MetricsDashboard.css' },
    { pattern: /BudgetTracker\.tsx$/, target: 'src/components/bookkeeping/BudgetTracker.tsx' },
    { pattern: /BudgetTracker\.css$/, target: 'src/components/bookkeeping/BudgetTracker.css' },
    { pattern: /InsightsPanel\.tsx$/, target: 'src/components/bookkeeping/InsightsPanel.tsx' },
    { pattern: /InsightsPanel\.css$/, target: 'src/components/bookkeeping/InsightsPanel.css' },
    { pattern: /AccountSelector\.tsx$/, target: 'src/components/bookkeeping/AccountSelector.tsx' },
    { pattern: /AccountSelector\.css$/, target: 'src/components/bookkeeping/AccountSelector.css' },
    { pattern: /OnboardingWizard\.tsx$/, target: 'src/components/onboarding/OnboardingWizard.tsx' },
    { pattern: /OnboardingWizard\.css$/, target: 'src/components/onboarding/OnboardingWizard.css' },
    { pattern: /CompanySetup\.tsx$/, target: 'src/components/onboarding/CompanySetup.tsx' },
    { pattern: /StepIndicator\.tsx$/, target: 'src/components/onboarding/StepIndicator.tsx' },
    { pattern: /QuickBooksConnect\.tsx$/, target: 'src/components/quickbooks/QuickBooksConnect.tsx' },
    { pattern: /QuickBooksConnect\.css$/, target: 'src/components/quickbooks/QuickBooksConnect.css' },
    { pattern: /SyncStatus\.tsx$/, target: 'src/components/quickbooks/SyncStatus.tsx' },
    { pattern: /ImportExport\.tsx$/, target: 'src/components/quickbooks/ImportExport.tsx' },
    { pattern: /NavBar\.tsx$/, target: 'src/components/shared/NavBar.tsx' },
    { pattern: /NavBar\.css$/, target: 'src/components/shared/NavBar.css' },
    { pattern: /Sidebar\.tsx$/, target: 'src/components/shared/Sidebar.tsx' },
    { pattern: /Sidebar\.css$/, target: 'src/components/shared/Sidebar.css' },
    { pattern: /LoadingSpinner\.tsx$/, target: 'src/components/shared/LoadingSpinner.tsx' },
    { pattern: /Modal\.tsx$/, target: 'src/components/shared/Modal.tsx' },
    { pattern: /Toast\.tsx$/, target: 'src/components/shared/Toast.tsx' },
    { pattern: /ErrorBoundary\.tsx$/, target: 'src/components/shared/ErrorBoundary.tsx' },
  ],
  
  hooks: [
    { pattern: /useBooks\.ts$/, target: 'src/hooks/useBooks.ts' },
    { pattern: /useSubscription\.ts$/, target: 'src/hooks/useSubscription.ts' },
    { pattern: /useBankAccounts\.ts$/, target: 'src/hooks/useBankAccounts.ts' },
    { pattern: /useUpload\.ts$/, target: 'src/hooks/useUpload.ts' },
    { pattern: /useAuth\.ts$/, target: 'src/hooks/useAuth.ts' },
    { pattern: /useReconciliation\.ts$/, target: 'src/hooks/useReconciliation.ts' },
    { pattern: /useReports\.ts$/, target: 'src/hooks/useReports.ts' },
  ],
  
  utils: [
    { pattern: /ledgerMath\.ts$/, target: 'src/utils/ledgerMath.ts' },
    { pattern: /dateUtils\.ts$/, target: 'src/utils/dateUtils.ts' },
    { pattern: /bookkeepingApi\.ts$/, target: 'src/utils/api.ts' },
    { pattern: /formatting\.ts$/, target: 'src/utils/formatting.ts' },
  ],
  
  types: [
    { pattern: /types\/bookkeeping\.ts$/, target: 'src/types/bookkeeping.ts' },
    { pattern: /types\/subscription\.ts$/, target: 'src/types/subscription.ts' },
    { pattern: /types\/banking\.ts$/, target: 'src/types/banking.ts' },
    { pattern: /types\/invoice\.ts$/, target: 'src/types/invoice.ts' },
    { pattern: /types\/auth\.ts$/, target: 'src/types/auth.ts' },
    { pattern: /types\/index\.ts$/, target: 'src/types/index.ts' },
  ],
  
  styles: [
    { pattern: /bookkeeping\.css$/, target: 'src/styles/bookkeeping.css' },
    { pattern: /tables\.css$/, target: 'src/styles/tables.css' },
    { pattern: /globals?\.css$/, target: 'src/styles/globals.css' },
    { pattern: /forms\.css$/, target: 'src/styles/forms.css' },
    { pattern: /variables\.css$/, target: 'src/styles/variables.css' },
  ],
  
  layouts: [
    { pattern: /AppLayout\.astro$/, target: 'src/layouts/AppLayout.astro' },
    { pattern: /AuthLayout\.astro$/, target: 'src/layouts/AuthLayout.astro' },
  ],
  
  pages: [
    { pattern: /pages\/index\.astro$/, target: 'src/pages/index.astro' },
    { pattern: /pages\/pricing\.astro$/, target: 'src/pages/pricing.astro' },
    { pattern: /pages\/signup\.astro$/, target: 'src/pages/signup.astro' },
    { pattern: /pages\/login\.astro$/, target: 'src/pages/login.astro' },
    { pattern: /pages\/checkout\.astro$/, target: 'src/pages/checkout.astro' },
    { pattern: /pages\/onboarding\.astro$/, target: 'src/pages/onboarding.astro' },
    { pattern: /pages\/dashboard\.astro$/, target: 'src/pages/dashboard.astro' },
    { pattern: /pages\/bank-connections\.astro$/, target: 'src/pages/bank-connections.astro' },
    { pattern: /pages\/upload\.astro$/, target: 'src/pages/upload.astro' },
    { pattern: /pages\/invoices\.astro$/, target: 'src/pages/invoices.astro' },
    { pattern: /pages\/reconciliation\.astro$/, target: 'src/pages/reconciliation.astro' },
    { pattern: /pages\/reports\.astro$/, target: 'src/pages/reports.astro' },
    { pattern: /pages\/clients\.astro$/, target: 'src/pages/clients.astro' },
    { pattern: /pages\/settings\.astro$/, target: 'src/pages/settings.astro' },
  ],
};

// Required files to create
const REQUIRED_FILES: Record<string, string> = {
  '.gitignore': `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
.astro/
.wrangler/

# Environment
.env
.env.local
.env.production
.dev.vars

# Logs
*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Temporary
*.tmp
.cache/

# Secrets
*.pem
*.key
`,

  '.env.example': `# QuickBooks
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=https://your-domain.workers.dev/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox

# Stripe
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Plaid
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_secret
PLAID_ENV=sandbox

# OpenAI
OPENAI_API_KEY=sk-your_key

# Frontend
PUBLIC_API_URL=http://localhost:8787
PUBLIC_FRONTEND_URL=http://localhost:4321
`,

  'setup-resources.sh': `#!/bin/bash
set -e

echo "🚀 Setting up InsightHunter Bookkeeping..."

if ! command -v wrangler &> /dev/null; then
    npm install -g wrangler
fi

wrangler login

echo "Creating KV namespaces..."
wrangler kv:namespace create "AUTH_TOKENS" --preview false
wrangler kv:namespace create "AUTH_TOKENS" --preview
wrangler kv:namespace create "USER_SESSIONS" --preview false
wrangler kv:namespace create "USER_SESSIONS" --preview

echo "Creating R2 buckets..."
wrangler r2 bucket create insighthunter-uploads 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-preview 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-dev 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-staging 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-prod 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo "Update wrangler.toml with the KV namespace IDs above"
`,

  'deploy.sh': `#!/bin/bash
set -e

echo "🚀 Deploying InsightHunter Bookkeeping..."

[ ! -d "node_modules" ] && npm install

npm run type-check || true
npm run build

echo ""
echo "Select environment:"
echo "1) Development"
echo "2) Staging"  
echo "3) Production"
read -p "Choice (1-3): " choice

case $choice in
    1) ENV="development" ;;
    2) ENV="staging" ;;
    3)
        ENV="production"
        read -p "Deploy to PRODUCTION? (yes/no): " confirm
        [ "$confirm" != "yes" ] && exit 1
        ;;
    *) echo "Invalid" && exit 1 ;;
esac

echo "Deploying to $ENV..."
[ "$ENV" = "production" ] && wrangler deploy || wrangler deploy --env $ENV

echo "✅ Complete!"
`,

  'README.md': `# InsightHunter Bookkeeping

AI-powered bookkeeping with bank integration and real-time insights.

## Quick Start

\`\`\`bash
npm install
./setup-resources.sh
npm run worker:dev  # Backend
npm run dev         # Frontend
\`\`\`

## Deployment

\`\`\`bash
./deploy.sh
\`\`\`

## Features

- Double-entry bookkeeping
- AI reconciliation
- Bank integration (Plaid)
- QuickBooks sync
- Invoice management
- Multi-tier pricing
- Stripe payments

## Docs

- [API](./docs/API.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Development](./docs/DEVELOPMENT.md)
`,

  'src/types/index.ts': `export * from './bookkeeping';
export * from './subscription';
export * from './banking';
export * from './invoice';
export * from './auth';
`,

  'src/types/auth.ts': `export interface User {
  id: string;
  email: string;
  name: string;
  companyId: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}
`,

  'public/robots.txt': `User-agent: *
Allow: /
`,

  'public/manifest.webmanifest': `{
  "name": "InsightHunter Bookkeeping",
  "short_name": "InsightHunter",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea"
}
`,

  'docs/API.md': `# API Documentation

## Endpoints

### Auth
- POST /api/auth/signup
- POST /api/auth/login

### Subscriptions  
- POST /api/subscriptions/create
- GET /api/subscriptions/:userId

### Banking
- POST /api/bank/create-link-token
- POST /api/bank/exchange-token

### Ledger
- POST /api/ledger/:companyId/transaction
- GET /api/ledger/:companyId/transactions
`,

  'docs/DEPLOYMENT.md': `# Deployment

1. \`./setup-resources.sh\`
2. Update wrangler.toml with KV IDs
3. \`./deploy.sh\`
`,

  'docs/DEVELOPMENT.md': `# Development

\`\`\`bash
npm install
npm run worker:dev
npm run dev
\`\`\`
`,

  'docs/ARCHITECTURE.md': `# Architecture

- Backend: Cloudflare Workers + Durable Objects
- Frontend: Astro + React + TypeScript
- Storage: R2 + KV + Durable Objects
`,
};

// Main function
async function reorganizeProject(): Promise<void> {
  const rootDir = process.cwd();
  
  log.section('InsightHunter Bookkeeping Reorganization');
  log.info(`Working directory: ${rootDir}`);
  
  // Step 1: Create directories
  log.section('Creating Directory Structure');
  for (const dir of DIRECTORIES) {
    const fullPath = path.join(rootDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      log.success(`Created: ${dir}`);
    }
  }
  
  // Step 2: Move files
  log.section('Moving Files');
  const movedFiles = new Set<string>();
  const allFiles = getAllFiles(rootDir);
  
  for (const [category, patterns] of Object.entries(FILE_PATTERNS)) {
    for (const { pattern, target } of patterns) {
      const matches = allFiles.filter(file => {
        const relativePath = path.relative(rootDir, file);
        return pattern.test(relativePath) && !movedFiles.has(file);
      });
      
      for (const sourcePath of matches) {
        const targetPath = path.join(rootDir, target);
        
        if (path.resolve(sourcePath) === path.resolve(targetPath)) {
          continue;
        }
        
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        try {
          if (fs.existsSync(targetPath)) {
            log.warning(`Target exists: ${target}`);
          } else {
            fs.renameSync(sourcePath, targetPath);
            movedFiles.add(sourcePath);
            log.success(`Moved: ${path.relative(rootDir, sourcePath)} → ${target}`);
          }
        } catch (error) {
          log.error(`Failed: ${(error as Error).message}`);
        }
      }
    }
  }
  
  // Step 3: Create required files
  log.section('Creating Required Files');
  for (const [filePath, content] of Object.entries(REQUIRED_FILES)) {
    const fullPath = path.join(rootDir, filePath);
    
    if (!fs.existsSync(fullPath)) {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(fullPath, content);
      log.success(`Created: ${filePath}`);
    }
  }
  
  // Step 4: Make scripts executable
  log.section('Setting Permissions');
  const scripts = ['setup-resources.sh', 'deploy.sh'];
  for (const script of scripts) {
    const scriptPath = path.join(rootDir, script);
    if (fs.existsSync(scriptPath)) {
      fs.chmodSync(scriptPath, '755');
      log.success(`Executable: ${script}`);
    }
  }
  
  // Summary
  log.section('Complete!');
  log.info(`Files moved: ${movedFiles.size}`);
  log.info(`Directories created: ${DIRECTORIES.length}`);
  
  log.section('Next Steps');
  console.log('1. git status');
  console.log('2. Update imports');
  console.log('3. npm install');
  console.log('4. ./setup-resources.sh');
  console.log('5. Update wrangler.toml');
  console.log('6. npm run worker:dev');
}

// Helper function
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    
    const skipDirs = ['node_modules', 'dist', '.git', '.wrangler', '.astro'];
    if (skipDirs.includes(file) || file.startsWith('.')) {
      return;
    }
    
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

// Execute
reorganizeProject().catch((error) => {
  log.error(`Fatal: ${error.message}`);
  process.exit(1);
});
