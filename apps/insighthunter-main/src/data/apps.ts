// src/data/apps.ts
import type { InsightApp, SubscriptionTier } from '../types.js';

// ─── Helper ────────────────────────────────────────────────────────────────
function app(a: InsightApp): InsightApp { return a; }

// ─── Core Plans ────────────────────────────────────────────────────────────
const lite = app({
  slug:          'lite',
  name:          'Insight Lite',
  icon:          '🌱',
  status:        'live',
  category:      'core',
  tier:          'Core Plan',
  price:         '$29/mo',
  priceMonthly:  2900,
  tenancy:       'Single Tenant',
  requiredPlans: ['lite', 'standard', 'pro'],
  desc:          'Essential financial visibility for freelancers and micro-businesses. Get your numbers under control without the complexity.',
  tags:          ['Cash Flow', 'P&L', 'Reports', 'Alerts'],
  features: [
    'Real-time cash flow dashboard',
    'Monthly P&L and balance sheet',
    'Up to 3 connected bank accounts',
    'Automated monthly email reports',
    'Basic anomaly alerts',
    'QuickBooks & Xero import',
    'Single user access',
    'Email support',
  ],
  faqs: [
    { q: 'Who is Insight Lite designed for?',
      a: 'Freelancers, sole traders, and businesses under $500K revenue who need financial clarity without a full accounting team.' },
    { q: 'Can I upgrade to Standard later?',
      a: 'Yes — upgrade anytime from account settings. All data, reports, and history carry over instantly.' },
    { q: 'Is there a free trial?',
      a: '14 days free, no credit card required. Full Lite feature access from day one.' },
    { q: 'What accounting software does it connect to?',
      a: 'QuickBooks Online, Xero, and FreshBooks. CSV manual import is also supported.' },
  ],
  support:  'Email: support@insighthunter.app · Subject: "Insight Lite" · Response within 24 hours.',
  docsUrl:  'https://docs.insighthunter.app/lite',
  appUrl:   'https://lite.insighthunter.app/',
  pageUrl:  '/features/lite.html',
});

const standard = app({
  slug:          'standard',
  name:          'Insight Standard',
  icon:          '📊',
  status:        'live',
  category:      'core',
  tier:          'Core Plan',
  price:         '$79/mo',
  priceMonthly:  7900,
  tenancy:       'Single Tenant',
  requiredPlans: ['standard', 'pro'],
  desc:          'Full-featured CFO suite for growing SMBs. AI forecasting, benchmarks, and team collaboration — everything you need to scale confidently.',
  tags:          ['Forecasting', 'Benchmarks', 'Teams', 'Integrations'],
  features: [
    'Everything in Insight Lite',
    'AI revenue & expense forecasting (90-day + 12-month)',
    'Industry benchmark comparisons (40+ KPIs)',
    'Unlimited bank & payment processor connections',
    'Weekly automated board-ready reports',
    'Up to 10 user seats with role-based access',
    'Slack & email alert delivery',
    'QuickBooks, Xero, Stripe, Shopify integrations',
    'Priority email & chat support',
  ],
  faqs: [
    { q: 'How accurate is the AI forecasting?',
      a: '95% accuracy on 30-day projections. The model learns your patterns and improves every month.' },
    { q: 'How many team members can use Standard?',
      a: 'Up to 10 seats with Admin, CFO, and Viewer roles. Additional seats available on request.' },
    { q: 'What integrations are included?',
      a: 'QuickBooks, Xero, FreshBooks, Stripe, Shopify, Plaid (12,000+ banks), and a REST API for custom builds.' },
    { q: 'Can I downgrade to Lite?',
      a: 'Yes — takes effect at next billing cycle. Forecasting and benchmark data are archived, not deleted.' },
  ],
  support:  'Email: support@insighthunter.app · In-app live chat · Response within 4 hours on business days.',
  docsUrl:  'https://docs.insighthunter.app/standard',
  appUrl:   'https://standard.insighthunter.app/',
  pageUrl:  '/features/standard.html',
});

const pro = app({
  slug:          'pro',
  name:          'Insight Pro',
  icon:          '🏢',
  status:        'live',
  category:      'core',
  tier:          'Core Plan · Enterprise',
  price:         '$199/mo+',
  priceMonthly:  19900,
  tenancy:       'Single or Multi-Tenant',
  requiredPlans: ['pro'],
  desc:          'Enterprise-grade financial intelligence for multi-location businesses, franchises, and fractional CFOs managing multiple clients.',
  tags:          ['Multi-Tenant', 'White Label', 'API', 'Enterprise', 'SSO'],
  features: [
    'Everything in Insight Standard',
    'Multi-tenant dashboard (unlimited entities)',
    'White-label reports with custom branding & domain',
    'Dedicated fractional CFO client portal',
    'Full REST & GraphQL API access',
    'Custom workflow automation',
    'SSO / SAML integration',
    'Unlimited user seats',
    'Dedicated account manager',
    '24/7 phone & Slack support',
    'SLA guarantee (99.9% uptime)',
    'Custom data retention policies',
  ],
  faqs: [
    { q: 'What does multi-tenant mean?',
      a: 'Manage multiple separate business entities from one login — ideal for franchises, holding companies, or fractional CFOs.' },
    { q: 'Can I white-label the dashboard for clients?',
      a: 'Yes. Upload your logo, set brand colours, add a custom domain. Clients see your brand, not Insight Hunter.' },
    { q: 'Is enterprise pricing available?',
      a: 'Yes. Volume discounts from 5+ entities. Contact sales@insighthunter.app for a custom quote.' },
    { q: 'What does the SLA cover?',
      a: '99.9% monthly uptime with automatic credits if breached. Excludes scheduled maintenance windows.' },
  ],
  support:  'Dedicated Slack channel + 24/7 phone. New to Pro? Email sales@insighthunter.app.',
  docsUrl:  'https://docs.insighthunter.app/pro',
  appUrl:   'https://pro.insighthunter.app/',
  pageUrl:  '/features/pro.html',
});

// ─── Add-on Apps ───────────────────────────────────────────────────────────
const pbx = app({
  slug:          'pbx',
  name:          'Virtual Voice & SMS',
  icon:          '📞',
  status:        'live',
  category:      'addon',
  tier:          'Add-on',
  price:         'From $19/mo',
  priceMonthly:  1900,
  tenancy:       'Any Plan',
  requiredPlans: ['lite', 'standard', 'pro'],
  desc:          'Cloud PBX with virtual numbers, IVR, team extensions, SMS campaigns, and call analytics — integrated with your CRM and Insight data.',
  tags:          ['PBX', 'VoIP', 'SMS', 'IVR', 'Call Tracking'],
  features: [
    'Local & toll-free virtual numbers (50+ countries)',
    'Multi-level IVR ("press 1 for sales…")',
    'Team extensions with smart call routing rules',
    'SMS & MMS campaigns with templates',
    'Voicemail-to-email with AI transcription',
    'Call recording with 90-day retention',
    'Real-time call analytics dashboard',
    'CRM sync (HubSpot, Salesforce, Pipedrive)',
    'iOS, Android, Mac & Windows softphone apps',
    'Number porting from your existing carrier',
  ],
  faqs: [
    { q: 'Do I need any hardware?',
      a: 'No. Everything runs in browser or the iOS/Android app. SIP desk phones optionally supported.' },
    { q: 'Can I port my existing number?',
      a: 'Yes. Porting takes 5–10 business days with zero downtime.' },
    { q: 'How does SMS billing work?',
      a: 'Outbound SMS is $0.01/segment. Inbound is free. Bulk campaigns have volume pricing in your billing page.' },
    { q: 'Does call cost sync to my books?',
      a: 'Yes. Call and SMS costs post automatically to your Insight expense reports.' },
  ],
  support:  'Email: pbx-support@insighthunter.app · 24/7 for Pro customers · Include your account number.',
  docsUrl:  'https://docs.insighthunter.app/pbx',
  appUrl:   'https://pbx.insighthunter.app/',
  pageUrl:  '/features/pbx.html',
});

const bookkeeping = app({
  slug:          'bookkeeping',
  name:          'Bookkeeping',
  icon:          '📒',
  status:        'live',
  category:      'addon',
  tier:          'Add-on',
  price:         'From $49/mo',
  priceMonthly:  4900,
  tenancy:       'Any Plan',
  requiredPlans: ['lite', 'standard', 'pro'],
  desc:          'Automated transaction categorisation, reconciliation, and month-end close — AI-powered with optional certified human review.',
  tags:          ['Bookkeeping', 'Reconciliation', 'Expenses', 'GAAP', 'Month-End'],
  features: [
    'AI transaction categorisation (95%+ accuracy)',
    'Automatic bank & credit card reconciliation',
    'Chart of accounts management',
    'Accounts payable & receivable tracking',
    'Month-end close checklist & automation',
    'Journal entry creation with full audit trail',
    'GAAP-compliant reporting',
    'Export to QuickBooks, Xero, or CSV',
    'Optional certified human bookkeeper review (+$99/mo)',
    'Multi-entity bookkeeping (Pro plan)',
  ],
  faqs: [
    { q: 'How does AI categorisation work?',
      a: 'Trained on millions of SMB transactions. Learns your rules in 30 days and improves from every correction.' },
    { q: 'Can I override AI decisions?',
      a: 'Yes. Click any transaction to reclassify. The model learns from each correction.' },
    { q: 'Is this a replacement for an accountant?',
      a: 'It handles daily bookkeeping automatically. Your accountant gets direct login access — we make their job faster.' },
    { q: 'How does the human review add-on work?',
      a: 'A certified bookkeeper reviews your books monthly and signs off on month-end close. +$99/mo.' },
  ],
  support:  'Email: bookkeeping@insighthunter.app · For reconciliation errors include your date range and account name.',
  docsUrl:  'https://docs.insighthunter.app/bookkeeping',
  appUrl:   'https://bookkeeping.insighthunter.app/',
  pageUrl:  '/features/bookkeeping.html',
});

const payroll = app({
  slug:          'payroll',
  name:          'Payroll',
  icon:          '💰',
  status:        'live',
  category:      'addon',
  tier:          'Add-on',
  price:         'From $39/mo + $6/employee',
  priceMonthly:  3900,
  tenancy:       'Any Plan',
  requiredPlans: ['lite', 'standard', 'pro'],
  desc:          'Full-service payroll with automatic tax filings, direct deposit, contractor payments, and HR document management — all 50 US states.',
  tags:          ['Payroll', 'Tax Filing', 'Direct Deposit', 'HR', 'W-2', '1099'],
  features: [
    'Unlimited payroll runs (weekly, bi-weekly, monthly)',
    'Automatic federal, state & local tax filings (all 50 states)',
    'Direct deposit (2 business days; 1-day on Pro)',
    'Contractor (1099) payments',
    'W-2 and 1099-NEC year-end filing',
    'New hire reporting (all 50 states)',
    'PTO, sick leave & benefits tracking',
    'Employee self-service portal',
    'Payroll entries auto-sync to Bookkeeping app',
    'Off-cycle payroll runs ($15 flat fee)',
  ],
  faqs: [
    { q: 'Which states are supported?',
      a: 'All 50 US states. Multi-state employees fully supported. International payroll coming Q3 2026.' },
    { q: 'What if I need an off-cycle run?',
      a: 'Process an off-cycle run at any time for a $15 flat fee.' },
    { q: 'Does payroll sync with Bookkeeping?',
      a: 'Yes. Entries post automatically with correct GL codes — zero double-entry.' },
    { q: 'Can employees view their own pay stubs?',
      a: 'Yes. Each employee gets a self-service portal for pay stubs, W-2s, and direct deposit updates.' },
  ],
  support:  'Email: payroll@insighthunter.app · Urgent same-day issues: use the phone line shown in your app.',
  docsUrl:  'https://docs.insighthunter.app/payroll',
  appUrl:   'https://payroll.insighthunter.app/',
  pageUrl:  '/features/payroll.html',
});

const scout = app({
  slug:          'scout',
  name:          'Scout',
  icon:          '🔭',
  status:        'live',
  category:      'addon',
  tier:          'Add-on',
  price:         'From $29/mo',
  priceMonthly:  2900,
  tenancy:       'Standard & Pro',
  requiredPlans: ['standard', 'pro'],
  desc:          'AI-powered business intelligence and lead prospecting. Scout monitors your market, surfaces new customers, and tracks competitors automatically.',
  tags:          ['Lead Gen', 'Market Intel', 'Competitors', 'AI Prospecting', 'CRM'],
  features: [
    'Automated lead prospecting by industry & geography',
    'Competitor monitoring (pricing, jobs, press, social)',
    'Market size and TAM/SAM/SOM estimates',
    'Website visitor de-anonymisation',
    'AI-written personalised outreach email drafts',
    'Enriched company & contact data (200M+ records)',
    'CRM push (HubSpot, Salesforce, Pipedrive)',
    'Weekly market intelligence digest email',
    'Custom target account watchlists',
    'GDPR & CCPA compliant data sourcing',
  ],
  faqs: [
    { q: 'Where does Scout get its data?',
      a: 'Public web sources, company filings, LinkedIn signals, and our enrichment database — GDPR and CCPA compliant.' },
    { q: 'Can I export leads?',
      a: 'Yes. Export to CSV or push to your CRM. Bulk exports on the Growth tier.' },
    { q: 'How does competitor monitoring work?',
      a: 'Add competitor domains. Scout tracks pricing pages, job postings, press releases, and social — summarised daily.' },
    { q: 'Why is Scout only on Standard & Pro?',
      a: 'Scout uses your Insight financial data to score leads by deal fit — requires the forecasting engine in Standard+.' },
  ],
  support:  'Email: scout@insighthunter.app · For data accuracy issues include the company name and the error.',
  docsUrl:  'https://docs.insighthunter.app/scout',
  appUrl:   'https://scout.insighthunter.app/',
  pageUrl:  '/features/scout.html',
});

const bizforma = app({
  slug:          'bizforma',
  name:          'Bizforma',
  icon:          '📝',
  status:        'beta',
  category:      'addon',
  tier:          'Add-on',
  price:         'From $19/mo',
  priceMonthly:  1900,
  tenancy:       'Any Plan',
  requiredPlans: ['lite', 'standard', 'pro'],
  desc:          'Smart business document creation — contracts, proposals, NDAs, and HR forms generated by AI, e-signed, and stored in your encrypted vault.',
  tags:          ['Contracts', 'e-Sign', 'Proposals', 'NDA', 'SOW', 'Templates'],
  features: [
    '200+ pre-built legal & business document templates',
    'AI document drafting from plain-language prompts',
    'Built-in e-signature (legally binding in 50+ countries)',
    'Proposal builder with digital acceptance tracking',
    'NDA, SOW, MSA, contractor agreement templates',
    'Automated document expiry & renewal reminders',
    'Secure encrypted document vault (5GB included)',
    'Client portal for document sharing & signing',
    'Full audit trail for every signature and change',
    'DOCX/PDF custom template upload',
  ],
  faqs: [
    { q: 'Are the e-signatures legally binding?',
      a: 'Yes. ESIGN Act (US), eIDAS (EU), and equivalents in 50+ countries. Every document has a tamper-evident audit trail.' },
    { q: 'Can I upload my own templates?',
      a: 'Yes. Upload any DOCX or PDF. Bizforma maps custom fields and makes them fillable and signable automatically.' },
    { q: 'What does "beta" mean?',
      a: 'Core flows (create, send, sign) are production-stable. AI drafting for complex legal docs (equity, term sheets) is still being refined.' },
    { q: 'Is there a storage limit?',
      a: 'Starter includes 5GB encrypted vault. Upgrade to Growth for unlimited storage.' },
  ],
  support:  'Email: bizforma@insighthunter.app · For signing issues include the document ID from your dashboard.',
  docsUrl:  'https://docs.insighthunter.app/bizforma',
  appUrl:   'https://bizforma.insighthunter.app/',
  pageUrl:  '/features/bizforma.html',
});

// ─── Exports ───────────────────────────────────────────────────────────────
export const CORE_APPS:  InsightApp[] = [lite, standard, pro];
export const ADDON_APPS: InsightApp[] = [pbx, bookkeeping, payroll, scout, bizforma];
export const ALL_APPS:   InsightApp[] = [...CORE_APPS, ...ADDON_APPS];

export const APP_MAP: ReadonlyMap<string, InsightApp> =
  new Map(ALL_APPS.map(a => [a.slug, a]));

export function getApp(slug: string): InsightApp | undefined {
  return APP_MAP.get(slug);
}

export function getRelatedApps(slug: string, limit = 3): InsightApp[] {
  const current = APP_MAP.get(slug);
  if (!current) return [];
  return ALL_APPS
    .filter(a => a.slug !== slug)
    .filter(a =>
      a.category === current.category ||
      a.tags.some(t => current.tags.includes(t))
    )
    .slice(0, limit);
}
