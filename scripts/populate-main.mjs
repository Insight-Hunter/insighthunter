#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const repoRoot = process.cwd();
const appRoot = resolve(repoRoot, 'apps/insighthunter-main');

const exists = async (path) => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const isEmpty = async (path) => {
  if (!(await exists(path))) return true;
  return (await readFile(path, 'utf8')).trim().length === 0;
};

const writeIfEmpty = async (relativePath, content) => {
  const target = resolve(appRoot, relativePath);

  if (!(await isEmpty(target))) {
    console.log(`KEEP    ${relativePath}`);
    return;
  }

  if (dryRun) {
    console.log(`WRITE   ${relativePath}`);
    return;
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${content.trim()}\n`, 'utf8');
  console.log(`WROTE   ${relativePath}`);
};

const modulePage = ({ eyebrow, title, description, plan = 'startup', cards }) => `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
import { getSignupUrl } from '../../lib/urls';
---

<MarketingLayout title="${title} | Insight Hunter" description="${description}">
  <section class="wrap module-page">
    <p class="eyebrow">${eyebrow}</p>
    <h1>${title}</h1>
    <p class="lead">${description}</p>

    <div class="module-grid">
      ${cards.map((card) => `<article><h2>${card.title}</h2><p>${card.text}</p></article>`).join('\n      ')}
    </div>

    <a class="btn btn-primary" href={getSignupUrl('${plan}')}>Get started</a>
  </section>
</MarketingLayout>

<style>
  .module-page { padding-block: 5rem; }
  .lead { max-width: 65ch; color: var(--ink-soft); font-size: 1.1rem; }
  .module-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 2rem 0; }
  article { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); padding: 1.5rem; }
  article h2 { font-size: 1.2rem; }
  article p { color: var(--ink-soft); }
  @media (max-width: 760px) { .module-grid { grid-template-columns: 1fr; } }
</style>`;

const files = {
  'src/styles/tokens.css': `
:root {
  --ink: #0f172a;
  --ink-soft: #475569;
  --paper: #ffffff;
  --panel: #f8fafc;
  --line: #dbe4ee;
  --moss: #15803d;
  --amber: #f59e0b;
  --radius: 1rem;
  --wrap: 72rem;
}
`,

  'src/styles/reset.css': `
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
}

img,
svg {
  display: block;
  max-width: 100%;
}

button,
input,
textarea {
  font: inherit;
}
`,

  'src/styles/typography.css': `
body {
  color: var(--ink);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.6;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}

h1,
h2,
h3 {
  color: var(--ink);
  line-height: 1.1;
  letter-spacing: -0.035em;
}

h1 {
  font-size: clamp(2.75rem, 7vw, 5.5rem);
}

h2 {
  font-size: clamp(2rem, 4vw, 3.4rem);
}
`,

  'src/styles/utilities.css': `
.wrap {
  width: min(calc(100% - 2rem), var(--wrap));
  margin-inline: auto;
}

.eyebrow {
  margin-bottom: 0.8rem;
  color: var(--moss);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.btn {
  display: inline-flex;
  min-height: 2.9rem;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-size: 0.92rem;
  font-weight: 800;
  text-decoration: none;
}

.btn-primary {
  background: var(--ink);
  color: var(--paper);
}

.btn-primary:hover {
  background: #1e293b;
}

.btn-ghost {
  border-color: var(--line);
  background: var(--paper);
  color: var(--ink);
}
`,

  'src/styles/global.css': `
@import "./tokens.css";
@import "./reset.css";
@import "./typography.css";
@import "./utilities.css";

body {
  background: var(--paper);
}
`,

  'src/lib/urls.ts': `
const authBaseUrl = import.meta.env.AUTH_BASE_URL || 'https://auth.insighthunter.app';
const dashboardBaseUrl = import.meta.env.DASHBOARD_BASE_URL || 'https://app.insighthunter.app';

export const getSignupUrl = (plan = 'startup'): string =>
  \`\${authBaseUrl}/signup?plan=\${encodeURIComponent(plan)}\`;

export const getLoginUrl = (): string =>
  \`\${authBaseUrl}/login?returnTo=\${encodeURIComponent(\`\${dashboardBaseUrl}/dashboard\`)}\`;
`,

  'src/types/env.d.ts': `
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AUTH_BASE_URL?: string;
  readonly DASHBOARD_BASE_URL?: string;
  readonly STRIPE_SECRET_KEY?: string;
  readonly TURNSTILE_SECRET_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,

  'src/components/SeoHead.astro': `---
interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site || Astro.url.origin).toString();
---

<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:type" content="website" />
<meta property="og:url" content={canonical} />
<meta name="twitter:card" content="summary_large_image" />
`,

  'src/components/SkipLink.astro': `
<a class="skip-link" href="#main-content">Skip to content</a>

<style>
  .skip-link {
    position: fixed;
    z-index: 100;
    top: 1rem;
    left: 1rem;
    transform: translateY(-200%);
    border-radius: 0.5rem;
    background: var(--ink);
    color: white;
    padding: 0.75rem 1rem;
    font-weight: 800;
    text-decoration: none;
  }

  .skip-link:focus {
    transform: translateY(0);
  }
</style>
`,

  'src/components/navigation/Header.astro': `---
import { getLoginUrl, getSignupUrl } from '../../lib/urls';
---

<header class="header">
  <div class="wrap header-inner">
    <a class="brand" href="/">Insight Hunter</a>

    <nav aria-label="Primary navigation">
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/resources">Resources</a>
      <a href="/about">About</a>
    </nav>

    <div class="actions">
      <a href={getLoginUrl()}>Login</a>
      <a class="btn btn-primary" href={getSignupUrl()}>Start free</a>
    </div>
  </div>
</header>

<style>
  .header {
    position: sticky;
    z-index: 20;
    top: 0;
    border-bottom: 1px solid var(--line);
    background: rgb(255 255 255 / 94%);
    backdrop-filter: blur(12px);
  }

  .header-inner {
    display: flex;
    min-height: 4.5rem;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .brand {
    color: var(--ink);
    font-weight: 900;
    text-decoration: none;
  }

  nav,
  .actions {
    display: flex;
    align-items: center;
    gap: 1.1rem;
  }

  nav a,
  .actions > a:not(.btn) {
    color: var(--ink-soft);
    font-size: 0.88rem;
    font-weight: 700;
    text-decoration: none;
  }

  @media (max-width: 700px) {
    nav {
      display: none;
    }

    .actions > a:not(.btn) {
      display: none;
    }
  }
</style>
`,

  'src/components/navigation/Footer.astro': `---
import { getLoginUrl, getSignupUrl } from '../../lib/urls';
---

<footer class="footer">
  <div class="wrap footer-grid">
    <div>
      <a class="brand" href="/">Insight Hunter</a>
      <p>Financial dashboards, forecasts, reporting, and practical next steps for small business.</p>
    </div>

    <div>
      <h2>Platform</h2>
      <a href="/features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/integrations">Integrations</a>
    </div>

    <div>
      <h2>Services</h2>
      <a href="/bookkeeping">Bookkeeping</a>
      <a href="/bizforma">BizForma</a>
      <a href="/payroll">Payroll</a>
      <a href="/reports">Reports</a>
    </div>

    <div>
      <h2>Account</h2>
      <a href={getSignupUrl()}>Start free</a>
      <a href={getLoginUrl()}>Command Center</a>
      <a href="/security">Security</a>
      <a href="/legal/privacy">Privacy</a>
    </div>
  </div>

  <div class="wrap bottom">
    <span>© {new Date().getFullYear()} Insight Hunter</span>
    <a href="/legal/terms">Terms</a>
    <a href="/legal/cookies">Cookies</a>
  </div>
</footer>

<style>
  .footer {
    margin-top: 5rem;
    border-top: 1px solid var(--line);
    background: var(--panel);
    padding-top: 3rem;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 2fr repeat(3, 1fr);
    gap: 2rem;
  }

  .brand {
    color: var(--ink);
    font-weight: 900;
    text-decoration: none;
  }

  .footer p,
  .footer a:not(.brand) {
    color: var(--ink-soft);
    font-size: 0.88rem;
  }

  .footer a:not(.brand) {
    display: block;
    margin-bottom: 0.55rem;
    text-decoration: none;
  }

  .footer h2 {
    font-size: 0.9rem;
    letter-spacing: 0;
  }

  .bottom {
    display: flex;
    gap: 1rem;
    margin-top: 2.5rem;
    border-top: 1px solid var(--line);
    padding-block: 1.25rem;
    color: var(--ink-soft);
    font-size: 0.78rem;
  }

  .bottom a {
    color: inherit;
  }

  @media (max-width: 760px) {
    .footer-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
`,

  'src/layouts/Layout.astro': `---
import '../styles/global.css';
import SeoHead from '../components/SeoHead.astro';
import SkipLink from '../components/SkipLink.astro';
import Header from '../components/navigation/Header.astro';
import Footer from '../components/navigation/Footer.astro';

interface Props {
  title?: string;
  description?: string;
}

const {
  title = 'Insight Hunter | Financial Intelligence for Small Business',
  description = 'Financial dashboards, cash-flow forecasts, reports, and practical business insights.',
} = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <SeoHead title={title} description={description} />
  </head>
  <body>
    <SkipLink />
    <Header />
    <slot />
    <Footer />
  </body>
</html>
`,

  'src/layouts/MarketingLayout.astro': `---
import Layout from './Layout.astro';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
---

<Layout title={title} description={description}>
  <main id="main-content">
    <slot />
  </main>
</Layout>
`,

  'src/pages/features.astro': `---
import MarketingLayout from '../layouts/MarketingLayout.astro';
---

<MarketingLayout
  title="Features | Insight Hunter"
  description="Financial dashboards, cash-flow forecasting, reports, alerts, and decision-ready insights for small business."
>
  <section class="wrap page">
    <p class="eyebrow">Financial intelligence that stays practical</p>
    <h1>More clarity. Less spreadsheet archaeology.</h1>
    <p class="lead">Insight Hunter connects financial visibility, reporting, forecasts, and operating context in one decision-ready platform.</p>

    <div class="grid">
      <article><h2>Cash visibility</h2><p>See cash position, upcoming commitments, and changes that require attention.</p></article>
      <article><h2>Forecasting</h2><p>Identify likely cash pressure early enough to adjust collections, spending, or timing.</p></article>
      <article><h2>Reporting</h2><p>Build recurring reports for owners, advisors, clients, lenders, and stakeholders.</p></article>
      <article><h2>Financial insights</h2><p>Turn underlying activity into focused, practical next steps.</p></article>
    </div>
  </section>
</MarketingLayout>

<style>
  .page { padding-block: 5rem; }
  .lead { max-width: 65ch; color: var(--ink-soft); font-size: 1.1rem; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2rem; }
  article { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); padding: 1.5rem; }
  article h2 { font-size: 1.25rem; }
  article p { color: var(--ink-soft); }
  @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
</style>
`,

  'src/pages/security.astro': `---
import MarketingLayout from '../layouts/MarketingLayout.astro';
---

<MarketingLayout
  title="Security | Insight Hunter"
  description="Learn how Insight Hunter approaches authorization, tenant separation, secure transport, and operational security."
>
  <section class="wrap page">
    <p class="eyebrow">Security and privacy</p>
    <h1>Financial clarity should not compromise privacy.</h1>
    <p class="lead">Insight Hunter is designed around explicit authorization, secure edge infrastructure, and tenant-isolated customer operations.</p>

    <div class="grid">
      <article><h2>Authentication</h2><p>Account authentication and authorization are handled through the dedicated Insight Hunter auth service.</p></article>
      <article><h2>Tenant isolation</h2><p>Customer operations are designed to prevent cross-tenant access and data mixing.</p></article>
      <article><h2>Secure transport</h2><p>Application requests use encrypted HTTPS transport and controlled security policies.</p></article>
      <article><h2>Operational review</h2><p>Security-sensitive activity should be recorded and monitored through controlled operational systems.</p></article>
    </div>
  </section>
</MarketingLayout>

<style>
  .page { padding-block: 5rem; }
  .lead { max-width: 65ch; color: var(--ink-soft); font-size: 1.1rem; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2rem; }
  article { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); padding: 1.5rem; }
  article h2 { font-size: 1.25rem; }
  article p { color: var(--ink-soft); }
  @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
</style>
`,

  'src/pages/integrations.astro': `---
import MarketingLayout from '../layouts/MarketingLayout.astro';

const integrations = [
  ['CSV uploads', 'Start quickly with exports from your existing financial systems.', 'Available now'],
  ['QuickBooks', 'A planned connection for supported accounting workflows.', 'Planned'],
  ['Xero', 'A planned connection for supported accounting workflows.', 'Planned'],
  ['Service partners', 'Payroll, compliance, and communications services through partners.', 'Expanding'],
];
---

<MarketingLayout
  title="Integrations | Insight Hunter"
  description="Start with CSV uploads and expand Insight Hunter with supported accounting and service-partner integrations."
>
  <section class="wrap page">
    <p class="eyebrow">Connect your operation</p>
    <h1>Start with the data you have.</h1>
    <p class="lead">Begin with structured financial exports, then add supported accounting, compliance, payroll, and partner connections as they become available.</p>

    <div class="grid">
      {integrations.map(([title, description, status]) => (
        <article>
          <p class="status">{status}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </article>
      ))}
    </div>
  </section>
</MarketingLayout>

<style>
  .page { padding-block: 5rem; }
  .lead { max-width: 65ch; color: var(--ink-soft); font-size: 1.1rem; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2rem; }
  article { border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); padding: 1.5rem; }
  .status { color: var(--moss); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
  article h2 { font-size: 1.25rem; }
  article p:not(.status) { color: var(--ink-soft); }
  @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
</style>
`,

  'src/pages/500.astro': `---
import MarketingLayout from '../layouts/MarketingLayout.astro';
---

<MarketingLayout title="Something went wrong | Insight Hunter" description="An unexpected error occurred.">
  <section class="wrap page">
    <p class="eyebrow">Error 500</p>
    <h1>Something went wrong.</h1>
    <p>Please try again in a moment. If the issue continues, contact Insight Hunter support.</p>
    <a class="btn btn-primary" href="/">Return home</a>
  </section>
</MarketingLayout>

<style>
  .page { padding-block: 7rem; }
  .page p { max-width: 56ch; color: var(--ink-soft); }
</style>
`,

  'src/pages/bookkeeping/index.astro': modulePage({
    eyebrow: 'Bookkeeping',
    title: 'Cleaner books. Faster decisions.',
    description: 'Use Insight Hunter as the clarity layer around your bookkeeping workflow, reporting needs, and managed-support options.',
    cards: [
      { title: 'Operational visibility', text: 'Translate bookkeeping activity into cash, margin, KPI, and forecast views.' },
      { title: 'Reporting workflows', text: 'Create recurring financial reporting for owners and advisors.' },
      { title: 'Flexible support', text: 'Choose a software-first workflow and add service support as needed.' },
    ],
  }),

  'src/pages/bizforma/index.astro': modulePage({
    eyebrow: 'BizForma',
    title: 'Form with confidence. Stay organized after launch.',
    description: 'BizForma organizes formation tasks, compliance deadlines, and essential business documents in a guided workflow.',
    plan: 'bizforma',
    cards: [
      { title: 'Formation guidance', text: 'Understand the essential sequence of business setup decisions.' },
      { title: 'Compliance visibility', text: 'Keep filing, renewal, and organizational deadlines visible.' },
      { title: 'Document organization', text: 'Maintain an accessible record of key business materials.' },
    ],
  }),

  'src/pages/payroll/index.astro': modulePage({
    eyebrow: 'Payroll',
    title: 'Payroll support when your business is ready to hire.',
    description: 'Insight Hunter is building payroll support through qualified partners, connected to cash planning and financial visibility.',
    cards: [
      { title: 'Partner-led delivery', text: 'Use established payroll systems through qualified providers.' },
      { title: 'Cash-aware planning', text: 'Understand payroll impact on runway and operating commitments.' },
      { title: 'One operating view', text: 'Keep payroll awareness connected to your wider financial picture.' },
    ],
  }),

  'src/pages/reports/index.astro': modulePage({
    eyebrow: 'Reports',
    title: 'Reports that move decisions forward.',
    description: 'Create recurring financial reports that help owners, advisors, clients, and stakeholders understand what matters now.',
    plan: 'standard',
    cards: [
      { title: 'Core reporting', text: 'Create P&L, cash-flow, KPI, and planning-oriented reports.' },
      { title: 'Scheduled delivery', text: 'Build a reporting rhythm without repetitive spreadsheet assembly.' },
      { title: 'Stakeholder-ready exports', text: 'Prepare clean outputs for clients, lenders, and internal leaders.' },
    ],
  }),

  'src/pages/insights/index.astro': modulePage({
    eyebrow: 'Insights',
    title: 'Turn financial data into a practical next step.',
    description: 'Insight Hunter helps identify relevant trends, risks, and decisions so numbers become an operating advantage.',
    plan: 'pro',
    cards: [
      { title: 'Guided signals', text: 'Surface meaningful changes in cash, margins, expenses, and performance.' },
      { title: 'Forward context', text: 'Connect historical activity with cash-flow and operating forecasts.' },
      { title: 'Advisory-ready views', text: 'Support better conversations among owners, bookkeepers, and advisors.' },
    ],
  }),

  'src/pages/pbx/index.astro': modulePage({
    eyebrow: 'PBX and communications',
    title: 'Keep customer communication connected to operations.',
    description: 'The PBX module is designed to connect calling, voicemail, SMS, and customer communication workflows through qualified partners.',
    cards: [
      { title: 'Business calling', text: 'Centralize business phone workflows instead of mixing them with personal devices.' },
      { title: 'Message visibility', text: 'Organize voicemail and SMS activity in one business communication hub.' },
      { title: 'Partner-powered service', text: 'Use proven communications infrastructure while maintaining a unified workflow.' },
    ],
  }),

  'src/pages/resources/index.astro': `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';

const resources = [
  ['/resources/cash-flow-forecasting', 'Cash-flow forecasting for small business', 'Anticipate pressure before it becomes a crisis.'],
  ['/resources/small-business-financial-dashboard', 'What belongs on a financial dashboard', 'Focus financial reporting on real operating decisions.'],
  ['/resources/automated-financial-reporting', 'Automated financial reporting', 'Reduce repetitive spreadsheet work without losing control.'],
  ['/resources/fractional-cfo-tools', 'Tools for fractional CFO workflows', 'Create consistent reporting and planning conversations.'],
];
---

<MarketingLayout title="Resources | Insight Hunter" description="Practical financial operations resources for small-business owners, bookkeepers, and advisors.">
  <section class="wrap page">
    <p class="eyebrow">Financial operations resources</p>
    <h1>Clearer financial thinking for growing businesses.</h1>
    <p class="lead">Practical, plain-English guides on cash flow, reporting, dashboards, and financial advisory workflows.</p>

    <div class="grid">
      {resources.map(([href, title, description]) => (
        <article>
          <h2><a href={href}>{title}</a></h2>
          <p>{description}</p>
          <a class="read" href={href}>Read guide →</a>
        </article>
      ))}
    </div>
  </section>
</MarketingLayout>

<style>
  .page { padding-block: 5rem; }
  .lead { max-width: 65ch; color: var(--ink-soft); font-size: 1.1rem; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 2rem; }
  article { border: 1px solid var(--line); border-radius: var(--radius); padding: 1.5rem; }
  article h2 { font-size: 1.25rem; }
  article h2 a, .read { color: var(--ink); text-decoration: none; }
  article p { color: var(--ink-soft); }
  .read { color: var(--moss); font-weight: 800; }
  @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
</style>
`,

  'src/pages/resources/cash-flow-forecasting.astro': `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---

<MarketingLayout title="Cash-Flow Forecasting for Small Business | Insight Hunter" description="A practical guide to anticipating cash pressure before it becomes an operating crisis.">
  <article class="wrap guide">
    <p class="eyebrow">Financial operations guide</p>
    <h1>Cash-flow forecasting for small business</h1>
    <p class="lead">A forecast is a decision tool: it helps you see potential pressure early enough to change spending, collections, financing, or timing.</p>

    <h2>Start with three inputs</h2>
    <ul>
      <li>Cash available today</li>
      <li>Expected collections by realistic payment date</li>
      <li>Known payroll, bills, debt payments, and operating commitments</li>
    </ul>

    <h2>Review frequently</h2>
    <p>Update short-term forecasts when material invoices, payroll runs, expenses, or sales assumptions change. The goal is faster action, not false precision.</p>
  </article>
</MarketingLayout>

<style>
  .guide { max-width: 52rem; padding-block: 5rem; }
  .lead { color: var(--ink-soft); font-size: 1.15rem; }
  .guide h2 { margin-top: 2.5rem; font-size: 1.65rem; }
</style>
`,

  'src/pages/resources/small-business-financial-dashboard.astro': `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---

<MarketingLayout title="Small-Business Financial Dashboard | Insight Hunter" description="The core metrics that make a financial dashboard useful for business operators.">
  <article class="wrap guide">
    <p class="eyebrow">Financial operations guide</p>
    <h1>What belongs on a small-business financial dashboard</h1>
    <p class="lead">A dashboard should answer the questions an owner actually has: Do we have enough cash? Are margins moving? Can we fund the next commitment?</p>

    <h2>Core metrics</h2>
    <ul>
      <li>Cash position and projected runway</li>
      <li>Revenue and gross-margin trend</li>
      <li>Operating-expense trend</li>
      <li>Accounts receivable aging</li>
      <li>Upcoming payroll, debt, and major bills</li>
    </ul>

    <h2>Avoid vanity metrics</h2>
    <p>Show fewer metrics, but make each one useful for an operating decision. A financial dashboard should reduce uncertainty rather than add reporting work.</p>
  </article>
</MarketingLayout>

<style>
  .guide { max-width: 52rem; padding-block: 5rem; }
  .lead { color: var(--ink-soft); font-size: 1.15rem; }
  .guide h2 { margin-top: 2.5rem; font-size: 1.65rem; }
</style>
`,

  'src/pages/resources/automated-financial-reporting.astro': `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---

<MarketingLayout title="Automated Financial Reporting | Insight Hunter" description="How recurring reporting helps businesses spend less time assembling spreadsheets and more time making decisions.">
  <article class="wrap guide">
    <p class="eyebrow">Financial operations guide</p>
    <h1>Automated financial reporting</h1>
    <p class="lead">The purpose of automation is not simply sending reports faster. It is delivering consistent information with the context needed to make better decisions.</p>

    <h2>Start with the essentials</h2>
    <ul>
      <li>Profit and loss statement</li>
      <li>Cash-flow summary and forecast</li>
      <li>Key performance indicators</li>
      <li>Receivables and payables review</li>
    </ul>

    <h2>Keep a review step</h2>
    <p>Automation can assemble and distribute recurring information, but owners and advisors should still review unusual movements before taking action.</p>
  </article>
</MarketingLayout>

<style>
  .guide { max-width: 52rem; padding-block: 5rem; }
  .lead { color: var(--ink-soft); font-size: 1.15rem; }
  .guide h2 { margin-top: 2.5rem; font-size: 1.65rem; }
</style>
`,

  'src/pages/resources/fractional-cfo-tools.astro': `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---

<MarketingLayout title="Fractional CFO Tools | Insight Hunter" description="A practical approach for advisors to create repeatable financial visibility across client engagements.">
  <article class="wrap guide">
    <p class="eyebrow">Financial operations guide</p>
    <h1>Tools for fractional CFO workflows</h1>
    <p class="lead">Fractional CFO work becomes easier to scale when every client has a consistent cadence for data intake, reporting, forecast review, and action tracking.</p>

    <h2>Standardize the operating cadence</h2>
    <ul>
      <li>Recurring financial-data intake</li>
      <li>Monthly reporting package</li>
      <li>Cash-flow forecast update</li>
      <li>KPI and variance review</li>
      <li>Prioritized business actions</li>
    </ul>

    <h2>Connect advice to data</h2>
    <p>Advisory is more valuable when each recommendation relates to an observable financial signal, forecast, or operating decision.</p>
  </article>
</MarketingLayout>

<style>
  .guide { max-width: 52rem; padding-block: 5rem; }
  .lead { color: var(--ink-soft); font-size: 1.15rem; }
  .guide h2 { margin-top: 2.5rem; font-size: 1.65rem; }
</style>
`,
};

console.log(`Insight Hunter placeholder population — ${dryRun ? 'dry-run' : 'apply'}`);
console.log(`App root: ${appRoot}\n`);

for (const [relativePath, content] of Object.entries(files)) {
  await writeIfEmpty(relativePath, content);
}

console.log(`\nComplete. ${dryRun ? 'No files changed.' : 'Empty placeholders were populated.'}`);


for (const [relativePath, content] of Object.entries(files)) {
  await writeIfEmpty(relativePath, content);
}

