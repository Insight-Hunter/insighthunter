import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InsightHunter</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, "Segoe UI", system-ui, sans-serif; background: #fff; color: #1f2328; }
    nav { border-bottom: 1px solid #e5e7eb; padding: 12px 24px; display: flex; align-items: center; gap: 12px; }
    nav strong { font-size: 16px; font-weight: 700; }
    nav span { font-size: 12px; color: #57606a; background: #f0f6ff; border: 1px solid #c8d8f0; border-radius: 10px; padding: 2px 8px; }
    main { max-width: 560px; margin: 80px auto; padding: 0 24px; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    p { color: #57606a; margin-bottom: 28px; line-height: 1.6; }
    form { display: flex; flex-direction: column; gap: 14px; }
    label { font-size: 13px; font-weight: 600; display: flex; flex-direction: column; gap: 4px; }
    input, select { font-size: 14px; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; width: 100%; }
    button { background: #3b82d4; color: #fff; border: none; border-radius: 6px; padding: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
    button:hover { background: #2563b0; }
    #result { margin-top: 20px; padding: 14px; border-radius: 6px; font-size: 13px; display: none; }
    #result.ok { background: #dcfce7; border: 1px solid #86efac; color: #166534; }
    #result.err { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
  </style>
</head>
<body>
<nav>
  <strong>InsightHunter</strong>
  <span>Beta</span>
</nav>
<main>
  <h1>Get started</h1>
  <p>Set up your organization to start tracking financials, compliance, and insights in one place.</p>
  <form id="onboard">
    <label>Business name <input name="businessName" required placeholder="Acme Corp" /></label>
    <label>Owner email <input name="ownerEmail" type="email" required placeholder="you@company.com" /></label>
    <label>Plan
      <select name="plan">
        <option value="starter">Starter</option>
        <option value="professional">Professional</option>
        <option value="enterprise">Enterprise</option>
      </select>
    </label>
    <button type="submit">Create organization</button>
  </form>
  <div id="result"></div>
</main>
<script>
  document.getElementById('onboard').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = Object.fromEntries(fd);
    const el = document.getElementById('result');
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      el.style.display = 'block';
      if (res.ok) {
        el.className = 'ok';
        el.textContent = 'Organization created. ID: ' + json.organizationId;
      } else {
        el.className = 'err';
        el.textContent = json.error || 'Something went wrong.';
      }
    } catch {
      el.style.display = 'block';
      el.className = 'err';
      el.textContent = 'Network error.';
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
