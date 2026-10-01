// Session verification — calls insighthunter-auth over its service binding.
// insighthunter-auth has no separate "organizations" table (see schema.sql):
// each user IS the tenant, so orgId == userId everywhere downstream.

export async function verifySession(request, env) {
  const cookie = request.headers.get("Cookie") ?? "";
  const authHeader = request.headers.get("Authorization");
  const verifyReq = new Request(`${env.AUTH_ORIGIN}/session/verify`, {
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });
  let res;
  try {
    res = await env.AUTH_SERVICE.fetch(verifyReq);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.valid) return null;
  return {
    userId: data.userId,
    email: data.email,
    name: data.name,
    orgName: data.orgName,
    role: data.role,
    tier: data.tier,
  };
}

// Headers every downstream module Worker expects (X-* pattern used by
// insighthunter-invoicing/bills/payroll/insights, plus the lowercase
// x-organization-id/x-user-id pattern used by insighthunter-ledger).
export function identityHeaders(session) {
  const orgId = session.userId;
  return {
    "X-User-Id": session.userId,
    "X-Org-Id": orgId,
    "X-User-Role": session.role,
    "X-User-Email": session.email,
    "X-User-Name": session.name,
    "X-Org-Name": session.orgName,
    "X-Org-Plan": session.tier,
    "x-organization-id": orgId,
    "x-user-id": session.userId,
  };
}
