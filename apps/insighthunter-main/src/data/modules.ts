export type InsightHunterTier = 'Startup' | 'Standard' | 'Pro';

export interface InsightHunterModule {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  minTier: InsightHunterTier;
}

export const MODULES: InsightHunterModule[] = [
  {
    slug: 'bookkeeping',
    name: 'Bookkeeping',
    tagline: 'Clean books without the busywork.',
    description: 'Connect transactions, categorize activity, reconcile accounts, and maintain an audit-ready general ledger with service options that scale from self-service to expert support.',
    minTier: 'Startup',
  },
  {
    slug: 'reports',
    name: 'Reports',
    tagline: 'Financial statements that tell the truth quickly.',
    description: 'Generate profit and loss, balance sheet, cash-flow, aging, and management reports with current data and clear export-ready formatting.',
    minTier: 'Startup',
  },
  {
    slug: 'insights',
    name: 'Insights',
    tagline: 'Turn accounting activity into next actions.',
    description: 'Monitor KPIs, cash trends, operating signals, and forward-looking financial opportunities through an accessible CFO-style advisory workspace.',
    minTier: 'Standard',
  },
  {
    slug: 'bizforma',
    name: 'Business Formation Assistant',
    tagline: 'Form, organize, and keep your business compliant.',
    description: 'Choose an entity structure, prepare formation workflows, track annual filings, and manage recurring compliance obligations in one guided workspace.',
    minTier: 'Startup',
  },
  {
    slug: 'payroll',
    name: 'Payroll',
    tagline: 'Pay people accurately and stay on schedule.',
    description: 'Coordinate payroll processing, tax estimates, payroll records, and workforce reporting through tiered services and trusted payroll-provider integrations.',
    minTier: 'Standard',
  },
  {
    slug: 'pbx',
    name: 'PBX',
    tagline: 'Your customer conversations, organized.',
    description: 'Manage business calls, voicemail, SMS, automations, and communication activity through an integrated customer communication hub.',
    minTier: 'Pro',
  },
  {
    slug: 'ledger',
    name: 'Ledger',
    tagline: 'The accounting foundation beneath every decision.',
    description: 'Maintain your chart of accounts, journal entries, reconciliations, and financial controls with traceable business records.',
    minTier: 'Standard',
  },
  {
    slug: 'advisor',
    name: 'Advisor',
    tagline: 'Practical financial guidance when decisions cannot wait.',
    description: 'Use AI-assisted financial analysis to investigate variances, assess cash needs, and prepare decision-ready recommendations for your business.',
    minTier: 'Pro',
  },
];
