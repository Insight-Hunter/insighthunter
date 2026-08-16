// apps/auth/src/routes/org.ts
// Organization creation, member invitations, role management

import { writeAudit } from "@insighthunter/audit";
import type { OrgRole } from "@insighthunter/authz";
import { randomId } from "@insighthunter/kernel";
import { Hono } from "hono";
import { verifyToken } from "../lib/tokens";

type Bindings = { DB: D1Database; JWT_SECRET: string; RESEND_API_KEY: string };

export const orgRoutes = new Hono<{ Bindings: Bindings }>();

// POST /auth/org/create
orgRoutes.post("/create", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const user = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const { name, slug } = await c.req.json<{ name: string; slug: string }>();

  const orgId = randomId("org");
  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO organizations (id, name, slug, plan, status)
       VALUES (?1, ?2, ?3, 'starter', 'active')`,
    ).bind(orgId, name, slugClean),
    c.env.DB.prepare(
      `INSERT INTO org_members (id, org_id, user_id, role, status, joined_at)
       VALUES (?1, ?2, ?3, 'owner', 'active', datetime('now'))`,
    ).bind(randomId("mbr"), orgId, user.sub),
  ]);

  await writeAudit(c.env.DB, {
    org_id: orgId,
    user_id: user.sub,
    action: "org.created",
    resource_type: "organization",
    resource_id: orgId,
  });

  return c.json({ ok: true, orgId, slug: slugClean }, 201);
});

// POST /auth/org/invite
orgRoutes.post("/invite", async (c) => {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  const caller = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const { email, role } = await c.req.json<{ email: string; role: OrgRole }>();
  const inviteToken = randomId("inv");

  // Store pending invite in KV (72hr TTL)
  // In production use D1 invitations table
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO org_members (id, org_id, user_id, role, status, invited_by)
     VALUES (?1, ?2, ?3, ?4, 'invited', ?5)`,
  )
    .bind(randomId("mbr"), caller.org, email, role, caller.sub)
    .run();

  await writeAudit(c.env.DB, {
    org_id: caller.org,
    user_id: caller.sub,
    action: "org.member_invited",
    metadata: { invitedEmail: email, role },
  });

  return c.json({ ok: true, invited: email, role });
});
