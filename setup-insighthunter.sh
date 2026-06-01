#!/usr/bin/env bash
# =============================================================================
# InsightHunter — Full File Setup Script
# Run from the ROOT of your monorepo:  bash setup-insighthunter.sh
# =============================================================================
set -euo pipefail

CYAN='\033[0;36m'; GOLD='\033[0;33m'; GREEN='\033[0;32m'; RESET='\033[0m'
log()  { echo -e "${CYAN}[IH]${RESET} $*"; }
ok()   { echo -e "${GREEN}[OK]${RESET} $*"; }
head() { echo -e "\n${GOLD}══ $* ══${RESET}"; }

head "Creating directory structure"
mkdir -p insighthunter-main/src/{pages/auth,components/{marketing,auth,shared},layouts,data,lib,styles,middleware,types}
mkdir -p insighthunter-main/public/{icons,fonts,og}
mkdir -p insighthunter-main/functions/api
mkdir -p insighthunter-dispatch/src
ok "Directories ready"

# =============================================================================
# insighthunter-main — root config files
# =============================================================================
head "Writing insighthunter-main config files"

cat > insighthunter-main/package.json << 'EOF'
{
  "name": "insighthunter-main",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":    "astro dev",
    "build":  "astro build",
    "preview":"wrangler pages dev dist",
    "deploy": "astro build && wrangler pages deploy dist --project-name insighthunter-main"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^11.2.0",
    "@astrojs/svelte":     "^4.0.0",
    "@astrojs/tailwind":   "^5.1.5",
    "astro":               "^4.16.19",
    "svelte":              "^4.2.18",
    "tailwindcss":         "^3.4.19"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260518.1",
    "typescript": "^5.9.3"
  }
}
EOF

cat > insighthunter-main/astro.config.mjs << 'EOF'
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'directory',
    functionPerRoute: false,
  }),
  integrations: [
    svelte(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    ssr: { noExternal: ['svelte'] },
  },
});
EOF

cat > insighthunter-main/tailwind.config.mjs << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,svelte}'],
  theme: { extend: {} },
  plugins: [],
};
EOF

cat > insighthunter-main/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ESNext","DOM"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*","functions/**/*"],
  "exclude": ["node_modules","dist"]
}
EOF

cat > insighthunter-main/wrangler.jsonc << 'EOF'
{
  "name": "insighthunter-main",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 },
  "services": [
    { "binding": "DISPATCH_WORKER", "service": "insighthunter-dispatch" }
  ],
  "kv_namespaces": [
    { "binding": "SESSIONS",  "id": "REPLACE_WITH_YOUR_KV_ID", "preview_id": "REPLACE_WITH_YOUR_KV_PREVIEW_ID" }
  ],
  "analytics_engine_datasets": [
    { "binding": "PAGE_VIEWS", "dataset": "ih_page_views" }
  ],
  "vars": {
    "PUBLIC_APP_URL": "https://insighthunter.app",
    "DISPATCH_URL":   "https://dispatch.insighthunter.app",
    "AUTH_URL":       "https://auth.insighthunter.app"
  }
}
EOF

cat > insighthunter-main/public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" fill="none">
  <path d="M14 2C14 2 8 8 8 14C8 18.4 10.8 22 14 22C17.2 22 20 18.4 20 14C20 10 18 7 18 7C18 7 17 12 14 12C11 12 12 8 14 2Z" fill="#C9A84C"/>
  <path d="M14 26L11 22H17L14 26Z" fill="#C9A84C"/>
  <path d="M14 16L18 12" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
  <path d="M16 12H18V14" stroke="#C9A84C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF

ok "Root config files written"

# =============================================================================
# insighthunter-main — src/data
# =============================================================================
head "Writing src/data"

cat > insighthunter-main/src/data/pricing.ts << 'EOF'
export const tiers = [
  {
    id: 'lite' as const,
    name: 'Insight Lite',
    price: 0,
    annualPrice: 0,
    badge: null,
    description: 'Perfect for getting started — no card required.',
    features: [
      'Basic bookkeeping (up to 150 txns/mo)',
      'P&L statement',
      'Cash flow overview',
      'BizForma: 1 business setup',
      '1 user',
    ],
  },
  {
    id: 'standard' as const,
    name: 'Insight Standard',
    price: 49,
    annualPrice: 470,
    badge: 'Most Popular',
    description: 'Everything growing businesses need to run lean and smart.',
    features: [
      'Full bookkeeping (unlimited txns)',
      'Bank sync (Plaid)',
      'Payroll (up to 5 employees)',
      'AI CFO insights',
      'Financial reports + export',
      'Scout CRM (50 leads)',
      '3 users',
    ],
  },
  {
    id: 'pro' as const,
    name: 'Insight Pro',
    price: 129,
    annualPrice: 1238,
    badge: null,
    description: 'The full operating system for high-velocity operators.',
    features: [
      'Everything in Standard',
      'Unlimited employees + payroll runs',
      'PBX phone system (10 extensions)',
      'Advanced AI forecasting',
      'Scout CRM (unlimited)',
      'White-label reports',
      'API access',
      'Priority support',
      'Unlimited users',
    ],
  },
];

export const addons = [
  { id: 'pbx',            name: 'PBX Add-On',                price: 29,  description: 'Add a cloud phone system to any plan' },
  { id: 'payroll-extra',  name: 'Payroll Extra Employees',    price: 6,   description: 'Per additional employee beyond plan limit' },
  { id: 'whitelabel',     name: 'White Label',                price: 199, description: 'Fully branded reports and dashboards' },
  { id: 'report',         name: 'Report Builder',             price: 19,  description: 'Custom report templates and exports' },
  { id: 'bizforma-extra', name: 'BizForma Extra Filings',     price: 49,  description: 'Additional business formation filings' },
  { id: 'website-services',name:'Website Services',           price: 79,  description: 'Managed landing page + hosting' },
];

export const pricingTiers = tiers;
EOF

cat > insighthunter-main/src/data/apps.ts << 'EOF'
export interface App {
  slug: string;
  name: string;
  description: string;
  tier: string;
  icon: string;
}

export const apps: App[] = [
  { slug:'bookkeeping',       name:'Bookkeeping',       description:'Automated transaction categorization, reconciliation, and real-time P&L.',               tier:'Core',    icon:'📒' },
  { slug:'payroll',           name:'Payroll',           description:'Run payroll, manage W-2s and 1099s, and track employer costs.',                          tier:'Standard',icon:'💸' },
  { slug:'bizforma',          name:'BizForma',          description:'AI-assisted business formation wizard — LLC, S-Corp, C-Corp.',                           tier:'Core',    icon:'🏛️' },
  { slug:'scout',             name:'Scout CRM',         description:'Lightweight CRM for tracking leads, deals, and revenue pipeline.',                       tier:'Standard',icon:'🔭' },
  { slug:'pbx',               name:'PBX Phone',         description:'Cloud phone system with extensions, IVR, and call recording.',                          tier:'Pro',     icon:'📞' },
  { slug:'website-services',  name:'Website Services',  description:'Managed landing pages, hosting, and conversion optimization.',                          tier:'Add-On',  icon:'🌐' },
];
EOF

ok "Data files written"

# =============================================================================
# insighthunter-main — src/layouts
# =============================================================================
head "Writing layouts"

cat > insighthunter-main/src/layouts/MarketingLayout.astro << 'ASTROEOF'
---
export interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
}
const {
  title = 'Insight Hunter',
  description = 'AI-powered financial insights for small businesses. Stop flying blind.',
  ogImage = '/og/home.png',
} = Astro.props;
const fullTitle = title.includes('Insight Hunter') ? title : `${title} | Insight Hunter`;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{fullTitle}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={fullTitle} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
  <link href="https://api.fontshare.com/v2/css?f[]=general-sans@700,600,400&f[]=satoshi@400,500&display=swap" rel="stylesheet" />
</head>
<body>
<header class="nav" id="site-nav">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Insight Hunter home">
      <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 2C14 2 8 8 8 14C8 18.4 10.8 22 14 22C17.2 22 20 18.4 20 14C20 10 18 7 18 7C18 7 17 12 14 12C11 12 12 8 14 2Z" fill="#C9A84C"/>
        <path d="M14 26L11 22H17L14 26Z" fill="#C9A84C"/>
        <path d="M14 16L18 12" stroke="#C9A84C" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 12H18V14" stroke="#C9A84C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Insight Hunter</span>
    </a>
    <nav class="nav-links" aria-label="Main navigation">
      <a href="/#features">Features</a>
      <a href="/pricing">Pricing</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
    <div class="nav-actions">
      <a href="/auth/login" class="nav-login">Sign In</a>
      <a href="/auth/register" class="nav-signup">Start Free</a>
    </div>
    <button class="nav-burger" id="nav-burger" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
  </div>
  <div class="nav-mobile" id="nav-mobile" aria-hidden="true">
    <a href="/#features">Features</a>
    <a href="/pricing">Pricing</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
    <hr />
    <a href="/auth/login" class="mobile-login">Sign In</a>
    <a href="/auth/register" class="mobile-signup">Start Free — No Card Required</a>
  </div>
</header>
<main id="main-content"><slot /></main>
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <a href="/" class="footer-logo">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <path d="M14 2C14 2 8 8 8 14C8 18.4 10.8 22 14 22C17.2 22 20 18.4 20 14C20 10 18 7 18 7C18 7 17 12 14 12C11 12 12 8 14 2Z" fill="#C9A84C"/>
          <path d="M14 26L11 22H17L14 26Z" fill="#C9A84C"/>
        </svg>
        <span>Insight Hunter</span>
      </a>
      <p class="footer-tagline">Stop flying blind.<br />Know your numbers.</p>
    </div>
    <div class="footer-cols">
      <div class="footer-col">
        <h4>Platform</h4>
        <a href="/bookkeeping">Bookkeeping</a>
        <a href="/payroll">Payroll</a>
        <a href="/bizforma">BizForma</a>
        <a href="/scout">Scout CRM</a>
        <a href="/pbx">PBX Phone</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="/about">About</a>
        <a href="/pricing">Pricing</a>
        <a href="/contact">Contact</a>
      </div>
      <div class="footer-col">
        <h4>Account</h4>
        <a href="/auth/register">Create Account</a>
        <a href="/auth/login">Sign In</a>
        <a href="/pricing">View Plans</a>
      </div>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; {new Date().getFullYear()} Insight Hunter. All rights reserved.</span>
    <div class="footer-legal">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
    </div>
  </div>
</footer>
<script>
  const burger = document.getElementById('nav-burger');
  const mobile = document.getElementById('nav-mobile');
  burger?.addEventListener('click', () => {
    const open = mobile?.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    mobile?.setAttribute('aria-hidden', String(!open));
  });
  mobile?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobile.classList.remove('open');
    burger?.setAttribute('aria-expanded', 'false');
  }));
  const nav = document.getElementById('site-nav');
  window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', window.scrollY > 8), { passive: true });
</script>
</body>
</html>
<style is:global>
  :root {
    --bg:#070C1A; --bg-deep:#04060F; --bg-navy:#0C1222;
    --surface:#101828; --surface-alt:#141F32; --card:#141F32;
    --border:rgba(44,66,104,0.55); --border-dim:rgba(28,44,72,0.50);
    --border-cyan:rgba(0,184,224,0.22); --border-gold:rgba(201,168,76,0.20);
    --gold:#C9A84C; --gold-light:#E8C97A; --gold-dim:#8A6E28;
    --cyan:#22C8EF; --cyan-bright:#4DD6F7; --cyan-deep:#00B8E0;
    --cyan-text:#7EE0F5; --cyan-glow:rgba(0,200,239,0.16);
    --white:#EEF2FF; --muted:#7A8FAD; --subtle:#4D6280;
    --success:#3FCF8E; --danger:#E05252; --warning:#F0B429;
    --font-display:'General Sans','Inter',sans-serif;
    --font-body:'Satoshi','Inter',sans-serif;
    --radius-sm:8px; --radius-card:16px; --radius-xl:24px;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--white);font-family:var(--font-body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
  h1,h2,h3,h4,h5,h6{font-family:var(--font-display);font-weight:700;line-height:1.15;color:var(--white)}
  a{color:inherit;text-decoration:none}
  img{max-width:100%;height:auto;display:block}
  button{font-family:inherit;cursor:pointer;border:none}
  .container{max-width:1180px;margin:0 auto;padding:0 24px}
  .section{padding:80px 0}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 24px;border-radius:var(--radius-sm);font-weight:700;font-size:0.95rem;transition:all 0.18s ease;cursor:pointer;white-space:nowrap}
  .btn-gold{background:var(--gold);color:#111}
  .btn-gold:hover{background:var(--gold-light);transform:translateY(-1px)}
  .btn-outline{border:1px solid var(--border);color:var(--white);background:transparent}
  .btn-outline:hover{border-color:var(--cyan);color:var(--cyan)}
  .card{background:var(--card);border:1px solid var(--border-dim);border-radius:var(--radius-card);padding:24px;transition:border-color 0.18s,box-shadow 0.18s}
  .card:hover{border-color:var(--border-cyan);box-shadow:0 0 0 1px var(--border-cyan),0 4px 24px rgba(0,200,239,0.07)}
  .eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;color:var(--cyan-text);background:rgba(0,200,239,0.06);border:1px solid var(--border-cyan);border-radius:100px;padding:4px 14px;margin-bottom:16px}
  .section-head{text-align:center;max-width:680px;margin:0 auto 56px}
  .section-head h2{font-size:clamp(1.8rem,4vw,2.8rem);margin-bottom:16px}
  .section-head p{color:var(--muted);font-size:1.05rem}
  .form-group{display:flex;flex-direction:column;gap:6px}
  .form-label{font-size:0.85rem;font-weight:600;color:var(--muted)}
  .form-input{background:var(--surface);border:1px solid var(--border);color:var(--white);padding:12px 16px;border-radius:var(--radius-sm);font-size:0.95rem;font-family:var(--font-body);transition:border-color 0.18s,box-shadow 0.18s;width:100%}
  .form-input:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,200,239,0.12)}
  .form-input::placeholder{color:var(--subtle)}
  .section--navy{background:var(--bg-navy)}
</style>
<style>
  .nav{position:sticky;top:0;z-index:200;background:rgba(4,6,15,0.82);backdrop-filter:blur(16px);border-bottom:1px solid var(--border-dim);transition:box-shadow 0.2s}
  .nav.scrolled{box-shadow:0 4px 32px rgba(0,0,0,0.5)}
  .nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;height:64px;display:flex;align-items:center;gap:32px}
  .nav-logo{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:700;font-size:1.05rem;color:var(--white);flex-shrink:0}
  .nav-links{display:flex;gap:28px;flex:1}
  .nav-links a{color:var(--muted);font-size:0.9rem;font-weight:500;transition:color 0.18s}
  .nav-links a:hover{color:var(--white)}
  .nav-actions{display:flex;align-items:center;gap:12px;margin-left:auto}
  .nav-login{color:var(--muted);font-size:0.875rem;font-weight:500;padding:8px 14px;transition:color 0.18s}
  .nav-login:hover{color:var(--white)}
  .nav-signup{background:var(--gold);color:#111;font-weight:700;font-size:0.875rem;padding:9px 18px;border-radius:var(--radius-sm);transition:background 0.18s,transform 0.18s}
  .nav-signup:hover{background:var(--gold-light);transform:translateY(-1px)}
  .nav-burger{display:none;flex-direction:column;gap:5px;padding:8px;background:none;border:none;cursor:pointer;margin-left:auto}
  .nav-burger span{display:block;width:22px;height:2px;background:var(--white);border-radius:2px}
  .nav-mobile{display:none;flex-direction:column;padding:16px 24px 24px;border-top:1px solid var(--border-dim);background:var(--bg-deep)}
  .nav-mobile a{padding:12px 0;color:var(--muted);font-weight:500;border-bottom:1px solid var(--border-dim);transition:color 0.18s}
  .nav-mobile a:hover{color:var(--white)}
  .nav-mobile hr{border:none;border-top:1px solid var(--border-dim);margin:8px 0}
  .nav-mobile .mobile-signup{margin-top:8px;background:var(--gold);color:#111;font-weight:700;text-align:center;padding:13px;border-radius:var(--radius-sm);border-bottom:none}
  @media(max-width:768px){.nav-links,.nav-actions{display:none}.nav-burger{display:flex}.nav-mobile.open{display:flex}}
  .footer{background:var(--bg-deep);border-top:1px solid var(--border-dim);padding:64px 24px 32px}
  .footer-inner{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:1fr auto;gap:48px;margin-bottom:48px}
  .footer-brand{max-width:260px}
  .footer-logo{display:flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;font-size:1rem;color:var(--white);margin-bottom:12px}
  .footer-tagline{color:var(--muted);font-size:0.875rem;line-height:1.6}
  .footer-cols{display:flex;gap:48px}
  .footer-col{display:flex;flex-direction:column;gap:10px;min-width:120px}
  .footer-col h4{font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
  .footer-col a{color:var(--muted);font-size:0.875rem;transition:color 0.18s}
  .footer-col a:hover{color:var(--white)}
  .footer-bottom{max-width:1180px;margin:0 auto;padding-top:24px;border-top:1px solid var(--border-dim);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;color:var(--subtle);font-size:0.8rem}
  .footer-legal{display:flex;gap:20px}
  .footer-legal a{color:var(--subtle);transition:color 0.18s}
  .footer-legal a:hover{color:var(--muted)}
  @media(max-width:768px){.footer-inner{grid-template-columns:1fr}.footer-cols{flex-wrap:wrap;gap:32px}.footer-bottom{flex-direction:column;text-align:center}}
</style>
ASTROEOF

ok "MarketingLayout written"

# AuthLayout
cat > insighthunter-main/src/layouts/AuthLayout.astro << 'ASTROEOF'
---
export interface Props { title: string; description?: string; }
const { title, description = 'Sign in to Insight Hunter' } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} | Insight Hunter</title>
  <meta name="description" content={description} />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://api.fontshare.com" crossorigin />
  <link href="https://api.fontshare.com/v2/css?f[]=general-sans@700,600,400&f[]=satoshi@400,500&display=swap" rel="stylesheet" />
</head>
<body>
<header class="auth-nav">
  <a href="/" class="auth-logo">
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
      <path d="M14 2C14 2 8 8 8 14C8 18.4 10.8 22 14 22C17.2 22 20 18.4 20 14C20 10 18 7 18 7C18 7 17 12 14 12C11 12 12 8 14 2Z" fill="#C9A84C"/>
      <path d="M14 26L11 22H17L14 26Z" fill="#C9A84C"/>
    </svg>
    <span>Insight Hunter</span>
  </a>
</header>
<main class="auth-main">
  <div class="auth-glow" aria-hidden="true"></div>
  <slot />
</main>
</body>
</html>
<style is:global>
  :root{--bg:#070C1A;--bg-deep:#04060F;--surface:#101828;--surface-alt:#141F32;--card:#141F32;--border:rgba(44,66,104,0.55);--border-dim:rgba(28,44,72,0.50);--border-cyan:rgba(0,184,224,0.22);--gold:#C9A84C;--gold-light:#E8C97A;--cyan:#22C8EF;--cyan-text:#7EE0F5;--white:#EEF2FF;--muted:#7A8FAD;--subtle:#4D6280;--success:#3FCF8E;--danger:#E05252;--font-display:'General Sans','Inter',sans-serif;--font-body:'Satoshi','Inter',sans-serif;--radius-sm:8px;--radius-card:16px}
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--white);font-family:var(--font-body);font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-family:var(--font-display);font-weight:700}
  a{color:inherit;text-decoration:none}
  button{font-family:inherit;cursor:pointer;border:none}
  .form-group{display:flex;flex-direction:column;gap:6px}
  .form-label{font-size:0.85rem;font-weight:600;color:var(--muted)}
  .form-input{background:var(--surface);border:1px solid var(--border);color:var(--white);padding:12px 16px;border-radius:var(--radius-sm);font-size:0.95rem;font-family:var(--font-body);transition:border-color 0.18s,box-shadow 0.18s;width:100%}
  .form-input:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,200,239,0.12)}
  .form-input::placeholder{color:var(--subtle)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:13px 24px;border-radius:var(--radius-sm);font-weight:700;font-size:0.95rem;transition:all 0.18s;cursor:pointer}
  .btn-gold{background:var(--gold);color:#111}
  .btn-gold:hover{background:var(--gold-light);transform:translateY(-1px)}
</style>
<style>
  .auth-nav{height:60px;display:flex;align-items:center;padding:0 24px;border-bottom:1px solid var(--border-dim);background:var(--bg-deep)}
  .auth-logo{display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:700;font-size:1rem;color:var(--white)}
  .auth-main{min-height:calc(100vh - 60px);display:flex;align-items:center;justify-content:center;padding:40px 24px;position:relative;overflow:hidden}
  .auth-glow{position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:400px;background:radial-gradient(ellipse,rgba(201,168,76,0.07) 0%,transparent 70%);pointer-events:none}
</style>
ASTROEOF

ok "AuthLayout written"

# =============================================================================
# Marketing components
# =============================================================================
head "Writing marketing components"

cat > insighthunter-main/src/components/marketing/Hero.astro << 'ASTROEOF'
---
---
<section class="hero">
  <div class="hero-bg" aria-hidden="true">
    <div class="hero-glow-gold"></div><div class="hero-glow-cyan"></div><div class="hero-grid"></div>
  </div>
  <div class="hero-inner container">
    <div class="hero-eyebrow-wrap"><span class="hero-eyebrow">AI-Powered Financial Intelligence</span></div>
    <h1 class="hero-headline">Stop flying blind.<br /><span class="hero-headline-gold">Know your numbers.</span></h1>
    <p class="hero-sub">Insight Hunter gives small businesses enterprise-grade bookkeeping, payroll, cash-flow forecasting, and an AI CFO — all in one Cloudflare-native platform built for speed and data isolation.</p>
    <div class="hero-actions">
      <a href="/auth/register" class="hero-cta-primary">Start Free — No Card Required</a>
      <a href="/pricing" class="hero-cta-ghost">See pricing &rarr;</a>
    </div>
    <div class="hero-trust">
      <span class="trust-badge">✓ Cloudflare-native · Global Edge</span>
      <span class="trust-badge">✓ Per-tenant data isolation</span>
      <span class="trust-badge">✓ SOC 2 ready architecture</span>
    </div>
    <div class="hero-stats">
      <div class="stat"><span class="stat-val">$2.4M+</span><span class="stat-label">Transactions processed</span></div>
      <div class="stat-divider" aria-hidden="true"></div>
      <div class="stat"><span class="stat-val">&lt; 50ms</span><span class="stat-label">Global edge latency</span></div>
      <div class="stat-divider" aria-hidden="true"></div>
      <div class="stat"><span class="stat-val">9 apps</span><span class="stat-label">Built-in, ready to use</span></div>
    </div>
  </div>
</section>
<style>
.hero{min-height:92vh;display:flex;align-items:center;position:relative;overflow:hidden;padding:80px 0 60px;background:var(--bg-navy)}
.hero-bg{position:absolute;inset:0;pointer-events:none}
.hero-glow-gold{position:absolute;top:-80px;left:50%;transform:translateX(-50%);width:900px;height:500px;background:radial-gradient(ellipse,rgba(201,168,76,0.10) 0%,transparent 60%)}
.hero-glow-cyan{position:absolute;bottom:-60px;right:-100px;width:600px;height:400px;background:radial-gradient(ellipse,rgba(0,200,239,0.07) 0%,transparent 65%)}
.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(44,66,104,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(44,66,104,0.10) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 80% 60% at 50% 50%,black 20%,transparent 80%)}
.hero-inner{position:relative;text-align:center;display:flex;flex-direction:column;align-items:center}
.hero-eyebrow-wrap{margin-bottom:24px}
.hero-eyebrow{display:inline-block;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--cyan-text);background:rgba(0,200,239,0.06);border:1px solid rgba(0,184,224,0.25);border-radius:100px;padding:5px 16px}
.hero-headline{font-size:clamp(2.6rem,7vw,4.4rem);line-height:1.1;margin-bottom:24px;max-width:820px}
.hero-headline-gold{color:var(--gold)}
.hero-sub{font-size:clamp(1rem,2vw,1.15rem);color:var(--muted);max-width:620px;line-height:1.75;margin-bottom:40px}
.hero-actions{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:28px}
.hero-cta-primary{background:var(--gold);color:#111;font-weight:700;font-size:0.975rem;padding:15px 28px;border-radius:var(--radius-sm);transition:background 0.18s,transform 0.18s;display:inline-flex;align-items:center}
.hero-cta-primary:hover{background:var(--gold-light);transform:translateY(-2px)}
.hero-cta-ghost{border:1px solid var(--border);color:var(--white);font-size:0.975rem;font-weight:600;padding:15px 24px;border-radius:var(--radius-sm);transition:border-color 0.18s,color 0.18s;display:inline-flex;align-items:center}
.hero-cta-ghost:hover{border-color:var(--cyan);color:var(--cyan)}
.hero-trust{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:48px}
.trust-badge{font-size:11px;color:var(--subtle);padding:4px 10px;border:1px solid var(--border-dim);border-radius:4px}
.hero-stats{display:flex;align-items:center;background:var(--surface);border:1px solid var(--border-dim);border-radius:var(--radius-card);padding:24px 40px;width:fit-content;flex-wrap:wrap;justify-content:center}
.stat{text-align:center;padding:0 28px}
.stat-val{display:block;font-family:var(--font-display);font-size:1.6rem;font-weight:700;color:var(--cyan);margin-bottom:4px}
.stat-label{font-size:0.8rem;color:var(--muted)}
.stat-divider{width:1px;height:40px;background:var(--border-dim)}
@media(max-width:600px){.hero-stats{padding:16px 20px}.stat{padding:8px 16px}.stat-divider{display:none}}
</style>
ASTROEOF

cat > insighthunter-main/src/components/marketing/FeatureGrid.astro << 'ASTROEOF'
---
const features = [
  { icon:'📒', title:'Automated Bookkeeping',  desc:'Transactions auto-categorized, bank-synced (Plaid), and reconciled in real-time. P&L, balance sheet, and cash flow always current.' },
  { icon:'🤖', title:'AI CFO Insights',        desc:'Your AI CFO surfaces anomalies, cash-flow risks, and growth opportunities — before they become problems.' },
  { icon:'💸', title:'Payroll',                desc:'Run payroll for W-2 employees and 1099 contractors. Automatic tax calculations, pay stubs, and employer cost tracking.' },
  { icon:'🏛️', title:'BizForma',              desc:'AI-guided business formation for LLC, S-Corp, and C-Corp. File Articles of Organization right from your dashboard.' },
  { icon:'🔭', title:'Scout CRM',             desc:'Lightweight CRM that keeps your pipeline organized. Track leads, deals, and revenue without the enterprise bloat.' },
  { icon:'📞', title:'PBX Phone System',       desc:'Cloud phone system with call routing, IVR, voicemail-to-email, and per-tenant Twilio subaccount isolation.' },
];
---
<section class="features section section--navy" id="features">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Platform</span>
      <h2>One platform, focused apps.</h2>
      <p>Launch with the tools you need today, then expand into the full finance stack as your business grows.</p>
    </div>
    <div class="features-grid">
      {features.map((f) => (
        <article class="feature-card card">
          <div class="feature-icon" aria-hidden="true">{f.icon}</div>
          <h3>{f.title}</h3><p>{f.desc}</p>
        </article>
      ))}
    </div>
  </div>
</section>
<style>
.features{background:var(--bg-navy)}
.features-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.feature-card{padding:28px}
.feature-icon{font-size:1.8rem;margin-bottom:14px;display:block}
.feature-card h3{font-size:1.05rem;margin-bottom:10px}
.feature-card p{font-size:0.875rem;color:var(--muted);line-height:1.65}
</style>
ASTROEOF

cat > insighthunter-main/src/components/marketing/Testimonials.astro << 'ASTROEOF'
---
const testimonials = [
  { quote:"Finally a finance platform that doesn't require a CPA to operate. The AI CFO flagged a cash-flow gap three weeks before it would have hit — saved us.", name:'Sarah K.', role:'Founder, Meridian Consulting', avatar:'SK' },
  { quote:"We replaced QuickBooks, Gusto, and our old phone system all in one move. The savings alone paid for Insight Pro in the first month.", name:'Marcus T.', role:'COO, Brightline Logistics', avatar:'MT' },
  { quote:"BizForma got our LLC filed in 20 minutes. The bookkeeping auto-categorized 4 years of bank history overnight.", name:'Priya N.', role:'Owner, Bloom Creative Studio', avatar:'PN' },
];
---
<section class="testimonials section section--navy">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Customer Stories</span>
      <h2>Operators who stopped flying blind.</h2>
    </div>
    <div class="testi-grid">
      {testimonials.map((t) => (
        <article class="testi-card card">
          <blockquote class="testi-quote">"{t.quote}"</blockquote>
          <div class="testi-author">
            <div class="testi-avatar" aria-hidden="true">{t.avatar}</div>
            <div><div class="testi-name">{t.name}</div><div class="testi-role">{t.role}</div></div>
          </div>
        </article>
      ))}
    </div>
  </div>
</section>
<style>
.testimonials{background:var(--bg-navy)}
.testi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px}
.testi-card{padding:28px;display:flex;flex-direction:column;gap:20px}
.testi-quote{font-size:0.95rem;line-height:1.7;color:var(--muted);flex:1;font-style:italic}
.testi-author{display:flex;align-items:center;gap:12px}
.testi-avatar{width:38px;height:38px;background:linear-gradient(135deg,var(--gold-dim),var(--gold));color:#111;font-size:0.75rem;font-weight:800;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.testi-name{font-size:0.875rem;font-weight:700;color:var(--white)}
.testi-role{font-size:0.78rem;color:var(--subtle)}
</style>
ASTROEOF

cat > insighthunter-main/src/components/marketing/CTABanner.astro << 'ASTROEOF'
---
export interface Props { title?: string; text?: string; cta?: { href: string; label: string }; }
const { title='Ready to know your numbers?', text='Join thousands of small businesses running smarter with Insight Hunter.', cta={ href:'/auth/register', label:'Start Free — No Card Required' } } = Astro.props;
---
<section class="cta-banner section">
  <div class="cta-glow" aria-hidden="true"></div>
  <div class="container cta-inner">
    <h2>{title}</h2><p>{text}</p>
    <div class="cta-actions">
      <a href={cta.href} class="btn btn-gold cta-btn">{cta.label}</a>
      <a href="/pricing" class="btn btn-outline">View pricing</a>
    </div>
  </div>
</section>
<style>
.cta-banner{position:relative;background:var(--bg);text-align:center;overflow:hidden}
.cta-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:400px;background:radial-gradient(ellipse,rgba(201,168,76,0.10) 0%,transparent 65%);pointer-events:none}
.cta-inner{position:relative;max-width:640px}
h2{font-size:clamp(1.8rem,4vw,2.4rem);margin-bottom:16px}
p{color:var(--muted);font-size:1.05rem;margin-bottom:36px}
.cta-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.cta-btn{font-size:1rem;padding:15px 32px}
</style>
ASTROEOF

ok "Marketing components written"

# PricingTable (larger — written separately)
cat > insighthunter-main/src/components/marketing/PricingTable.astro << 'ASTROEOF'
---
import { tiers, addons } from '../../data/pricing';
---
<section class="pricing section" id="pricing">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Pricing</span>
      <h2>Simple, Transparent Pricing</h2>
      <p>Start free. Scale when you're ready. No hidden fees.</p>
    </div>
    <div class="billing-toggle" role="group" aria-label="Billing period">
      <button class="toggle-btn active" id="btn-monthly" aria-pressed="true">Monthly</button>
      <button class="toggle-btn" id="btn-annual" aria-pressed="false">Annual <span class="save-badge">Save 20%</span></button>
    </div>
    <div class="pricing-grid">
      {tiers.map((tier) => (
        <article class={`pricing-card card ${tier.id === 'standard' ? 'pricing-card--featured' : ''}`}>
          {tier.badge && <div class="featured-badge">{tier.badge}</div>}
          <div class="tier-header">
            <h3 class="tier-name">{tier.name}</h3>
            <p class="tier-desc">{tier.description}</p>
          </div>
          <div class="tier-price">
            <span class="price-currency">$</span>
            <span class="price-amount" data-monthly={tier.price} data-annual={Math.floor(tier.annualPrice/12)}>{tier.price}</span>
            <div class="price-period">
              <span class="price-freq">/mo</span>
              {tier.annualPrice > 0 && <span class="price-billed" id={`billed-${tier.id}`}>billed monthly</span>}
            </div>
          </div>
          <a href={`/auth/register?plan=${tier.id}`} class={`tier-cta btn ${tier.id==='standard'?'btn-gold':'btn-outline'}`}>
            {tier.price === 0 ? 'Start Free — No Card Required' : `Get ${tier.name}`}
          </a>
          <ul class="tier-features">
            {tier.features.map((f) => (
              <li class="tier-feature">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="rgba(201,168,76,0.3)" stroke-width="1"/><path d="M4.5 8L6.8 10.5L11.5 5.5" stroke="#C9A84C" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
    <h3 class="addons-title">Add-Ons — available on any plan</h3>
    <div class="addon-grid">
      {addons.map((addon) => (
        <div class="addon-card">
          <div class="addon-info"><span class="addon-name">{addon.name}</span><span class="addon-desc">{addon.description}</span></div>
          <span class="addon-price">${addon.price}<small>/mo</small></span>
        </div>
      ))}
    </div>
    <div class="pricing-faq">
      <details class="faq-item"><summary>Can I switch plans at any time?</summary><p>Yes — upgrade or downgrade instantly from your dashboard. Charges are prorated.</p></details>
      <details class="faq-item"><summary>Is there a free trial?</summary><p>Insight Lite is permanently free. Paid plans include a 14-day trial, no card required.</p></details>
      <details class="faq-item"><summary>How does multi-tenant isolation work?</summary><p>Each organization gets its own isolated database on Cloudflare's global edge — no shared schemas.</p></details>
    </div>
  </div>
</section>
<script>
  const btnM = document.getElementById('btn-monthly');
  const btnA = document.getElementById('btn-annual');
  function setMode(mode) {
    const isA = mode === 'annual';
    btnM?.classList.toggle('active', !isA); btnA?.classList.toggle('active', isA);
    btnM?.setAttribute('aria-pressed', String(!isA)); btnA?.setAttribute('aria-pressed', String(isA));
    document.querySelectorAll('.price-amount').forEach(el => { el.textContent = isA ? el.dataset.annual : el.dataset.monthly; });
    document.querySelectorAll('[id^="billed-"]').forEach(el => { el.textContent = isA ? 'billed annually' : 'billed monthly'; });
  }
  btnM?.addEventListener('click', () => setMode('monthly'));
  btnA?.addEventListener('click', () => setMode('annual'));
</script>
<style>
.pricing{background:var(--bg)}
.billing-toggle{display:flex;background:var(--surface);border:1px solid var(--border-dim);border-radius:10px;padding:4px;gap:4px;margin:0 auto 48px;width:fit-content}
.toggle-btn{padding:8px 20px;border-radius:7px;font-size:0.875rem;font-weight:600;color:var(--muted);background:none;display:flex;align-items:center;gap:8px;transition:all 0.18s}
.toggle-btn.active{background:var(--surface-alt);color:var(--white)}
.save-badge{background:rgba(63,207,142,0.15);color:#3FCF8E;font-size:10px;font-weight:700;padding:2px 8px;border-radius:100px}
.pricing-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px;margin-bottom:64px;align-items:start}
.pricing-card{display:flex;flex-direction:column;gap:0;padding:32px;position:relative}
.pricing-card--featured{border-color:var(--gold)!important;background:linear-gradient(140deg,#141F32 0%,rgba(0,184,224,0.04) 100%);box-shadow:0 0 0 1px rgba(201,168,76,0.25),0 8px 48px rgba(0,0,0,0.4);transform:scale(1.025)}
.featured-badge{position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:var(--gold);color:#111;font-size:10px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;padding:4px 14px;border-radius:100px;white-space:nowrap}
.tier-header{margin-bottom:20px}
.tier-name{font-size:1.2rem;margin-bottom:6px}
.tier-desc{font-size:0.85rem;color:var(--muted);line-height:1.5}
.tier-price{display:flex;align-items:flex-start;gap:4px;margin-bottom:24px}
.price-currency{font-size:1.2rem;font-weight:700;color:var(--muted);margin-top:8px}
.price-amount{font-family:var(--font-display);font-size:3rem;font-weight:700;color:var(--white);line-height:1}
.price-period{display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:4px;gap:2px}
.price-freq{font-size:0.875rem;color:var(--muted)}
.price-billed{font-size:0.72rem;color:var(--subtle)}
.tier-cta{width:100%;margin-bottom:28px;font-size:0.9rem}
.tier-features{list-style:none;display:flex;flex-direction:column;gap:10px}
.tier-feature{display:flex;align-items:flex-start;gap:10px;font-size:0.875rem;color:var(--muted)}
.tier-feature svg{flex-shrink:0;margin-top:1px}
.addons-title{font-size:1.2rem;margin-bottom:20px;color:var(--white);text-align:center}
.addon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:48px}
.addon-card{background:var(--surface-alt);border:1px solid var(--border-dim);border-radius:10px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;transition:border-color 0.18s}
.addon-card:hover{border-color:var(--border-cyan)}
.addon-info{display:flex;flex-direction:column;gap:2px}
.addon-name{font-size:0.875rem;font-weight:600;color:var(--white)}
.addon-desc{font-size:0.76rem;color:var(--subtle)}
.addon-price{font-size:0.975rem;font-weight:700;color:var(--gold);white-space:nowrap}
.addon-price small{font-size:0.72rem;font-weight:400;color:var(--muted)}
.pricing-faq{max-width:640px;margin:0 auto;display:flex;flex-direction:column;gap:8px}
.faq-item{background:var(--surface);border:1px solid var(--border-dim);border-radius:10px;overflow:hidden;transition:border-color 0.18s}
.faq-item:hover{border-color:var(--border-cyan)}
.faq-item summary{padding:16px 20px;cursor:pointer;font-weight:600;font-size:0.9rem;list-style:none;display:flex;justify-content:space-between;align-items:center}
.faq-item summary::after{content:'+';color:var(--muted);font-size:1.2rem;transition:transform 0.2s}
.faq-item[open] summary::after{transform:rotate(45deg)}
.faq-item p{padding:0 20px 16px;font-size:0.875rem;color:var(--muted);line-height:1.65}
@media(max-width:768px){.pricing-card--featured{transform:none}}
</style>
ASTROEOF

ok "PricingTable written"

# =============================================================================
# Pages
# =============================================================================
head "Writing pages"

cat > insighthunter-main/src/pages/index.astro << 'ASTROEOF'
---
export const prerender = true;
import MarketingLayout from '../layouts/MarketingLayout.astro';
import Hero from '../components/marketing/Hero.astro';
import FeatureGrid from '../components/marketing/FeatureGrid.astro';
import PricingTable from '../components/marketing/PricingTable.astro';
import Testimonials from '../components/marketing/Testimonials.astro';
import CTABanner from '../components/marketing/CTABanner.astro';
import { apps } from '../data/apps';
const featuredApps = apps.slice(0, 6);
---
<MarketingLayout title="Insight Hunter | Stop Flying Blind" description="CFO-grade reporting, bookkeeping, forecasts, AI insights, and operator tools for small businesses.">
  <Hero />
  <section class="section" id="apps">
    <div class="container">
      <div class="section-head">
        <span class="eyebrow">Apps</span>
        <h2>One platform, focused apps.</h2>
        <p>Launch with the tools you need now, then expand into the full finance stack as your business grows.</p>
      </div>
      <div class="app-grid">
        {featuredApps.map((app) => (
          <a class="app-card card" href={`/${app.slug}`}>
            <div class="app-card-top">
              <span class="app-icon" aria-hidden="true">{app.icon}</span>
              <span class="app-tier">{app.tier}</span>
            </div>
            <h3>{app.name}</h3>
            <p>{app.description}</p>
            <span class="app-link">Learn more &rarr;</span>
          </a>
        ))}
      </div>
    </div>
  </section>
  <FeatureGrid />
  <Testimonials />
  <PricingTable />
  <CTABanner title="Start with one app. Grow into the full finance stack." text="Use the app that solves today's bottleneck, then unlock the rest of the platform when you are ready." cta={{ href:'/auth/register', label:'Create Free Account' }} />
</MarketingLayout>
<style>
.app-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.app-card{display:flex;flex-direction:column;gap:8px;padding:24px;text-decoration:none}
.app-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.app-icon{font-size:1.6rem}
.app-tier{font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);background:var(--surface-alt);border:1px solid var(--border-dim);border-radius:4px;padding:2px 8px}
.app-card h3{font-size:1rem;color:var(--white)}
.app-card p{font-size:0.85rem;color:var(--muted);flex:1;line-height:1.6}
.app-link{font-size:0.82rem;color:var(--cyan-text);font-weight:600;margin-top:4px}
</style>
ASTROEOF

cat > insighthunter-main/src/pages/pricing.astro << 'ASTROEOF'
---
export const prerender = true;
import MarketingLayout from '../layouts/MarketingLayout.astro';
import PricingTable from '../components/marketing/PricingTable.astro';
import CTABanner from '../components/marketing/CTABanner.astro';
---
<MarketingLayout title="Pricing | Insight Hunter" description="Simple, transparent pricing for operators who need clarity and finance-grade visibility.">
  <section class="pricing-hero section"><div class="container pricing-hero-inner">
    <span class="eyebrow">Pricing</span>
    <h1>Choose the level of visibility you need.</h1>
    <p>Start lean, then unlock deeper reporting and app access as your business complexity increases.</p>
  </div></section>
  <PricingTable />
  <CTABanner title="Need a bundled rollout?" text="Layer in bookkeeping, forecasting, BizForma, payroll, or operator support as needed." cta={{ href:'/contact', label:'Talk to Insight Hunter' }} />
</MarketingLayout>
<style>
.pricing-hero{background:var(--bg-navy)}
.pricing-hero-inner{max-width:680px}
h1{font-size:clamp(2rem,5vw,3rem);margin-bottom:16px}
p{color:var(--muted);font-size:1.05rem;line-height:1.7}
</style>
ASTROEOF

cat > insighthunter-main/src/pages/about.astro << 'ASTROEOF'
---
export const prerender = true;
import MarketingLayout from '../layouts/MarketingLayout.astro';
import CTABanner from '../components/marketing/CTABanner.astro';
---
<MarketingLayout title="About" description="Insight Hunter is a Cloudflare-native financial operating system for small businesses.">
  <section class="about-hero section"><div class="container about-hero-inner">
    <span class="eyebrow">Our Mission</span>
    <h1>Built for operators who run lean.</h1>
    <p>Insight Hunter was created because small businesses deserve the same financial clarity that enterprise companies take for granted — without the enterprise price tag or complexity.</p>
  </div></section>
  <section class="section"><div class="container about-grid">
    <div class="about-block"><h2>Why Cloudflare-native?</h2><p>Every organization on Insight Hunter runs in its own isolated database partition on Cloudflare's global edge network. Your data never co-mingles with another company's data, and every API request is served from the edge closest to you — median latency under 50ms.</p></div>
    <div class="about-block"><h2>One platform, not ten SaaS tabs.</h2><p>We built 9 integrated applications — bookkeeping, payroll, phone, CRM, formation, reporting, and more — that share one data model. Your payroll flows into your P&amp;L. Your phone calls link to your CRM. No manual exports. No broken integrations.</p></div>
    <div class="about-block"><h2>AI that pays for itself.</h2><p>The AI CFO isn't a chatbot. It runs continuously against your financial data, surfaces anomalies before they become problems, and delivers actionable forecasts your accountant would charge four figures to produce.</p></div>
  </div></section>
  <CTABanner />
</MarketingLayout>
<style>
.about-hero{background:var(--bg-navy)}.about-hero-inner{max-width:760px}
h1{font-size:clamp(2rem,5vw,3rem);margin-bottom:16px}.about-hero p{color:var(--muted);font-size:1.1rem;line-height:1.75}
.about-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:40px}
.about-block h2{font-size:1.35rem;margin-bottom:14px}.about-block p{color:var(--muted);line-height:1.75;font-size:0.95rem}
</style>
ASTROEOF

cat > insighthunter-main/src/pages/contact.astro << 'ASTROEOF'
---
export const prerender = false;
import MarketingLayout from '../layouts/MarketingLayout.astro';
---
<MarketingLayout title="Contact" description="Get in touch with the Insight Hunter team.">
  <section class="section contact-hero"><div class="container contact-inner">
    <span class="eyebrow">Contact</span>
    <h1>Let's talk.</h1>
    <p>Questions about pricing, enterprise plans, or getting a demo? We're here.</p>
    <form id="contact-form" class="contact-form" novalidate>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="name">Full name</label><input class="form-input" type="text" id="name" name="name" placeholder="Jane Smith" required /></div>
        <div class="form-group"><label class="form-label" for="email">Email</label><input class="form-input" type="email" id="email" name="email" placeholder="jane@company.com" required /></div>
      </div>
      <div class="form-group"><label class="form-label" for="subject">Subject</label>
        <select class="form-input" id="subject" name="subject">
          <option value="demo">Request a demo</option><option value="pricing">Pricing question</option><option value="enterprise">Enterprise / white-label</option><option value="support">Support</option><option value="other">Other</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label" for="message">Message</label><textarea class="form-input form-textarea" id="message" name="message" placeholder="Tell us what you're working on…" rows="5" required></textarea></div>
      <button type="submit" class="btn btn-gold submit-btn" id="submit-btn"><span id="btn-text">Send Message</span></button>
      <div id="success-msg" class="success-msg" hidden>✓ Message sent! We'll get back to you within 1 business day.</div>
    </form>
  </div></section>
</MarketingLayout>
<script>
  const form=document.getElementById('contact-form'); const btn=document.getElementById('submit-btn'); const btnText=document.getElementById('btn-text'); const success=document.getElementById('success-msg');
  form.addEventListener('submit', async (e) => { e.preventDefault(); btn.disabled=true; btnText.textContent='Sending…'; await new Promise(r=>setTimeout(r,900)); form.style.display='none'; success.hidden=false; });
</script>
<style>
.contact-hero{background:var(--bg-navy)}.contact-inner{max-width:680px}
h1{font-size:clamp(2rem,5vw,3rem);margin-bottom:12px}p{color:var(--muted);font-size:1rem;margin-bottom:36px}
.contact-form{display:flex;flex-direction:column;gap:18px}.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.form-textarea{resize:vertical;min-height:120px}
.submit-btn{width:100%;padding:14px;font-size:0.975rem}.submit-btn:disabled{opacity:0.7;cursor:not-allowed}
.success-msg{background:rgba(63,207,142,0.1);border:1px solid rgba(63,207,142,0.3);border-radius:8px;padding:16px;color:#3FCF8E;font-size:0.9rem;text-align:center}
.success-msg[hidden]{display:none}@media(max-width:520px){.form-row{grid-template-columns:1fr}}
</style>
ASTROEOF

cat > insighthunter-main/src/pages/404.astro << 'ASTROEOF'
---
export const prerender = true;
import MarketingLayout from '../layouts/MarketingLayout.astro';
---
<MarketingLayout title="Page Not Found">
  <section class="notfound section"><div class="container notfound-inner">
    <div class="notfound-code">404</div>
    <h1>Page not found</h1>
    <p>The page you're looking for doesn't exist or has moved.</p>
    <div class="notfound-actions">
      <a href="/" class="btn btn-gold">Back to Home</a>
      <a href="/pricing" class="btn btn-outline">View Pricing</a>
    </div>
  </div></section>
</MarketingLayout>
<style>
.notfound{background:var(--bg-navy);min-height:80vh;display:flex;align-items:center}
.notfound-inner{text-align:center;max-width:480px}
.notfound-code{font-size:7rem;font-family:var(--font-display);font-weight:700;color:transparent;-webkit-text-stroke:2px var(--border-cyan);line-height:1;margin-bottom:16px}
h1{font-size:2rem;margin-bottom:12px}p{color:var(--muted);margin-bottom:36px}
.notfound-actions{display:flex;gap:14px;justify-content:center}
</style>
ASTROEOF

ok "Main pages written"

# Auth pages
cat > insighthunter-main/src/pages/auth/login.astro << 'ASTROEOF'
---
export const prerender = false;
import AuthLayout from '../../layouts/AuthLayout.astro';
---
<AuthLayout title="Sign In">
  <div class="auth-card">
    <div class="auth-header"><h1>Welcome back</h1><p>Sign in to your Insight Hunter account</p></div>
    <div id="error-banner" class="error-banner" hidden><span id="error-text">Invalid email or password.</span></div>
    <form id="login-form" class="auth-form" novalidate>
      <div class="form-group"><label class="form-label" for="email">Email</label><input class="form-input" type="email" id="email" name="email" placeholder="you@company.com" autocomplete="email" required /></div>
      <div class="form-group">
        <div class="label-row"><label class="form-label" for="password">Password</label><a href="/auth/forgot-password" class="forgot-link">Forgot password?</a></div>
        <input class="form-input" type="password" id="password" name="password" placeholder="••••••••" autocomplete="current-password" required />
      </div>
      <button type="submit" class="btn btn-gold submit-btn" id="submit-btn"><span id="btn-text">Sign In</span><span id="btn-loader" class="spinner" hidden></span></button>
    </form>
    <div class="divider">or</div>
    <div class="auth-footer"><p>Don't have an account? <a href="/auth/register" class="auth-link">Create one free</a></p></div>
  </div>
</AuthLayout>
<script>
  const form=document.getElementById('login-form'); const btnText=document.getElementById('btn-text'); const loader=document.getElementById('btn-loader'); const errBanner=document.getElementById('error-banner'); const errText=document.getElementById('error-text'); const submitBtn=document.getElementById('submit-btn');
  function showError(msg){errText.textContent=msg;errBanner.hidden=false}
  form.addEventListener('submit', async(e)=>{
    e.preventDefault(); errBanner.hidden=true;
    const email=(form.elements.namedItem('email')).value.trim();
    const password=(form.elements.namedItem('password')).value;
    if(!email||!password){showError('Please fill in all fields.');return}
    submitBtn.disabled=true; btnText.textContent='Signing in…'; loader.hidden=false;
    try{
      const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data=await res.json();
      if(!res.ok||!data.token){showError(data.error??'Invalid email or password.');return}
      localStorage.setItem('ih_access_token',data.token);
      const params=new URLSearchParams(window.location.search);
      window.location.href=params.get('next')??'/dashboard';
    }catch{showError('Network error — please try again.')}
    finally{submitBtn.disabled=false;btnText.textContent='Sign In';loader.hidden=true}
  });
</script>
<style>
.auth-card{width:100%;max-width:420px;position:relative;z-index:1}
.auth-header{text-align:center;margin-bottom:32px}
.auth-header h1{font-size:1.75rem;margin-bottom:8px}
.auth-header p{color:var(--muted);font-size:0.9rem}
.error-banner{display:flex;align-items:center;gap:10px;background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.3);border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:0.875rem;color:#F87171}
.error-banner[hidden]{display:none}
.auth-form{display:flex;flex-direction:column;gap:18px;margin-bottom:20px}
.label-row{display:flex;justify-content:space-between;align-items:center}
.forgot-link{font-size:0.8rem;color:var(--cyan-text);transition:color 0.18s}
.forgot-link:hover{color:var(--cyan)}
.submit-btn{width:100%;padding:14px;font-size:0.975rem;margin-top:4px}
.submit-btn:disabled{opacity:0.7;cursor:not-allowed}
.spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,0.2);border-top-color:#000;border-radius:50%;animation:spin 0.7s linear infinite}
.spinner[hidden]{display:none}
@keyframes spin{to{transform:rotate(360deg)}}
.divider{display:flex;align-items:center;gap:12px;color:var(--subtle);font-size:0.8rem;margin:20px 0}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border-dim)}
.auth-footer{text-align:center;font-size:0.875rem;color:var(--muted)}
.auth-link{color:var(--cyan-text);font-weight:600;transition:color 0.18s}
.auth-link:hover{color:var(--cyan)}
</style>
ASTROEOF

cat > insighthunter-main/src/pages/auth/register.astro << 'ASTROEOF'
---
export const prerender = false;
import AuthLayout from '../../layouts/AuthLayout.astro';
import { tiers } from '../../data/pricing';
const plan = Astro.url.searchParams.get('plan') ?? 'lite';
const selectedTier = tiers.find(t => t.id === plan) ?? tiers[0];
---
<AuthLayout title="Create Account">
  <div class="auth-card">
    <div class="auth-header">
      <h1>Create your account</h1>
      <p>Get started with <strong class="plan-name">{selectedTier.name}</strong>{selectedTier.price===0?' — free forever, no card required.':`— $${selectedTier.price}/mo, cancel anytime.`}</p>
    </div>
    <div class="plan-selector" role="radiogroup">
      {tiers.map((tier) => (
        <label class={`plan-option ${tier.id===plan?'selected':''}`} data-tier-id={tier.id}>
          <input type="radio" name="plan" value={tier.id} checked={tier.id===plan} class="plan-radio" />
          <span class="plan-option-name">{tier.name}</span>
          <span class="plan-option-price">{tier.price===0?'Free':`$${tier.price}/mo`}</span>
        </label>
      ))}
    </div>
    <div id="error-banner" class="error-banner" hidden><span id="error-text">Something went wrong.</span></div>
    <form id="register-form" class="auth-form" novalidate>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="first-name">First name</label><input class="form-input" type="text" id="first-name" name="firstName" placeholder="Jane" autocomplete="given-name" required /></div>
        <div class="form-group"><label class="form-label" for="last-name">Last name</label><input class="form-input" type="text" id="last-name" name="lastName" placeholder="Smith" autocomplete="family-name" required /></div>
      </div>
      <div class="form-group"><label class="form-label" for="company">Company name</label><input class="form-input" type="text" id="company" name="company" placeholder="Acme Corp" autocomplete="organization" required /></div>
      <div class="form-group"><label class="form-label" for="email">Work email</label><input class="form-input" type="email" id="email" name="email" placeholder="jane@company.com" autocomplete="email" required /></div>
      <div class="form-group">
        <label class="form-label" for="password">Password</label>
        <input class="form-input" type="password" id="password" name="password" placeholder="Min 8 characters" autocomplete="new-password" minlength="8" required />
        <div class="password-strength" id="pw-strength"></div>
      </div>
      <label class="check-label"><input type="checkbox" id="agree-terms" name="agreeTerms" required /><span>I agree to the <a href="/terms" class="auth-link" target="_blank">Terms of Service</a> and <a href="/privacy" class="auth-link" target="_blank">Privacy Policy</a></span></label>
      <button type="submit" class="btn btn-gold submit-btn" id="submit-btn"><span id="btn-text">{selectedTier.price===0?'Create Free Account':`Start ${selectedTier.name}`}</span><span id="btn-loader" class="spinner" hidden></span></button>
    </form>
    <div class="auth-footer"><p>Already have an account? <a href="/auth/login" class="auth-link">Sign in</a></p></div>
  </div>
</AuthLayout>
<script>
  const form=document.getElementById('register-form'); const btnText=document.getElementById('btn-text'); const loader=document.getElementById('btn-loader'); const errBanner=document.getElementById('error-banner'); const errText=document.getElementById('error-text'); const submitBtn=document.getElementById('submit-btn'); const pwInput=document.getElementById('password'); const pwStr=document.getElementById('pw-strength');
  let selectedPlan=document.querySelector('input[name="plan"]:checked')?.value??(('lite'));
  document.querySelectorAll('.plan-option').forEach(opt=>{opt.addEventListener('click',()=>{document.querySelectorAll('.plan-option').forEach(o=>o.classList.remove('selected'));opt.classList.add('selected');selectedPlan=opt.dataset.tierId??'lite'})});
  pwInput.addEventListener('input',()=>{const v=pwInput.value;let s=0;if(v.length>=8)s++;if(/[A-Z]/.test(v))s++;if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;const labels=['','Weak','Fair','Good','Strong'];const colors=['','#E05252','#F0B429','#22C8EF','#3FCF8E'];pwStr.textContent=v.length>0?`Password strength: ${labels[s]}`:'';;pwStr.style.color=colors[s]??''});
  function showError(msg){errText.textContent=msg;errBanner.hidden=false}
  form.addEventListener('submit',async(e)=>{
    e.preventDefault();errBanner.hidden=true;
    const firstName=(form.elements.namedItem('firstName')).value.trim();
    const lastName=(form.elements.namedItem('lastName')).value.trim();
    const company=(form.elements.namedItem('company')).value.trim();
    const email=(form.elements.namedItem('email')).value.trim();
    const password=(form.elements.namedItem('password')).value;
    const agreeTerms=(form.elements.namedItem('agreeTerms')).checked;
    if(!firstName||!lastName||!company||!email||!password){showError('Please fill in all required fields.');return}
    if(password.length<8){showError('Password must be at least 8 characters.');return}
    if(!agreeTerms){showError('You must agree to the Terms of Service.');return}
    submitBtn.disabled=true;btnText.textContent='Creating account…';loader.hidden=false;
    try{
      const res=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstName,lastName,company,email,password,plan:selectedPlan})});
      const data=await res.json();
      if(!res.ok||!data.token){showError(data.error??'Registration failed. Please try again.');return}
      localStorage.setItem('ih_access_token',data.token);
      window.location.href='/dashboard';
    }catch{showError('Network error — please try again.')}
    finally{submitBtn.disabled=false;btnText.textContent='Create Account';loader.hidden=true}
  });
</script>
<style>
.auth-card{width:100%;max-width:480px;position:relative;z-index:1}
.auth-header{text-align:center;margin-bottom:24px}
.auth-header h1{font-size:1.65rem;margin-bottom:8px}
.auth-header p{color:var(--muted);font-size:0.875rem;line-height:1.6}
.plan-name{color:var(--gold);font-style:normal}
.plan-selector{display:flex;gap:8px;margin-bottom:24px}
.plan-option{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border:1px solid var(--border-dim);border-radius:10px;cursor:pointer;transition:border-color 0.18s,background 0.18s;text-align:center}
.plan-option.selected{border-color:var(--gold);background:rgba(201,168,76,0.06)}
.plan-radio{display:none}
.plan-option-name{font-size:0.78rem;font-weight:700;color:var(--white)}
.plan-option-price{font-size:0.72rem;color:var(--muted)}
.error-banner{display:flex;align-items:center;gap:10px;background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.3);border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:0.875rem;color:#F87171}
.error-banner[hidden]{display:none}
.auth-form{display:flex;flex-direction:column;gap:16px;margin-bottom:20px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.password-strength{font-size:0.78rem;margin-top:4px;height:16px;transition:color 0.2s}
.check-label{display:flex;align-items:flex-start;gap:10px;font-size:0.82rem;color:var(--muted);cursor:pointer;line-height:1.5}
.check-label input{margin-top:2px;accent-color:var(--gold);flex-shrink:0}
.submit-btn{width:100%;padding:14px;font-size:0.975rem;margin-top:4px}
.submit-btn:disabled{opacity:0.7;cursor:not-allowed}
.spinner{width:16px;height:16px;border:2px solid rgba(0,0,0,0.2);border-top-color:#000;border-radius:50%;animation:spin 0.7s linear infinite}
.spinner[hidden]{display:none}
@keyframes spin{to{transform:rotate(360deg)}}
.auth-footer{text-align:center;font-size:0.875rem;color:var(--muted)}
.auth-link{color:var(--cyan-text);font-weight:600;transition:color 0.18s}
.auth-link:hover{color:var(--cyan)}
@media(max-width:480px){.plan-selector{flex-direction:column}.form-row{grid-template-columns:1fr}}
</style>
ASTROEOF

ok "Auth pages written"

# Pages function
cat > "insighthunter-main/functions/api/[[path]].ts" << 'EOF'
interface Env {
  DISPATCH_WORKER: Fetcher;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.DISPATCH_WORKER) {
    return Response.json({ error: 'Dispatch worker not configured' }, { status: 503 });
  }
  const path = (params.path as string[] | undefined)?.join('/') ?? '';
  console.log(`[Pages API Proxy] ${request.method} /api/${path}`);
  try {
    return await env.DISPATCH_WORKER.fetch(request);
  } catch (err) {
    console.error('[Pages API Proxy] Dispatch error:', err);
    return Response.json({ error: 'Service temporarily unavailable' }, { status: 502 });
  }
};
EOF

ok "Pages function written"

# =============================================================================
# insighthunter-dispatch
# =============================================================================
head "Writing insighthunter-dispatch"

cat > insighthunter-dispatch/package.json << 'EOF'
{
  "name": "insighthunter-dispatch",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":    "wrangler dev",
    "deploy": "wrangler deploy",
    "types":  "wrangler types"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20260518.1",
    "typescript": "^5.9.3",
    "wrangler": "^3.0.0"
  }
}
EOF

cat > insighthunter-dispatch/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ESNext","module": "ESNext","moduleResolution": "Bundler",
    "lib": ["ESNext"],"strict": true,"noEmit": true,"skipLibCheck": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"],"exclude": ["node_modules"]
}
EOF

cat > insighthunter-dispatch/wrangler.jsonc << 'EOF'
{
  "name": "insighthunter-dispatch",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 },
  "services": [
    { "binding": "AUTH_WORKER",        "service": "insighthunter-auth" },
    { "binding": "BOOKKEEPING_WORKER", "service": "insighthunter-bookkeeping" },
    { "binding": "PAYROLL_WORKER",     "service": "insighthunter-payroll" },
    { "binding": "BIZFORMA_WORKER",    "service": "insighthunter-bizforma" },
    { "binding": "SCOUT_WORKER",       "service": "insighthunter-scout" },
    { "binding": "PBX_WORKER",         "service": "insighthunter-pbx" },
    { "binding": "REPORT_WORKER",      "service": "insighthunter-report" }
  ],
  "kv_namespaces": [
    { "binding": "SESSIONS",   "id": "REPLACE_WITH_YOUR_KV_ID",          "preview_id": "REPLACE_WITH_YOUR_KV_PREVIEW_ID" },
    { "binding": "RATE_LIMIT", "id": "REPLACE_WITH_RATE_LIMIT_KV_ID",    "preview_id": "REPLACE_WITH_RATE_LIMIT_KV_PREVIEW_ID" }
  ],
  "d1_databases": [
    { "binding": "DB", "database_name": "insighthunter-dispatch", "database_id": "REPLACE_WITH_D1_DATABASE_ID" }
  ],
  "analytics_engine_datasets": [
    { "binding": "API_EVENTS", "dataset": "ih_api_events" }
  ],
  "vars": {
    "ENVIRONMENT": "production",
    "ALLOWED_ORIGINS": "https://insighthunter.app,https://www.insighthunter.app",
    "RATE_LIMIT_WINDOW_SECONDS": "60",
    "RATE_LIMIT_MAX_REQUESTS": "120"
  }
}
EOF

# Dispatch worker source (written via Python to avoid heredoc escaping issues)
python3 << 'PYEOF'
src = r'''
export interface Env {
  AUTH_WORKER: Fetcher; BOOKKEEPING_WORKER: Fetcher; PAYROLL_WORKER: Fetcher;
  BIZFORMA_WORKER: Fetcher; SCOUT_WORKER: Fetcher; PBX_WORKER: Fetcher; REPORT_WORKER: Fetcher;
  SESSIONS: KVNamespace; RATE_LIMIT: KVNamespace; DB: D1Database;
  API_EVENTS: AnalyticsEngineDataset;
  ENVIRONMENT: string; ALLOWED_ORIGINS: string;
  RATE_LIMIT_WINDOW_SECONDS: string; RATE_LIMIT_MAX_REQUESTS: string; JWT_SECRET?: string;
}

interface JWTPayload { sub: string; org: string; email: string; tier: 'lite'|'standard'|'pro'; iat: number; exp: number; }

const PUBLIC_ROUTES = [
  { method:'POST', path:'/api/auth/login' }, { method:'POST', path:'/api/auth/register' },
  { method:'POST', path:'/api/auth/refresh' }, { method:'POST', path:'/api/auth/forgot-password' },
  { method:'GET',  path:'/api/health' }, { method:'GET', path:'/api/version' },
];

function getAllowedOrigins(env: Env) { return env.ALLOWED_ORIGINS.split(',').map(o => o.trim()); }

function corsHeaders(origin: string|null, env: Env): Record<string,string> {
  const allowed = getAllowedOrigins(env);
  const isAllowed = origin && (allowed.includes(origin) || env.ENVIRONMENT !== 'production');
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin ?? '*') : allowed[0] ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-IH-Org',
    'Access-Control-Allow-Credentials': 'true', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin',
  };
}

function addCors(response: Response, origin: string|null, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [k,v] of Object.entries(corsHeaders(origin, env))) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function checkRateLimit(ip: string, env: Env): Promise<{ allowed: boolean; remaining: number }> {
  const windowSec = parseInt(env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 10);
  const maxReqs   = parseInt(env.RATE_LIMIT_MAX_REQUESTS   ?? '120', 10);
  const windowStart = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const key = `rl:${ip}:${windowStart}`;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= maxReqs) return { allowed: false, remaining: 0 };
    env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: windowSec * 2 });
    return { allowed: true, remaining: maxReqs - count - 1 };
  } catch { return { allowed: true, remaining: maxReqs }; }
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload|null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const enc = new TextEncoder(); const keyData = enc.encode(secret);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sig, data);
    if (!valid) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g,'+').replace(/_/g,'/'))) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function trackApiEvent(env: Env, method: string, path: string, status: number, orgId: string|null, latencyMs: number): void {
  try { env.API_EVENTS.writeDataPoint({ doubles:[status, latencyMs], blobs:[method, path, env.ENVIRONMENT], indexes:[orgId ?? 'anonymous'] }); } catch {}
}

function getWorkerForPath(path: string, env: Env): Fetcher|null {
  const n = path.replace(/^\/api/, '');
  if (n.startsWith('/auth'))        return env.AUTH_WORKER;
  if (n.startsWith('/bookkeeping')) return env.BOOKKEEPING_WORKER;
  if (n.startsWith('/payroll'))     return env.PAYROLL_WORKER;
  if (n.startsWith('/bizforma'))    return env.BIZFORMA_WORKER;
  if (n.startsWith('/scout'))       return env.SCOUT_WORKER;
  if (n.startsWith('/pbx'))         return env.PBX_WORKER;
  if (n.startsWith('/report'))      return env.REPORT_WORKER;
  return null;
}

function isPublicRoute(method: string, pathname: string): boolean {
  return PUBLIC_ROUTES.some(r => r.method === method && pathname === r.path);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startMs = Date.now();
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    if (url.pathname === '/api/health') {
      return addCors(Response.json({ status:'ok', service:'insighthunter-dispatch', env: env.ENVIRONMENT }), origin, env);
    }
    if (url.pathname === '/api/version') {
      return addCors(Response.json({ version:'1.0.0', build: new Date().toISOString().split('T')[0] }), origin, env);
    }

    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { allowed, remaining } = await checkRateLimit(clientIP, env);
    if (!allowed) {
      return addCors(Response.json({ error:'Rate limit exceeded. Please slow down and try again.' }, { status:429, headers:{ 'Retry-After': env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 'X-RateLimit-Remaining':'0' } }), origin, env);
    }

    let authenticatedUser: JWTPayload|null = null;
    if (!isPublicRoute(request.method, url.pathname)) {
      const authHeader = request.headers.get('Authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return addCors(Response.json({ error:'Authentication required.' }, { status:401 }), origin, env);
      const secret = env.JWT_SECRET ?? '';
      if (!secret) { console.error('[dispatch] JWT_SECRET not configured'); return addCors(Response.json({ error:'Server configuration error.' }, { status:500 }), origin, env); }
      authenticatedUser = await verifyJWT(token, secret);
      if (!authenticatedUser) return addCors(Response.json({ error:'Invalid or expired token. Please sign in again.' }, { status:401 }), origin, env);
    }

    const targetWorker = getWorkerForPath(url.pathname, env);
    if (!targetWorker) return addCors(Response.json({ error:`No route found for ${url.pathname}` }, { status:404 }), origin, env);

    const enrichedHeaders = new Headers(request.headers);
    enrichedHeaders.set('X-IH-Request-ID', crypto.randomUUID());
    enrichedHeaders.set('X-IH-Dispatch-At', new Date().toISOString());
    enrichedHeaders.set('X-RateLimit-Remaining', String(remaining));
    if (authenticatedUser) {
      enrichedHeaders.set('X-IH-User', authenticatedUser.sub);
      enrichedHeaders.set('X-IH-Org',  authenticatedUser.org);
      enrichedHeaders.set('X-IH-Email',authenticatedUser.email);
      enrichedHeaders.set('X-IH-Tier', authenticatedUser.tier);
    }

    const enrichedRequest = new Request(request.url, {
      method: request.method, headers: enrichedHeaders,
      body: ['GET','HEAD','DELETE'].includes(request.method) ? undefined : request.body,
    });

    let downstreamResponse: Response;
    try {
      downstreamResponse = await targetWorker.fetch(enrichedRequest);
    } catch (err) {
      console.error(`[dispatch] Downstream error on ${url.pathname}:`, err);
      ctx.waitUntil(Promise.resolve(trackApiEvent(env, request.method, url.pathname, 502, authenticatedUser?.org ?? null, Date.now() - startMs)));
      return addCors(Response.json({ error:'Upstream service error. Please try again shortly.' }, { status:502 }), origin, env);
    }

    ctx.waitUntil(Promise.resolve(trackApiEvent(env, request.method, url.pathname, downstreamResponse.status, authenticatedUser?.org ?? null, Date.now() - startMs)));
    return addCors(downstreamResponse, origin, env);
  },
} satisfies ExportedHandler<Env>;
'''
with open('insighthunter-dispatch/src/index.ts', 'w') as f:
    f.write(src)
print("dispatch src/index.ts written")
PYEOF

ok "insighthunter-dispatch written"

# =============================================================================
# Deployment docs
# =============================================================================
head "Writing DEPLOYMENT.md"

cat > DEPLOYMENT.md << 'EOF'
# InsightHunter — Cloudflare Deployment Guide

## Architecture
```
Browser
  │
  ▼
Cloudflare Pages  (insighthunter.app)
  insighthunter-main   ← Astro marketing + auth shell
  functions/api/[[path]].ts
        │  Service Binding: DISPATCH_WORKER
        ▼
  insighthunter-dispatch  ← Central API Gateway Worker
        │  CORS · Rate Limiting · JWT Auth · Routing
        ├──► insighthunter-auth
        ├──► insighthunter-bookkeeping
        ├──► insighthunter-payroll
        ├──► insighthunter-bizforma
        ├──► insighthunter-scout
        ├──► insighthunter-pbx
        └──► insighthunter-report
```

## Cloudflare Dashboard — Pages Setup

### dash.cloudflare.com → Pages → Create a project → Connect to Git

| Field                     | Value                                     |
|---------------------------|-------------------------------------------|
| Project name              | `insighthunter-main`                      |
| Production branch         | `main`                                    |
| Build command             | `npm run build`                           |
| Build output directory    | `dist`                                    |
| Root directory (monorepo) | `insighthunter-main`                      |
| Node.js version           | `20`                                      |

### Environment Variables (Settings → Environment variables)

| Variable           | Value                                    | Environment      |
|--------------------|------------------------------------------|------------------|
| `PUBLIC_APP_URL`   | `https://insighthunter.app`              | Production       |
| `DISPATCH_URL`     | `https://dispatch.insighthunter.app`     | Production       |
| `AUTH_URL`         | `https://auth.insighthunter.app`         | Production       |
| `JWT_SECRET`       | *(generate: openssl rand -hex 32)*       | Production + Dev |

### Service Bindings (Settings → Functions → Service bindings)

| Variable name     | Service                     |
|-------------------|-----------------------------|
| `DISPATCH_WORKER` | `insighthunter-dispatch`    |

### KV Namespace Bindings (Settings → Functions → KV namespace bindings)

| Variable name | KV namespace     |
|---------------|------------------|
| `SESSIONS`    | `ih-sessions`    |

---

## One-time CLI setup

```bash
# 1. Create KV namespaces
wrangler kv namespace create ih-sessions
wrangler kv namespace create ih-rate-limit

# 2. Create D1 database for dispatch
wrangler d1 create insighthunter-dispatch

# 3. Set dispatch secrets
wrangler secret put JWT_SECRET --name insighthunter-dispatch

# 4. Deploy dispatch worker
cd insighthunter-dispatch && npm install && wrangler deploy

# 5. Build & deploy Pages (or push to git — Pages auto-builds)
cd insighthunter-main && npm install && npm run build
wrangler pages deploy dist --project-name insighthunter-main
```

## Local development

```bash
# Terminal 1
cd insighthunter-dispatch && wrangler dev --port 8787

# Terminal 2
cd insighthunter-main && npm run dev
```

## Header contract (dispatch → sub-workers)

| Header             | Value                         |
|--------------------|-------------------------------|
| `X-IH-User`        | userId (UUID)                 |
| `X-IH-Org`         | orgId (tenant UUID)           |
| `X-IH-Email`       | user email                    |
| `X-IH-Tier`        | `lite` / `standard` / `pro`  |
| `X-IH-Request-ID`  | unique request UUID           |
| `X-IH-Dispatch-At` | ISO timestamp                 |
EOF

ok "DEPLOYMENT.md written"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║  InsightHunter file setup complete!                   ║${RESET}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}║  Files written:                                       ║${RESET}"
echo -e "${GREEN}║    insighthunter-main/   (Astro Pages site)           ║${RESET}"
echo -e "${GREEN}║    insighthunter-dispatch/ (API gateway Worker)       ║${RESET}"
echo -e "${GREEN}║    DEPLOYMENT.md         (full setup guide)           ║${RESET}"
echo -e "${GREEN}╠═══════════════════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}║  Next steps:                                          ║${RESET}"
echo -e "${GREEN}║    1. cd insighthunter-main && npm install            ║${RESET}"
echo -e "${GREEN}║    2. cd insighthunter-dispatch && npm install        ║${RESET}"
echo -e "${GREEN}║    3. Follow DEPLOYMENT.md for Cloudflare setup       ║${RESET}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${RESET}"
