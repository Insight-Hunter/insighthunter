export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
  PUBLIC_APP_URL: string;
  AUTH_URL: string;
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/health") {
      return json({ ok: true, service: "tenant-worker" });
    }

    if (url.pathname.startsWith("/api/bizforma")) {
      return json({ ok: true, app: "bizforma", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/bookkeeping")) {
      return json({ ok: true, app: "bookkeeping", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/payroll")) {
      return json({ ok: true, app: "payroll", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/report")) {
      return json({ ok: true, app: "report", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/scout")) {
      return json({ ok: true, app: "scout", path: url.pathname });
    }

    if (url.pathname.startsWith("/api/pbx")) {
      return json({ ok: true, app: "pbx", path: url.pathname });
    }

    return json({ ok: true, message: "tenant online" });
  }
};
