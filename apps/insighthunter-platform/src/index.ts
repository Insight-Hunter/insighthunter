import { Hono } from 'hono';
import { html } from 'hono/html';
import { cors } from 'hono/cors';
import { getCookie } from 'hono/cookie';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
type OrgPlan = 'starter' | 'growth' | 'pro' | 'enterprise';

type Bindings = {
  DB: D1Database;
  KV_SESSIONS: KVNamespace;
  KV_ENTITLEMENTS: KVNamespace;
  AUTH_URL: string;          // https://auth.insighthunter.app
  DASHBOARD_URL: string;     // https://app.insighthunter.app
  STRIPE_PORTAL_URL: string; // Stripe billing portal link (per-customer, set via secret)
};

interface IHSession {
  sessionId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string;
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  plan: OrgPlan;
  mfaVerified: boolean;
  createdAt: number;
  expiresAt: number;
}

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  owner_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: number;
}

interface MemberRow {
  id: string;
  user_id: string;
  org_id: string;
  role: OrgRole;
  email: string;
  name: string;
  accepted_at: number | null;
  created_at: number;
}

interface AuditRow {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
  user_email: string;
}

// ── Plan feature flags ────────────────────────────────────────────────────────

const PLAN_FEATURES: Record<OrgPlan, Record<string, boolean | number>> = {
  starter: {
    members: 3,
    bookkeeping: true,
    insights: true,
    advisor: false,
    payroll: false,
    reports: false,
    bizforma: false,
    scout: false,
    pbx: false,
    whitelabel: false,
  },
  growth: {
    members: 10,
    bookkeeping: true,
    insights: true,
    advisor: true,
    payroll: false,
    reports: true,
    bizforma: true,
    scout: false,
    pbx: false,
    whitelabel: false,
  },
  pro: {
    members: 25,
    bookkeeping: true,
    insights: true,
    advisor: true,
    payroll: true,
    reports: true,
    bizforma: true,
    scout: true,
    pbx: true,
    whitelabel: false,
  },
  enterprise: {
    members: 999,
    bookkeeping: true,
    insights: true,
    advisor: true,
    payroll: true,
    reports: true,
    bizforma: true,
    scout: true,
    pbx: true,
    whitelabel: true,
  },
};

const PLAN_LABELS: Record<OrgPlan, { label: string; color: string; price: string }> = {
  starter:    { label: 'Starter',    color: '#64748b', price: 'Free' },
  growth:     { label: 'Growth',     color: '#0ea5e9', price: '$49/mo' },
  pro:        { label: 'Pro',        color: '#8b5cf6', price: '$149/mo' },
  enterprise: { label: 'Enterprise', color: '#f59e0b', price: 'Custom' },
};

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>();

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// CORS for internal API routes
app.use('/api/*', cors({
  origin: ['https://insighthunter.app', 'https://app.insighthunter.app'],
  credentials: true,
}));

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireSession(
  c: { req: { header: (k: string) => string | undefined }; env: Bindings },
  cookieHeader?: string,
): Promise<IHSession | null> {
  const raw = cookieHeader ?? '';
  const match = raw.match(/ih_session=([^;]+)/);
  const sessionId = match?.[1];
  if (!sessionId) return null;
  const session = await c.env.KV_SESSIONS.get(`session:${sessionId}`, 'json') as IHSession | null;
  if (!session) return null;
  if (session.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return session;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function writeAudit(
  db: D1Database,
  orgId: string,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  ip: string,
): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_logs (id, org_id, user_id, action, resource_type, resource_id, ip_address, created_at)
     VALUES (?,?,?,?,?,?,?,datetime('now'))`,
  ).bind(crypto.randomUUID(), orgId, userId, action, resourceType, resourceId, ip).run();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function roleColor(role: OrgRole): string {
  return role === 'owner' ? '#f59e0b' : role === 'admin' ? '#8b5cf6' : role === 'member' ? '#0ea5e9' : '#64748b';
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Shared CSS ────────────────────────────────────────────────────────────────

const CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --brand:#0ea5e9;--dark:#0f172a;--surface:#1e293b;--border:#334155;
    --text:#e2e8f0;--muted:#94a3b8;--err:#ef4444;--ok:#22c55e;--warn:#f59e0b;
  }
  body{font-family:system-ui,sans-serif;background:var(--dark);color:var(--text);min-height:100vh;display:flex}
  .sidebar{
    width:220px;min-height:100vh;background:var(--surface);border-right:1px solid var(--border);
    padding:1.5rem 1rem;display:flex;flex-direction:column;gap:.5rem;flex-shrink:0;
  }
  .logo{font-size:1.1rem;font-weight:900;color:var(--brand);margin-bottom:1rem;padding-left:.5rem}
  .nav-item{
    display:flex;align-items:center;gap:.65rem;padding:.6rem .75rem;border-radius:8px;
    color:var(--muted);text-decoration:none;font-size:.875rem;font-weight:500;transition:all .15s;
  }
  .nav-item:hover,.nav-item.active{background:#0f172a;color:var(--text)}
  .nav-item.active{color:var(--brand)}
  .main{flex:1;padding:2rem;overflow-y:auto;max-width:960px}
  h1{font-size:1.5rem;font-weight:800;margin-bottom:.25rem}
  .subtitle{color:var(--muted);font-size:.9rem;margin-bottom:2rem}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;margin-bottom:1.5rem}
  .card-title{font-size:1rem;font-weight:700;margin-bottom:1.25rem;color:var(--text)}
  label{display:block;font-size:.8rem;font-weight:600;color:var(--muted);margin-bottom:.3rem}
  input,select{
    width:100%;background:var(--dark);border:1px solid var(--border);border-radius:8px;
    padding:.65rem 1rem;color:var(--text);font-size:.9rem;margin-bottom:1rem;outline:none;
  }
  input:focus,select:focus{border-color:var(--brand)}
  .btn{
    display:inline-flex;align-items:center;gap:.5rem;background:var(--brand);color:#fff;
    border:none;border-radius:8px;padding:.6rem 1.25rem;font-size:.875rem;font-weight:700;
    cursor:pointer;text-decoration:none;
  }
  .btn:hover{opacity:.9}
  .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
  .btn-ghost:hover{border-color:var(--brand);color:var(--brand)}
  .btn-danger{background:#ef444420;border:1px solid var(--err);color:var(--err)}
  .btn-danger:hover{background:var(--err);color:#fff}
  .badge{
    display:inline-block;padding:.15rem .6rem;border-radius:9999px;
    font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
  }
  table{width:100%;border-collapse:collapse}
  th{text-align:left;font-size:.75rem;font-weight:600;color:var(--muted);padding:.5rem .75rem;border-bottom:1px solid var(--border)}
  td{padding:.75rem;font-size:.875rem;border-bottom:1px solid #1e293b;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  .alert{border-radius:8px;padding:.75rem 1rem;font-size:.875rem;margin-bottom:1rem}
  .alert-err{background:#ef444420;border:1px solid var(--err);color:var(--err)}
  .alert-ok{background:#22c55e20;border:1px solid var(--ok);color:var(--ok)}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .plan-card{
    border:1px solid var(--border);border-radius:10px;padding:1.25rem;
    display:flex;flex-direction:column;gap:.5rem;
  }
  .plan-current{border-color:var(--brand);background:#0ea5e910}
  @media(max-width:640px){.sidebar{display:none}.grid-2{grid-template-columns:1fr}}
`;

function nav(active: string, session: IHSession) {
  const links = [
    { href: '/settings',  icon: '⚙️',  label: 'Settings' },
    { href: '/members',   icon: '👥',  label: 'Members' },
    { href: '/billing',   icon: '💳',  label: 'Billing' },
    { href: '/audit',     icon: '📋',  label: 'Audit Log' },
  ];
  return html`
    <div class="sidebar">
      <div class="logo">⚡ InsightHunter</div>
      ${links.map(l => html`
        <a href="${l.href}" class="nav-item${active === l.href ? ' active' : ''}">${l.icon} ${l.label}</a>
      `)}
      <div style="margin-top:auto;padding:.5rem;border-top:1px solid var(--border)">
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:.25rem">${session.orgName}</div>
        <div style="font-size:.8rem;font-weight:600">${session.name}</div>
        <div style="font-size:.7rem;color:var(--muted)">${session.email}</div>
        <a href="${session.expiresAt > 0 ? 'https://auth.insighthunter.app/logout' : '/'}" 
           style="display:block;margin-top:.75rem;font-size:.75rem;color:var(--muted);text-decoration:none">Sign out →</a>
      </div>
    </div>
  `;
}

function layout(title: string, active: string, session: IHSession, body: unknown) {
  return html`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — InsightHunter Platform</title>
  <style>${CSS}</style>
</head>
<body>
  ${nav(active, session)}
  <div class="main">${body}</div>
</body>
</html>`;
}

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, service: 'insighthunter-platform', ts: Date.now() }));

// ── Settings ──────────────────────────────────────────────────────────────────

app.get('/settings', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login?redirect=' + encodeURIComponent('https://platform.insighthunter.app/settings'));

  const error = c.req.query('error');
  const success = c.req.query('success');

  const org = await c.env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
    .bind(session.orgId).first<OrgRow>();
  if (!org) return c.text('Organization not found', 404);

  const isOwner = session.role === 'owner';

  return c.html(layout('Settings', '/settings', session, html`
    <h1>Organization Settings</h1>
    <p class="subtitle">Manage your organization details and preferences</p>

    ${error === 'slug_taken' ? html`<div class="alert alert-err">That slug is already taken. Choose another.</div>` : ''}
    ${error === 'forbidden'  ? html`<div class="alert alert-err">Only the owner can change these settings.</div>` : ''}
    ${success === '1'        ? html`<div class="alert alert-ok">Settings saved successfully.</div>` : ''}

    <div class="card">
      <div class="card-title">Organization Details</div>
      <form method="POST" action="/settings">
        <div class="grid-2">
          <div>
            <label>Organization Name</label>
            <input type="text" name="name" value="${org.name}" required ${!isOwner ? 'disabled' : ''}/>
          </div>
          <div>
            <label>Slug (URL identifier)</label>
            <input type="text" name="slug" value="${org.slug}" pattern="[a-z0-9\\-]+" ${!isOwner ? 'disabled' : ''}/>
          </div>
        </div>
        ${isOwner ? html`<button class="btn" type="submit">Save Changes</button>` : html`<p style="font-size:.8rem;color:var(--muted)">Only the org owner can edit settings.</p>`}
      </form>
    </div>

    <div class="card">
      <div class="card-title">Org Information</div>
      <table>
        <tr><th>Field</th><th>Value</th></tr>
        <tr><td>Org ID</td><td style="font-family:monospace;font-size:.8rem">${org.id}</td></tr>
        <tr><td>Plan</td><td><span class="badge" style="background:${PLAN_LABELS[org.plan]?.color ?? '#64748b'}30;color:${PLAN_LABELS[org.plan]?.color ?? '#64748b'}">${PLAN_LABELS[org.plan]?.label ?? org.plan}</span></td></tr>
        <tr><td>Created</td><td>${new Date(org.created_at * 1000).toLocaleDateString()}</td></tr>
        <tr><td>Stripe Customer</td><td style="font-family:monospace;font-size:.8rem">${org.stripe_customer_id ?? '—'}</td></tr>
      </table>
    </div>

    ${isOwner ? html`
    <div class="card">
      <div class="card-title" style="color:var(--err)">Danger Zone</div>
      <p style="font-size:.875rem;color:var(--muted);margin-bottom:1rem">
        Transfer ownership to another admin member of this organization.
      </p>
      <form method="POST" action="/settings/transfer">
        <label>New Owner Email</label>
        <input type="email" name="new_owner_email" placeholder="admin@company.com" style="max-width:320px"/>
        <button class="btn btn-danger" type="submit">Transfer Ownership</button>
      </form>
    </div>
    ` : ''}
  `));
});

app.post('/settings', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login');
  if (session.role !== 'owner') return c.redirect('/settings?error=forbidden');

  const body = await c.req.parseBody();
  const name = (body.name as string)?.trim();
  const slug = slugify((body.slug as string) || name);
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

  const existing = await c.env.DB.prepare('SELECT id FROM organizations WHERE slug = ? AND id != ?')
    .bind(slug, session.orgId).first();
  if (existing) return c.redirect('/settings?error=slug_taken');

  await c.env.DB.prepare('UPDATE organizations SET name = ?, slug = ?, updated_at = ? WHERE id = ?')
    .bind(name, slug, Math.floor(Date.now() / 1000), session.orgId).run();
  await writeAudit(c.env.DB, session.orgId, session.userId, 'org.settings.update', 'organization', session.orgId, ip);

  return c.redirect('/settings?success=1');
});

app.post('/settings/transfer', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login');
  if (session.role !== 'owner') return c.redirect('/settings?error=forbidden');

  const body = await c.req.parseBody();
  const email = (body.new_owner_email as string)?.toLowerCase().trim();
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

  const newOwner = await c.env.DB.prepare(
    `SELECT u.id FROM users u
     JOIN org_members om ON om.user_id = u.id AND om.org_id = ?
     WHERE u.email = ? AND om.accepted_at IS NOT NULL`,
  ).bind(session.orgId, email).first<{ id: string }>();

  if (!newOwner) return c.redirect('/settings?error=not_found');

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE org_members SET role = 'admin' WHERE org_id = ? AND user_id = ?")
      .bind(session.orgId, session.userId),
    c.env.DB.prepare("UPDATE org_members SET role = 'owner' WHERE org_id = ? AND user_id = ?")
      .bind(session.orgId, newOwner.id),
    c.env.DB.prepare('UPDATE organizations SET owner_id = ?, updated_at = ? WHERE id = ?')
      .bind(newOwner.id, Math.floor(Date.now() / 1000), session.orgId),
  ]);
  await writeAudit(c.env.DB, session.orgId, session.userId, 'org.owner.transfer', 'organization', session.orgId, ip);

  return c.redirect('/settings?success=1');
});

// ── Members ───────────────────────────────────────────────────────────────────

app.get('/members', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login?redirect=' + encodeURIComponent('https://platform.insighthunter.app/members'));

  const error   = c.req.query('error');
  const success = c.req.query('success');

  const members = await c.env.DB.prepare(
    `SELECT om.id, om.user_id, om.org_id, om.role, om.accepted_at, om.created_at,
            u.email, u.name
     FROM org_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = ?
     ORDER BY om.created_at ASC`,
  ).bind(session.orgId).all<MemberRow>();

  const pendingInvites = await c.env.DB.prepare(
    `SELECT vt.id, vt.token, vt.created_at, vt.expires_at, u2.email as invited_by_email
     FROM verification_tokens vt
     LEFT JOIN users u2 ON u2.id = (
       SELECT user_id FROM org_members WHERE org_id = ? AND role = 'owner' LIMIT 1
     )
     WHERE vt.type = 'invite' AND vt.used_at IS NULL AND vt.expires_at > ?
       AND vt.metadata_json LIKE ?`,
  ).bind(session.orgId, Math.floor(Date.now() / 1000), `%"org_id":"${session.orgId}"%`)
    .all<{ id: string; token: string; created_at: number; expires_at: number; invited_by_email: string }>();

  const isAdminPlus = session.role === 'owner' || session.role === 'admin';
  const plan = session.plan as OrgPlan;
  const maxMembers = (PLAN_FEATURES[plan]?.members as number) ?? 3;
  const atLimit = (members.results?.length ?? 0) >= maxMembers;

  return c.html(layout('Members', '/members', session, html`
    <h1>Team Members</h1>
    <p class="subtitle">${members.results?.length ?? 0} of ${maxMembers} seats used on ${PLAN_LABELS[plan]?.label} plan</p>

    ${error === 'limit'     ? html`<div class="alert alert-err">Member limit reached for your plan. <a href="/billing" style="color:var(--brand)">Upgrade →</a></div>` : ''}
    ${error === 'not_found' ? html`<div class="alert alert-err">User not found in this org.</div>` : ''}
    ${success === 'invited' ? html`<div class="alert alert-ok">Invite sent successfully.</div>` : ''}
    ${success === 'removed' ? html`<div class="alert alert-ok">Member removed.</div>` : ''}
    ${success === 'role'    ? html`<div class="alert alert-ok">Role updated.</div>` : ''}

    <div class="card">
      <div class="card-title">Members</div>
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th>${isAdminPlus ? html`<th>Actions</th>` : ''}</tr></thead>
        <tbody>
          ${members.results?.map(m => html`
            <tr>
              <td style="font-weight:600">${m.name}</td>
              <td style="color:var(--muted)">${m.email}</td>
              <td>
                <span class="badge" style="background:${roleColor(m.role)}30;color:${roleColor(m.role)}">${m.role}</span>
                ${m.accepted_at === null ? html` <span class="badge" style="background:#f59e0b20;color:var(--warn)">pending</span>` : ''}
              </td>
              <td style="color:var(--muted);font-size:.8rem">${m.created_at ? timeAgo(m.created_at) : '—'}</td>
              ${isAdminPlus && m.user_id !== session.userId ? html`
                <td style="display:flex;gap:.5rem;flex-wrap:wrap">
                  ${session.role === 'owner' ? html`
                    <form method="POST" action="/api/members/${m.id}/role" style="display:flex;gap:.25rem">
                      <select name="role" style="width:auto;margin:0;padding:.3rem .5rem;font-size:.75rem">
                        <option value="admin"   ${m.role === 'admin'   ? 'selected' : ''}>Admin</option>
                        <option value="member"  ${m.role === 'member'  ? 'selected' : ''}>Member</option>
                        <option value="viewer"  ${m.role === 'viewer'  ? 'selected' : ''}>Viewer</option>
                      </select>
                      <button class="btn" style="padding:.3rem .65rem;font-size:.75rem">Set</button>
                    </form>
                  ` : ''}
                  <form method="POST" action="/api/members/${m.id}/remove">
                    <button class="btn btn-danger" style="padding:.3rem .65rem;font-size:.75rem"
                      onclick="return confirm('Remove this member?')">Remove</button>
                  </form>
                </td>
              ` : html`<td></td>`}
            </tr>
          `)}
        </tbody>
      </table>
    </div>

    ${isAdminPlus && !atLimit ? html`
    <div class="card">
      <div class="card-title">Invite New Member</div>
      <form method="POST" action="/api/members/invite">
        <div class="grid-2">
          <div>
            <label>Email Address</label>
            <input type="email" name="email" placeholder="colleague@company.com" required/>
          </div>
          <div>
            <label>Role</label>
            <select name="role">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <button class="btn" type="submit">Send Invite</button>
      </form>
    </div>
    ` : atLimit ? html`
    <div class="card">
      <div class="card-title">Member Limit Reached</div>
      <p style="font-size:.875rem;color:var(--muted);margin-bottom:1rem">Your ${PLAN_LABELS[plan]?.label} plan supports up to ${maxMembers} members.</p>
      <a href="/billing" class="btn">Upgrade Plan →</a>
    </div>
    ` : ''}

    ${pendingInvites.results?.length ? html`
    <div class="card">
      <div class="card-title">Pending Invites</div>
      <table>
        <thead><tr><th>Token (first 8)</th><th>Expires</th></tr></thead>
        <tbody>
          ${pendingInvites.results.map(i => html`
            <tr>
              <td style="font-family:monospace;font-size:.8rem">${i.token.slice(0, 8)}…</td>
              <td style="color:var(--muted);font-size:.8rem">${new Date(i.expires_at * 1000).toLocaleString()}</td>
            </tr>
          `)}
        </tbody>
      </table>
    </div>
    ` : ''}
  `));
});

// POST /api/members/invite
app.post('/api/members/invite', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login');
  if (session.role !== 'owner' && session.role !== 'admin') return c.redirect('/members?error=forbidden');

  const plan = session.plan as OrgPlan;
  const maxMembers = (PLAN_FEATURES[plan]?.members as number) ?? 3;
  const count = await c.env.DB.prepare('SELECT COUNT(*) as n FROM org_members WHERE org_id = ?')
    .bind(session.orgId).first<{ n: number }>();
  if ((count?.n ?? 0) >= maxMembers) return c.redirect('/members?error=limit');

  const body  = await c.req.parseBody();
  const email = (body.email as string)?.toLowerCase().trim();
  const role  = (body.role as OrgRole) || 'member';
  const ip    = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

  const inviteToken = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await c.env.DB.prepare(
    `INSERT INTO verification_tokens (id, user_id, token, type, expires_at, metadata_json)
     VALUES (?,?,?,?,?,?)`,
  ).bind(
    crypto.randomUUID(),
    session.userId,
    inviteToken,
    'invite',
    now + 60 * 60 * 48, // 48 hours
    JSON.stringify({ org_id: session.orgId, email, role }),
  ).run();

  await writeAudit(c.env.DB, session.orgId, session.userId, 'member.invite', 'org_member', null, ip);

  // Accept invite URL — handled by insighthunter-auth /accept-invite?token=...
  const acceptUrl = `${c.env.AUTH_URL}/accept-invite?token=${inviteToken}`;
  // Email sending is handled by auth Worker; we just log and redirect
  // In production, enqueue to Dispatch (queue) for async delivery
  console.log(`[invite] ${email} → ${acceptUrl}`);

  return c.redirect('/members?success=invited');
});

// POST /api/members/:memberId/role
app.post('/api/members/:memberId/role', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login');
  if (session.role !== 'owner') return c.redirect('/members?error=forbidden');

  const memberId = c.req.param('memberId');
  const body = await c.req.parseBody();
  const role = body.role as OrgRole;
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

  const member = await c.env.DB.prepare('SELECT * FROM org_members WHERE id = ? AND org_id = ?')
    .bind(memberId, session.orgId).first<MemberRow>();
  if (!member) return c.redirect('/members?error=not_found');
  if (member.user_id === session.userId) return c.redirect('/members?error=self');

  await c.env.DB.prepare('UPDATE org_members SET role = ? WHERE id = ?').bind(role, memberId).run();
  await writeAudit(c.env.DB, session.orgId, session.userId, 'member.role.update', 'org_member', memberId, ip);

  return c.redirect('/members?success=role');
});

// POST /api/members/:memberId/remove
app.post('/api/members/:memberId/remove', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login');
  if (session.role !== 'owner' && session.role !== 'admin') return c.redirect('/members?error=forbidden');

  const memberId = c.req.param('memberId');
  const ip = c.req.header('CF-Connecting-IP') ?? '0.0.0.0';

  const member = await c.env.DB.prepare('SELECT * FROM org_members WHERE id = ? AND org_id = ?')
    .bind(memberId, session.orgId).first<MemberRow>();
  if (!member) return c.redirect('/members?error=not_found');
  if (member.role === 'owner') return c.redirect('/members?error=cannot_remove_owner');
  if (member.user_id === session.userId) return c.redirect('/members?error=self');

  await c.env.DB.prepare('DELETE FROM org_members WHERE id = ?').bind(memberId).run();
  await writeAudit(c.env.DB, session.orgId, session.userId, 'member.remove', 'org_member', memberId, ip);

  return c.redirect('/members?success=removed');
});

// ── Billing ───────────────────────────────────────────────────────────────────

app.get('/billing', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login?redirect=' + encodeURIComponent('https://platform.insighthunter.app/billing'));

  const org = await c.env.DB.prepare('SELECT * FROM organizations WHERE id = ?')
    .bind(session.orgId).first<OrgRow>();
  if (!org) return c.text('Not found', 404);

  const currentPlan = org.plan as OrgPlan;
  const plans: OrgPlan[] = ['starter', 'growth', 'pro', 'enterprise'];

  return c.html(layout('Billing', '/billing', session, html`
    <h1>Billing &amp; Plan</h1>
    <p class="subtitle">Manage your subscription and usage</p>

    <div class="card">
      <div class="card-title">Current Plan</div>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <span class="badge" style="font-size:.9rem;padding:.4rem 1rem;background:${PLAN_LABELS[currentPlan]?.color}30;color:${PLAN_LABELS[currentPlan]?.color}">
          ${PLAN_LABELS[currentPlan]?.label}
        </span>
        <span style="font-size:1.1rem;font-weight:700">${PLAN_LABELS[currentPlan]?.price}</span>
        ${org.stripe_subscription_id ? html`<span style="font-size:.75rem;color:var(--muted)">Sub: ${org.stripe_subscription_id}</span>` : ''}
      </div>
      ${session.role === 'owner' ? html`
        <a href="${c.env.STRIPE_PORTAL_URL}" class="btn" target="_blank">Manage Subscription →</a>
      ` : html`<p style="font-size:.875rem;color:var(--muted)">Only the org owner can manage billing.</p>`}
    </div>

    <div class="card">
      <div class="card-title">Plan Comparison</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem">
        ${plans.map(p => {
          const features = PLAN_FEATURES[p];
          const meta = PLAN_LABELS[p];
          const isCurrent = p === currentPlan;
          return html`
            <div class="plan-card${isCurrent ? ' plan-current' : ''}">
              <div style="font-weight:800;color:${meta.color}">${meta.label}</div>
              <div style="font-size:1.25rem;font-weight:700">${meta.price}</div>
              <div style="font-size:.75rem;color:var(--muted);margin-top:.5rem">
                👤 Up to ${features.members} members<br/>
                ${features.bookkeeping ? '✅' : '❌'} Bookkeeping<br/>
                ${features.insights   ? '✅' : '❌'} Insights<br/>
                ${features.advisor    ? '✅' : '❌'} AI Advisor<br/>
                ${features.payroll    ? '✅' : '❌'} Payroll<br/>
                ${features.reports    ? '✅' : '❌'} Reports<br/>
                ${features.whitelabel ? '✅' : '❌'} White Label
              </div>
              ${isCurrent ? html`<span style="font-size:.7rem;font-weight:700;color:var(--brand)">CURRENT PLAN</span>` : ''}
            </div>
          `;
        })}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Feature Access</div>
      <table>
        <thead><tr><th>Feature</th><th>Status</th></tr></thead>
        <tbody>
          ${Object.entries(PLAN_FEATURES[currentPlan]).map(([key, val]) => html`
            <tr>
              <td style="text-transform:capitalize">${key}</td>
              <td>${typeof val === 'boolean'
                ? (val ? html`<span style="color:var(--ok)">✅ Enabled</span>` : html`<span style="color:var(--muted)">❌ Upgrade required</span>`)
                : html`<span style="color:var(--brand)">${val}</span>`
              }</td>
            </tr>
          `)}
        </tbody>
      </table>
    </div>
  `));
});

// ── Audit Log ─────────────────────────────────────────────────────────────────

app.get('/audit', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.redirect(c.env.AUTH_URL + '/login?redirect=' + encodeURIComponent('https://platform.insighthunter.app/audit'));
  if (session.role !== 'owner' && session.role !== 'admin') return c.redirect('/settings?error=forbidden');

  const page   = parseInt(c.req.query('page') ?? '1', 10);
  const limit  = 50;
  const offset = (page - 1) * limit;

  const rows = await c.env.DB.prepare(
    `SELECT al.*, u.email as user_email
     FROM audit_logs al
     JOIN users u ON u.id = al.user_id
     WHERE al.org_id = ?
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
  ).bind(session.orgId, limit, offset).all<AuditRow>();

  const total = await c.env.DB.prepare(
    'SELECT COUNT(*) as n FROM audit_logs WHERE org_id = ?',
  ).bind(session.orgId).first<{ n: number }>();

  const totalPages = Math.ceil((total?.n ?? 0) / limit);

  return c.html(layout('Audit Log', '/audit', session, html`
    <h1>Audit Log</h1>
    <p class="subtitle">${total?.n ?? 0} events recorded for your organization</p>

    <div class="card">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Resource</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          ${rows.results?.map(r => html`
            <tr>
              <td style="font-size:.75rem;color:var(--muted);white-space:nowrap">${r.created_at}</td>
              <td style="font-size:.8rem">${r.user_email}</td>
              <td><span style="font-family:monospace;font-size:.78rem;color:var(--brand)">${r.action}</span></td>
              <td style="font-size:.78rem;color:var(--muted)">${r.resource_type}${r.resource_id ? html` <span style="font-family:monospace">${r.resource_id.slice(0, 8)}…</span>` : ''}</td>
              <td style="font-size:.75rem;color:var(--muted)">${r.ip_address ?? '—'}</td>
            </tr>
          `)}
        </tbody>
      </table>

      ${totalPages > 1 ? html`
        <div style="display:flex;gap:.5rem;margin-top:1rem;align-items:center">
          ${page > 1 ? html`<a href="/audit?page=${page - 1}" class="btn btn-ghost">← Prev</a>` : ''}
          <span style="font-size:.8rem;color:var(--muted)">Page ${page} of ${totalPages}</span>
          ${page < totalPages ? html`<a href="/audit?page=${page + 1}" class="btn btn-ghost">Next →</a>` : ''}
        </div>
      ` : ''}
    </div>
  `));
});

// ── Internal APIs (called by other Workers) ───────────────────────────────────

// GET /api/org — returns org + plan, used by dashboard and sub-apps
app.get('/api/org', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const org = await c.env.DB.prepare(
    'SELECT id, name, slug, plan, owner_id, stripe_customer_id, created_at FROM organizations WHERE id = ?',
  ).bind(session.orgId).first<OrgRow>();

  if (!org) return c.json({ error: 'Not found' }, 404);

  return c.json({
    org,
    member: { userId: session.userId, role: session.role, email: session.email, name: session.name },
  });
});

// GET /api/entitlements — plan feature flags, KV-cached 5 min
app.get('/api/entitlements', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const cacheKey = `entitlements:${session.orgId}`;
  const cached = await c.env.KV_ENTITLEMENTS.get(cacheKey, 'json');
  if (cached) return c.json(cached);

  const org = await c.env.DB.prepare('SELECT plan FROM organizations WHERE id = ?')
    .bind(session.orgId).first<{ plan: OrgPlan }>();
  const plan = org?.plan ?? 'starter';
  const features = PLAN_FEATURES[plan] ?? PLAN_FEATURES.starter;

  const payload = { orgId: session.orgId, plan, features, cachedAt: Date.now() };
  await c.env.KV_ENTITLEMENTS.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 });

  return c.json(payload);
});

// GET /api/members — list for internal use (e.g. notification targeting)
app.get('/api/members', async (c) => {
  const session = await requireSession(c, c.req.header('cookie'));
  if (!session) return c.json({ error: 'Unauthorized' }, 401);

  const members = await c.env.DB.prepare(
    `SELECT om.id, om.user_id, om.role, u.email, u.name
     FROM org_members om JOIN users u ON u.id = om.user_id
     WHERE om.org_id = ? AND om.accepted_at IS NOT NULL`,
  ).bind(session.orgId).all<{ id: string; user_id: string; role: string; email: string; name: string }>();

  return c.json({ members: members.results });
});

// ── Root redirect ─────────────────────────────────────────────────────────────

app.get('/', (c) => c.redirect('/settings'));

export default app;
