#!/usr/bin/env node
// reorganize-project.js

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Target directory structure (only directories, no duplicates)
const DIRECTORIES = [
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

// Intelligent file mapping based on patterns
const FILE_PATTERNS = {
  // Backend patterns
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
  ],
  
  // Component patterns
  components: [
    { pattern: /SignupForm\.tsx$/, target: 'src/components/auth/SignupForm.tsx' },
    { pattern: /LoginForm\.tsx$/, target: 'src/components/auth/LoginForm.tsx' },
    { pattern: /AuthForms\.css$/, target: 'src/components/auth/AuthForms.css' },
    { pattern: /PricingCards\.tsx$/, target: 'src/components/payment/PricingCards.tsx' },
    { pattern: /PricingCards\.css$/, target: 'src/components/payment/PricingCards.css' },
    { pattern: /CheckoutForm\.tsx$/, target: 'src/components/payment/CheckoutForm.tsx' },
    { pattern: /PlaidLink\.tsx$/, target: 'src/components/banking/PlaidLink.tsx' },
    { pattern: /BankAccountList\.tsx$/, target: 'src/components/banking/BankAccountList.tsx' },
    { pattern: /SpreadsheetUploader\.tsx$/, target: 'src/components/upload/SpreadsheetUploader.tsx' },
    { pattern: /SpreadsheetUploader\.css$/, target: 'src/components/upload/SpreadsheetUploader.css' },
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
    { pattern: /QuickBooksConnect\.tsx$/, target: 'src/components/quickbooks/QuickBooksConnect.tsx' },
    { pattern: /QuickBooksConnect\.css$/, target: 'src/components/quickbooks/QuickBooksConnect.css' },
    { pattern: /NavBar\.tsx$/, target: 'src/components/shared/NavBar.tsx' },
    { pattern: /NavBar\.css$/, target: 'src/components/shared/NavBar.css' },
  ],
  
  // Hook patterns
  hooks: [
    { pattern: /useBooks\.ts$/, target: 'src/hooks/useBooks.ts' },
    { pattern: /useSubscription\.ts$/, target: 'src/hooks/useSubscription.ts' },
    { pattern: /useBankAccounts\.ts$/, target: 'src/hooks/useBankAccounts.ts' },
    { pattern: /useReconciliation\.ts$/, target: 'src/hooks/useReconciliation.ts' },
    { pattern: /useReports\.ts$/, target: 'src/hooks/useReports.ts' },
  ],
  
  // Util patterns
  utils: [
    { pattern: /ledgerMath\.ts$/, target: 'src/utils/ledgerMath.ts' },
    { pattern: /dateUtils\.ts$/, target: 'src/utils/dateUtils.ts' },
    { pattern: /bookkeepingApi\.ts$/, target: 'src/utils/api.ts' },
  ],
  
  // Type patterns
  types: [
    { pattern: /types\/bookkeeping\.ts$/, target: 'src/types/bookkeeping.ts' },
    { pattern: /types\/subscription\.ts$/, target: 'src/types/subscription.ts' },
    { pattern: /types\/banking\.ts$/, target: 'src/types/banking.ts' },
    { pattern: /types\/invoice\.ts$/, target: 'src/types/invoice.ts' },
    { pattern: /types\/index\.ts$/, target: 'src/types/index.ts' },
  ],
  
  // Style patterns
  styles: [
    { pattern: /bookkeeping\.css$/, target: 'src/styles/bookkeeping.css' },
    { pattern: /tables\.css$/, target: 'src/styles/tables.css' },
    { pattern: /globals?\.css$/, target: 'src/styles/globals.css' },
  ],
  
  // Layout patterns
  layouts: [
    { pattern: /AppLayout\.astro$/, target: 'src/layouts/AppLayout.astro' },
  ],
};

// Files to create if missing
const REQUIRED_FILES = {
  '.gitignore': `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
.astro/
.wrangler/

# Environment variables
.env
.env.local
.env.production
.dev.vars

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Temporary files
*.tmp
.cache/

# Secrets
*.pem
*.key
`,

  '.env.example': `# QuickBooks
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=https://your-domain.workers.dev/api/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Plaid
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key

# Frontend
PUBLIC_API_URL=http://localhost:8787
PUBLIC_FRONTEND_URL=http://localhost:4321
`,

  'setup-resources.sh': `#!/bin/bash
set -e

echo "🚀 Setting up InsightHunter Bookkeeping..."

if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
fi

echo "Logging in to Cloudflare..."
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
echo "📋 Update wrangler.toml with the KV namespace IDs shown above"
`,

  'deploy.sh': `#!/bin/bash
set -e

echo "🚀 Deploying InsightHunter Bookkeeping..."

if [ ! -d "node_modules" ]; then
    npm install
fi

echo "Running type check..."
npm run type-check || true

echo "Building..."
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
        [ "$confirm" != "yes" ] && echo "Cancelled" && exit 1
        ;;
    *) echo "Invalid choice" && exit 1 ;;
esac

echo "Deploying to $ENV..."
[ "$ENV" = "production" ] && wrangler deploy || wrangler deploy --env $ENV

echo "✅ Deployment complete!"
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

  'src/components/auth/LoginForm.tsx': `import { useState } from 'react';
import './AuthForms.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login:', { email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="submit-btn">
        Log In
      </button>
    </form>
  );
}
`,

  'src/components/shared/LoadingSpinner.tsx': `export default function LoadingSpinner() {
  return <div className="spinner"><div className="spinner-circle"></div></div>;
}
`,

  'src/components/shared/Modal.tsx': `import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {children}
      </div>
    </div>
  );
}
`,

  'src/components/shared/Toast.tsx': `import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export default function Toast({ message, type = 'info', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return <div className={\`toast toast-\${type}\`}>{message}</div>;
}
`,

  'src/components/shared/ErrorBoundary.tsx': `import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
`,

  'src/layouts/AuthLayout.astro': `---
const { title } = Astro.props;
import '../styles/globals.css';
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - InsightHunter</title>
</head>
<body>
  <slot />
</body>
</html>
`,

  'src/pages/login.astro': `---
import AuthLayout from '@/layouts/AuthLayout.astro';
import LoginForm from '@/components/auth/LoginForm';
---
<AuthLayout title="Log In">
  <div class="auth-container">
    <div class="auth-card">
      <h1>InsightHunter</h1>
      <h2>Welcome back</h2>
      <LoginForm client:load />
      <p>Don't have an account? <a href="/signup">Sign up</a></p>
    </div>
  </div>
</AuthLayout>
`,

  'public/robots.txt': `User-agent: *
Allow: /
Sitemap: https://insighthunter.com/sitemap.xml
`,

  'public/manifest.webmanifest': `{
  "name": "InsightHunter Bookkeeping",
  "short_name": "InsightHunter",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#667eea",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
`,

  'docs/API.md': `# API Documentation

## Authentication
- POST /api/auth/signup
- POST /api/auth/login

## Subscriptions
- POST /api/subscriptions/create
- GET /api/subscriptions/:userId

## Banking
- POST /api/bank/create-link-token
- POST /api/bank/exchange-token

## Ledger
- POST /api/ledger/:companyId/transaction
- GET /api/ledger/:companyId/transactions
`,

  'docs/DEPLOYMENT.md': `# Deployment Guide

1. Run \`./setup-resources.sh\`
2. Update \`wrangler.toml\` with KV IDs
3. Run \`./deploy.sh\`
`,

  'docs/DEVELOPMENT.md': `# Development Guide

\`\`\`bash
npm install
npm run worker:dev  # Backend
npm run dev         # Frontend
\`\`\`
`,

  'docs/ARCHITECTURE.md': `# Architecture

- Backend: Cloudflare Workers + Durable Objects
- Frontend: Astro + React + TypeScript
- Storage: R2 + KV + Durable Objects
`,
};

// Main function
async function reorganizeProject() {
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
  
  // Step 2: Find and move files
  log.section('Moving Files');
  const movedFiles = new Set();
  
  // Get all existing files
  const allFiles = getAllFiles(rootDir);
  
  // Process each pattern category
  for (const [category, patterns] of Object.entries(FILE_PATTERNS)) {
    for (const { pattern, target } of patterns) {
      // Find matching files
      const matches = allFiles.filter(file => {
        const relativePath = path.relative(rootDir, file);
        return pattern.test(relativePath) && !movedFiles.has(file);
      });
      
      for (const sourcePath of matches) {
        const targetPath = path.join(rootDir, target);
        
        // Skip if source and target are the same
        if (path.resolve(sourcePath) === path.resolve(targetPath)) {
          continue;
        }
        
        // Create target directory
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Move file
        try {
          if (fs.existsSync(targetPath)) {
            log.warning(`Target exists, skipping: ${target}`);
          } else {
            fs.renameSync(sourcePath, targetPath);
            movedFiles.add(sourcePath);
            log.success(`Moved: ${path.relative(rootDir, sourcePath)} → ${target}`);
          }
        } catch (error) {
          log.error(`Failed to move ${sourcePath}: ${error.message}`);
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
      log.success(`Made executable: ${script}`);
    }
  }
  
  // Step 5: Summary
  log.section('Reorganization Complete!');
  log.info(`Files moved: ${movedFiles.size}`);
  log.info(`Directories created: ${DIRECTORIES.length}`);
  
  log.section('Next Steps');
  console.log('1. Review changes: git status');
  console.log('2. Update imports in your code');
  console.log('3. Run: npm install');
  console.log('4. Run: ./setup-resources.sh');
  console.log('5. Update wrangler.toml with KV IDs');
  console.log('6. Run: npm run worker:dev');
}

// Helper: Get all files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    
    // Skip certain directories
    if (file === 'node_modules' || file === 'dist' || file === '.git' || 
        file === '.wrangler' || file === '.astro' || file.startsWith('.')) {
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

// Run
reorganizeProject().catch((error) => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
