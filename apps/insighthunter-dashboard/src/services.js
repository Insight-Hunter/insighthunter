export async function callService(binding, path, session, init = {}) {
  const req = new Request(`https://service.internal${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...identityHeadersFor(session),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const res = await binding.fetch(req);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const message = data?.error || `Request to service failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function identityHeadersFor(session) {
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
