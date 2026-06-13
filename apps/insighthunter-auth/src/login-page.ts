/**
 * InsightHunter branded login page
 * Primary brand: #0F172A (slate-900)
 * Accent:        #38BDF8 (sky-400)
 * Surface:       #1E293B (slate-800)
 */
export function loginPageHTML(redirect: string): string {
  const encodedRedirect = encodeURIComponent(redirect);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Sign in to InsightHunter — Financial Intelligence Platform">
<title>InsightHunter — Sign In</title>
<link rel="preconnect" href="https://api.fontshare.com">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&display=swap" rel="stylesheet">
<style>
  /* ─── InsightHunter Brand Tokens ─────────────────── */
  :root {
    --color-bg:               #0F172A;   /* slate-900  — primary brand */
    --color-surface:          #1E293B;   /* slate-800  — card surface  */
    --color-surface-2:        #253044;   /* slate-750  — input bg      */
    --color-border:           #334155;   /* slate-700  — borders       */
    --color-border-subtle:    rgba(148,163,184,0.12);
    --color-primary:          #38BDF8;   /* sky-400    — accent        */
    --color-primary-hover:    #0EA5E9;   /* sky-500    — hover         */
    --color-primary-active:   #0284C7;   /* sky-600    — active        */
    --color-primary-glow:     rgba(56,189,248,0.15);
    --color-primary-dim:      rgba(56,189,248,0.08);
    --color-success:          #4ADE80;   /* green-400  — positive      */
    --color-warning:          #FB923C;   /* orange-400 — alerts        */
    --color-error:            #F87171;   /* red-400    — errors        */
    --color-text:             #F1F5F9;   /* slate-100  — primary text  */
    --color-text-muted:       #94A3B8;   /* slate-400  — secondary     */
    --color-text-faint:       #475569;   /* slate-600  — placeholder   */
    --font-body:              'Satoshi', 'Inter', system-ui, sans-serif;
    --radius-sm:              0.375rem;
    --radius-md:              0.5rem;
    --radius-lg:              0.75rem;
    --radius-xl:              1rem;
    --radius-full:            9999px;
    --shadow-card:            0 0 0 1px rgba(148,163,184,0.08),
                              0 4px 24px rgba(0,0,0,0.4),
                              0 1px 2px rgba(0,0,0,0.3);
    --shadow-glow:            0 0 32px rgba(56,189,248,0.08);
    --transition:             180ms cubic-bezier(0.16,1,0.3,1);
  }

  /* ─── Reset ──────────────────────────────────────── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-size-adjust: none;
  }

  body {
    font-family: var(--font-body);
    background-color: var(--color-bg);
    color: var(--color-text);
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 1.5rem;
    position: relative;
    overflow-x: hidden;
  }

  /* ─── Background grid pattern ───────────────────── */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
    z-index: 0;
  }

  /* ─── Radial glow behind card ───────────────────── */
  body::after {
    content: '';
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  /* ─── Card ───────────────────────────────────────── */
  .auth-card {
    position: relative;
    z-index: 1;
    background: var(--color-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xl);
    padding: 2.5rem 2rem;
    width: 100%;
    max-width: 420px;
    box-shadow: var(--shadow-card), var(--shadow-glow);
  }

  /* ─── Logo ───────────────────────────────────────── */
  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    margin-bottom: 2rem;
    text-decoration: none;
  }

  .logo-mark {
    width: 38px;
    height: 38px;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-active) 100%);
    border-radius: var(--radius-md);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    box-shadow: 0 0 16px rgba(56,189,248,0.3);
  }

  .logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--color-text);
  }

  .logo-text span {
    color: var(--color-primary);
  }

  /* ─── Header ─────────────────────────────────────── */
  .auth-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .auth-header h1 {
    font-size: 1.375rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .auth-header p {
    font-size: 0.9375rem;
    color: var(--color-text-muted);
    line-height: 1.6;
    max-width: 100%;
  }

  /* ─── Access container ───────────────────────────── */
  /* Cloudflare Access injects sign-in buttons here */
  #cf-access-login-form,
  .cf-access-login-form {
    width: 100%;
  }

  /* ─── Sign-in button styles (fallback / preview) ─── */
  .signin-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-lg);
    font-size: 0.9375rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition), border-color var(--transition),
                box-shadow var(--transition), transform var(--transition);
    text-decoration: none;
    border: 1px solid transparent;
  }

  .signin-btn:active { transform: scale(0.98); }

  .signin-btn-primary {
    background: var(--color-primary);
    color: #0F172A;
    border-color: var(--color-primary);
    font-weight: 600;
  }
  .signin-btn-primary:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
    box-shadow: 0 0 20px rgba(56,189,248,0.25);
  }

  .signin-btn-ghost {
    background: var(--color-primary-dim);
    color: var(--color-primary);
    border-color: rgba(56,189,248,0.2);
  }
  .signin-btn-ghost:hover {
    background: rgba(56,189,248,0.12);
    border-color: rgba(56,189,248,0.35);
  }

  /* ─── Divider ────────────────────────────────────── */
  .divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.25rem 0;
    color: var(--color-text-faint);
    font-size: 0.8125rem;
  }
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  /* ─── Status badge ───────────────────────────────── */
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-success);
    background: rgba(74,222,128,0.08);
    border: 1px solid rgba(74,222,128,0.2);
    border-radius: var(--radius-full);
    padding: 0.25rem 0.625rem;
    margin-bottom: 1.25rem;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    background: var(--color-success);
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.6; transform: scale(0.85); }
  }

  /* ─── Features strip ─────────────────────────────── */
  .features {
    display: flex;
    justify-content: center;
    gap: 1.25rem;
    margin-bottom: 1.75rem;
    flex-wrap: wrap;
  }
  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
  }
  .feature-item svg {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  /* ─── Footer ─────────────────────────────────────── */
  .auth-footer {
    margin-top: 1.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--color-border);
    text-align: center;
    font-size: 0.8125rem;
    color: var(--color-text-faint);
    line-height: 1.7;
  }
  .auth-footer a {
    color: var(--color-text-muted);
    text-decoration: none;
    transition: color var(--transition);
  }
  .auth-footer a:hover { color: var(--color-primary); }

  /* ─── Top brand bar ──────────────────────────────── */
  .brand-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-primary-active), var(--color-primary), #7DD3FC);
    z-index: 100;
  }

  /* ─── Responsive ─────────────────────────────────── */
  @media (max-width: 480px) {
    body { padding: 1rem; align-items: flex-start; padding-top: 3rem; }
    .auth-card { padding: 2rem 1.5rem; }
  }

  /* ─── Reduced motion ─────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
</style>
</head>
<body>
  <div class="brand-bar" aria-hidden="true"></div>

  <main class="auth-card" role="main">

    <!-- Logo -->
    <a href="https://insighthunter.app" class="logo" aria-label="InsightHunter home">
      <div class="logo-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="#0F172A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
          <path d="M11 8v6M8 11h6" stroke-width="2.2"/>
        </svg>
      </div>
      <span class="logo-text">Insight<span>Hunter</span></span>
    </a>

    <!-- Status badge -->
    <div style="text-align:center">
      <span class="status-badge">
        <span class="status-dot" aria-hidden="true"></span>
        All systems operational
      </span>
    </div>

    <!-- Header -->
    <div class="auth-header">
      <h1>Welcome back</h1>
      <p>Sign in to access your financial intelligence platform.</p>
    </div>

    <!-- Feature highlights -->
    <div class="features" aria-label="Platform features">
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Bookkeeping
      </div>
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Payroll
      </div>
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Analytics
      </div>
      <div class="feature-item">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Scout
      </div>
    </div>

    <!--
      ╔══════════════════════════════════════════════════════════╗
      ║  Cloudflare Access injects the actual sign-in buttons   ║
      ║  (Google, GitHub, Email OTP, etc.) into this element.   ║
      ╚══════════════════════════════════════════════════════════╝
    -->
    <div id="cf-access-login-form" role="region" aria-label="Sign in options">
      <!-- Access UI renders here automatically -->
    </div>

    <!-- Footer -->
    <footer class="auth-footer">
      Protected by
      <a href="https://www.cloudflare.com/zero-trust/" target="_blank" rel="noopener noreferrer">
        Cloudflare Zero Trust
      </a>
      &nbsp;&middot;&nbsp;
      <a href="https://insighthunter.app/terms" target="_blank" rel="noopener noreferrer">Terms</a>
      &nbsp;&middot;&nbsp;
      <a href="https://insighthunter.app/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
    </footer>

  </main>

  ${encodedRedirect ? `<input type="hidden" name="redirect" value="${encodedRedirect}">` : ""}
</body>
</html>`;
}
