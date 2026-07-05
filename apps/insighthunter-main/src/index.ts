import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB?: D1Database;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="InsightHunter helps modern finance teams connect books, compliance, and operational insights in one place." />
  <title>InsightHunter | Finance operations for growing companies</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111f;
      --panel: rgba(10, 20, 35, 0.82);
      --panel-strong: #0e1729;
      --text: #f5f7ff;
      --muted: #98a8c2;
      --line: rgba(255, 255, 255, 0.12);
      --accent: #3dd6c4;
      --accent-strong: #6b8cff;
      --shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: radial-gradient(circle at top left, rgba(109, 140, 255, 0.25), transparent 30%), var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    a { color: inherit; text-decoration: none; }
    .page { max-width: 1200px; margin: 0 auto; padding: 24px 24px 72px; }
    .topbar {
      display: flex; justify-content: space-between; align-items: center; padding: 8px 0 24px;
      border-bottom: 1px solid var(--line);
    }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -0.02em; }
    .brand-mark {
      width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
      background: linear-gradient(135deg, var(--accent), var(--accent-strong));
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
    }
    .nav-links { display: flex; gap: 18px; color: var(--muted); font-size: 15px; }
    .hero {
      display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 28px; padding: 56px 0 36px; align-items: center;
    }
    .eyebrow {
      display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px;
      background: rgba(61, 214, 196, 0.14); color: #aef3e8; font-size: 13px; font-weight: 600; margin-bottom: 16px;
    }
    h1 { font-size: clamp(32px, 5vw, 56px); line-height: 1.02; letter-spacing: -0.03em; margin-bottom: 16px; }
    .hero p { color: var(--muted); font-size: 18px; max-width: 640px; margin-bottom: 24px; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid transparent;
      padding: 12px 16px; border-radius: 999px; font-weight: 700; cursor: pointer; transition: transform 180ms ease, box-shadow 180ms ease;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-primary { background: linear-gradient(135deg, var(--accent), var(--accent-strong)); color: #04111e; box-shadow: var(--shadow); }
    .btn-secondary { border-color: var(--line); background: rgba(255,255,255,0.03); color: var(--text); }
    .hero-stats { display: flex; gap: 16px; color: var(--muted); font-size: 14px; flex-wrap: wrap; }
    .card {
      background: var(--panel); border: 1px solid var(--line); border-radius: 24px; box-shadow: var(--shadow);
      backdrop-filter: blur(16px);
    }
    .hero-panel { padding: 24px; }
    .hero-panel h2 { font-size: 20px; margin-bottom: 10px; }
    .hero-panel ul { list-style: none; display: grid; gap: 12px; color: var(--muted); }
    .hero-panel li { display: flex; gap: 10px; align-items: flex-start; }
    .hero-panel li::before { content: "•"; color: var(--accent); font-size: 20px; line-height: 1; }
    .section-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 24px 0 40px; }
    .feature { padding: 22px; }
    .feature h3 { margin-bottom: 10px; font-size: 18px; }
    .feature p { color: var(--muted); font-size: 15px; }
    .cta { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 16px; margin-top: 24px; align-items: start; }
    .cta-panel { padding: 24px; }
    .cta-panel h2 { margin-bottom: 10px; font-size: 24px; }
    .cta-panel p { color: var(--muted); margin-bottom: 18px; }
    form { display: flex; flex-direction: column; gap: 12px; }
    label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--muted); }
    input, select { border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); color: var(--text); border-radius: 12px; padding: 12px 14px; font-size: 15px; }
    input::placeholder { color: #7d8aa1; }
    .result { margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: 14px; display: none; }
    .result.ok { display: block; background: rgba(61, 214, 196, 0.16); border: 1px solid rgba(61, 214, 196, 0.24); color: #c8fff6; }
    .result.err { display: block; background: rgba(255, 107, 107, 0.16); border: 1px solid rgba(255, 107, 107, 0.24); color: #ffd1d1; }
    .footer { padding: 28px 0 0; color: var(--muted); font-size: 14px; }
    @media (max-width: 860px) {
      .hero, .cta, .section-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <a href="/" class="brand">
        <span class="brand-mark">◆</span>
        <span>InsightHunter</span>
      </a>
      <nav class="nav-links" aria-label="Primary navigation">
        <a href="#product">Product</a>
        <a href="#launch">Launch</a>
        <a href="#contact">Contact</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div>
          <div class="eyebrow">New • Finance operations, without the spreadsheet sprawl</div>
          <h1>Turn daily finance noise into clear, automated decisions.</h1>
          <p>InsightHunter brings your books, compliance, and advisor workflows into one calm operating system built for modern teams.</p>
          <div class="actions">
            <a class="btn btn-primary" href="#launch">Start your free pilot</a>
            <a class="btn btn-secondary" href="#product">See what’s inside</a>
          </div>
          <div class="hero-stats">
            <span>⚡ Live cash visibility</span>
            <span>🧾 Automated compliance checks</span>
            <span>🤝 Advisor-ready reporting</span>
          </div>
        </div>
        <div class="card hero-panel" id="product">
          <h2>Built for founders, operators, and finance teams</h2>
          <ul>
            <li>Connect books, invoices, and operational signals without duct-taped workflows.</li>
            <li>Surface the moments that matter with alerts that are actually actionable.</li>
            <li>Give leadership a single source of truth when every minute counts.</li>
          </ul>
        </div>
      </section>

      <section class="section-grid" aria-label="Key benefits">
        <article class="card feature">
          <h3>Faster closures</h3>
          <p>Move from scattered exports to organized, reviewable records in a fraction of the time.</p>
        </article>
        <article class="card feature">
          <h3>Smarter alerts</h3>
          <p>Catch anomalies early with proactive monitoring tailored to your operating rhythm.</p>
        </article>
        <article class="card feature">
          <h3>Clear reporting</h3>
          <p>Share polished insights with leadership and advisors without the last-minute scramble.</p>
        </article>
      </section>

      <section class="cta" id="launch">
        <div class="card cta-panel">
          <h2>Ready for a calmer finance stack?</h2>
          <p>Tell us a bit about your team and we’ll reach out with the right rollout plan for your business.</p>
          <a class="btn btn-primary" href="mailto:hello@insighthunter.app">hello@insighthunter.app</a>
        </div>
        <div class="card cta-panel" id="contact">
          <form id="onboard">
            <label>Business name
              <input name="businessName" required placeholder="Acme Labs" />
            </label>
            <label>Owner email
              <input name="ownerEmail" type="email" required placeholder="you@company.com" />
            </label>
            <label>Plan
              <select name="plan">
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>
            <button class="btn btn-primary" type="submit">Request early access</button>
          </form>
          <div id="result" class="result"></div>
        </div>
      </section>
    </main>

    <footer class="footer">© 2026 InsightHunter. Built for operators who need clarity, not complexity.</footer>
  </div>

  <script>
    document.getElementById('onboard').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData);
      const result = document.getElementById('result');
      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Submitting…';
      try {
        const response = await fetch('/api/onboard', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        result.style.display = 'block';
        if (response.ok) {
          result.className = 'result ok';
          result.textContent = 'Thanks — your request is queued. We will follow up shortly.';
          form.reset();
        } else {
          result.className = 'result err';
          result.textContent = json.error || 'Something went wrong. Please try again.';
        }
      } catch {
        result.style.display = 'block';
        result.className = 'result err';
        result.textContent = 'We could not reach the server right now. Please email hello@insighthunter.app.';
      } finally {
        button.disabled = false;
        button.textContent = 'Request early access';
      }
    });
  </script>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ─── Onboarding API ──────────────────────────────────────────────────────
    if (url.pathname === "/api/onboard" && request.method === "POST") {
      let body: { businessName?: string; ownerEmail?: string; plan?: string };
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      const { businessName, ownerEmail, plan } = body;
      if (!businessName || !ownerEmail || !plan) {
        return Response.json(
          { error: "businessName, ownerEmail, and plan are required" },
          { status: 400 },
        );
      }

      if (!env.DB) {
        return Response.json({ error: "Onboarding is temporarily unavailable" }, { status: 503 });
      }

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await env.DB.prepare(
        "INSERT INTO onboarding_sessions (id, owner_email, plan, organization_name, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
      )
        .bind(id, ownerEmail, plan, businessName, createdAt)
        .run();

      return Response.json({ organizationId: id, status: "pending" }, { status: 201 });
    }

    // ─── Health ───────────────────────────────────────────────────────────────
    if (url.pathname === "/health") {
      return Response.json({ service: "main", ok: true });
    }

    // ─── Shell ────────────────────────────────────────────────────────────────
    return new Response(HTML, {
      headers: { "content-type": "text/html;charset=utf-8" },
    });
  },
};
