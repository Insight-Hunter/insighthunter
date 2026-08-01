import { Hono } from 'hono';
import { html } from 'hono/html';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

// Security headers middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
});

app.get('/', (c) => {
  return c.html(html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InsightHunter — AI-Powered Business Operating System</title>
  <meta name="description" content="Enterprise-grade financial intelligence, bookkeeping, payroll, and AI advisory for small businesses." />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --brand: #0ea5e9;
      --brand-dark: #0369a1;
      --dark: #0f172a;
      --card: #1e293b;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --green: #22c55e;
    }
    body { font-family: system-ui, -apple-system, sans-serif; background: var(--dark); color: var(--text); line-height: 1.6; }
    nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid #1e293b; position: sticky; top: 0; background: var(--dark); z-index: 100; }
    .logo { font-size: 1.4rem; font-weight: 800; color: var(--brand); letter-spacing: -0.5px; }
    .nav-links { display: flex; gap: 2rem; list-style: none; }
    .nav-links a { color: var(--muted); text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
    .nav-links a:hover { color: var(--text); }
    .btn { padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; text-decoration: none; display: inline-block; }
    .btn-primary { background: var(--brand); color: white; border: none; }
    .btn-primary:hover { background: var(--brand-dark); }
    .btn-outline { background: transparent; color: var(--brand); border: 2px solid var(--brand); }
    .btn-outline:hover { background: var(--brand); color: white; }
    hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 5rem 2rem 4rem; max-width: 800px; margin: 0 auto; }
    h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1.5rem; }
    h1 span { color: var(--brand); }
    .subtitle { font-size: 1.2rem; color: var(--muted); max-width: 600px; margin-bottom: 2rem; }
    .hero-cta { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
    .apps-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; padding: 3rem 2rem; max-width: 1200px; margin: 0 auto; }
    .app-card { background: var(--card); border: 1px solid #334155; border-radius: 12px; padding: 1.5rem; transition: transform 0.2s, border-color 0.2s; }
    .app-card:hover { transform: translateY(-4px); border-color: var(--brand); }
    .app-icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .app-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem; }
    .app-card p { color: var(--muted); font-size: 0.9rem; }
    .section-title { text-align: center; font-size: 2rem; font-weight: 800; padding: 3rem 2rem 1rem; }
    .section-sub { text-align: center; color: var(--muted); max-width: 500px; margin: 0 auto 2rem; padding: 0 1rem; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; padding: 2rem; max-width: 1100px; margin: 0 auto; }
    .price-card { background: var(--card); border: 1px solid #334155; border-radius: 12px; padding: 2rem; }
    .price-card.featured { border-color: var(--brand); position: relative; }
    .featured-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--brand); color: white; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 1rem; border-radius: 20px; }
    .price { font-size: 2.5rem; font-weight: 900; }
    .price span { font-size: 1rem; color: var(--muted); }
    .price-features { list-style: none; margin: 1.5rem 0; }
    .price-features li { padding: 0.5rem 0; border-bottom: 1px solid #334155; font-size: 0.9rem; color: var(--muted); }
    .price-features li::before { content: "✓ "; color: var(--green); font-weight: bold; }
    footer { text-align: center; padding: 3rem 2rem; border-top: 1px solid #1e293b; color: var(--muted); font-size: 0.85rem; }
    .badge { display: inline-block; background: #0ea5e920; color: var(--brand); font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.75rem; border-radius: 20px; margin-bottom: 1rem; letter-spacing: 1px; text-transform: uppercase; }
    .stats { display: flex; justify-content: center; gap: 3rem; padding: 2rem; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat-num { font-size: 2rem; font-weight: 900; color: var(--brand); }
    .stat-label { color: var(--muted); font-size: 0.85rem; }
  </style>
</head>
<body>
<nav>
  <div class="logo">⚡ InsightHunter</div>
  <ul class="nav-links">
    <li><a href="#features">Features</a></li>
    <li><a href="#pricing">Pricing</a></li>
    <li><a href="#about">About</a></li>
  </ul>
  <div style="display:flex;gap:0.75rem;">
    <a href="https://auth.insighthunter.app/login" class="btn btn-outline">Sign In</a>
    <a href="https://auth.insighthunter.app/register" class="btn btn-primary">Get Started Free</a>
  </div>
</nav>

<hero>
  <div class="badge">AI-Powered Business OS</div>
  <h1>Your Business.<br/><span>Fully Understood.</span></h1>
  <p class="subtitle">InsightHunter gives small businesses enterprise-grade financial intelligence, bookkeeping, payroll, compliance, and AI advisory — all in one platform.</p>
  <div class="hero-cta">
    <a href="https://auth.insighthunter.app/register" class="btn btn-primary" style="font-size:1rem;padding:0.85rem 2rem;">Start Free Trial</a>
    <a href="#features" class="btn btn-outline" style="font-size:1rem;padding:0.85rem 2rem;">See Features</a>
  </div>
</hero>

<div class="stats">
  <div class="stat"><div class="stat-num">10+</div><div class="stat-label">Integrated Apps</div></div>
  <div class="stat"><div class="stat-num">AI</div><div class="stat-label">CFO Advisor</div></div>
  <div class="stat"><div class="stat-num">Edge</div><div class="stat-label">Global Deployment</div></div>
  <div class="stat"><div class="stat-num">SOC2</div><div class="stat-label">Ready Architecture</div></div>
</div>

<h2 class="section-title" id="features">Everything Your Business Needs</h2>
<p class="section-sub">One login. One dashboard. All the tools your business needs to run and grow.</p>
<div class="apps-grid">
  <div class="app-card">
    <div class="app-icon">📊</div>
    <h3>Insights</h3>
    <p>Real-time financial KPIs, cash flow forecasting, revenue trends, and AI-powered anomaly detection.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">📚</div>
    <h3>Bookkeeping</h3>
    <p>Bank feeds, automated categorization, reconciliation, and a complete general ledger — powered by AI.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">💰</div>
    <h3>Payroll</h3>
    <p>Employee management, payroll processing, tax estimates, contractor payments, and direct deposit.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">🤖</div>
    <h3>Advisor</h3>
    <p>Ask your AI CFO anything. Cash runway, expense anomalies, revenue predictions, scenario planning.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">🏢</div>
    <h3>BizForma</h3>
    <p>Business formation, entity management, EIN tracking, compliance reminders, and annual filings.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">📞</div>
    <h3>PBX</h3>
    <p>Business phone numbers, call routing, voicemail, AI call summaries, and CRM integration.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">📋</div>
    <h3>Reports</h3>
    <p>One-click board reports, monthly CFO summaries, investor update packets, and P&L statements.</p>
  </div>
  <div class="app-card">
    <div class="app-icon">🔔</div>
    <h3>Notifications</h3>
    <p>Smart alerts for cash flow warnings, payroll deadlines, compliance reminders, and anomalies.</p>
  </div>
</div>

<h2 class="section-title" id="pricing">Simple, Transparent Pricing</h2>
<p class="section-sub">Start free. Scale as you grow. No hidden fees.</p>
<div class="pricing-grid">
  <div class="price-card">
    <h3>Starter</h3>
    <div class="price">$0<span>/mo</span></div>
    <ul class="price-features">
      <li>Insights Dashboard</li>
      <li>Basic Bookkeeping</li>
      <li>1 User</li>
      <li>30-day Data History</li>
    </ul>
    <a href="https://auth.insighthunter.app/register" class="btn btn-outline" style="width:100%;text-align:center;">Get Started</a>
  </div>
  <div class="price-card featured">
    <div class="featured-badge">Most Popular</div>
    <h3>Growth</h3>
    <div class="price">$49<span>/mo</span></div>
    <ul class="price-features">
      <li>All Starter Features</li>
      <li>Full Bookkeeping + Payroll</li>
      <li>AI Advisor</li>
      <li>5 Users + Roles</li>
      <li>Unlimited History</li>
    </ul>
    <a href="https://auth.insighthunter.app/register?plan=growth" class="btn btn-primary" style="width:100%;text-align:center;">Start Free Trial</a>
  </div>
  <div class="price-card">
    <h3>Enterprise</h3>
    <div class="price">$149<span>/mo</span></div>
    <ul class="price-features">
      <li>All Growth Features</li>
      <li>BizForma + PBX + Reports</li>
      <li>White Label</li>
      <li>Unlimited Users</li>
      <li>SOC2 Controls</li>
      <li>Dedicated Support</li>
    </ul>
    <a href="mailto:sales@insighthunter.app" class="btn btn-outline" style="width:100%;text-align:center;">Contact Sales</a>
  </div>
</div>

<footer>
  <p style="font-size:1.1rem;font-weight:700;color:var(--text);margin-bottom:0.5rem;">⚡ InsightHunter</p>
  <p>© 2026 InsightHunter. All rights reserved.</p>
  <p style="margin-top:0.5rem;"><a href="/privacy" style="color:var(--muted);">Privacy</a> · <a href="/terms" style="color:var(--muted);">Terms</a> · <a href="mailto:support@insighthunter.app" style="color:var(--muted);">Support</a></p>
</footer>
</body>
</html>`);
});

app.get('/health', (c) => c.json({ status: 'ok', app: 'marketing', ts: Date.now() }));

export default app;
