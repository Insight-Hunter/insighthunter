// This is the Worker script template injected for every Insight Hunter user.
// env bindings vary per plan tier — only bound resources are accessible.
export const USER_WORKER_TEMPLATE = /* javascript */ `
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Basic routing inside the user Worker
    if (url.pathname.startsWith("/api/transactions")) {
      const rows = await env.USER_DB
        .prepare("SELECT * FROM transactions ORDER BY date DESC LIMIT 100")
        .all();
      return Response.json(rows.results);
    }

    if (url.pathname.startsWith("/api/accounts")) {
      const rows = await env.USER_DB
        .prepare("SELECT * FROM accounts")
        .all();
      return Response.json(rows.results);
    }

    // KV cache example (Pro+ plans only)
    if (url.pathname.startsWith("/api/dashboard") && env.USER_KV) {
      const cached = await env.USER_KV.get("dashboard_cache", "json");
      if (cached) return Response.json(cached);
    }

    // AI summarization (Pro+ plans only)
    if (url.pathname.startsWith("/api/insights") && env.AI) {
      const txns = await env.USER_DB.prepare("SELECT * FROM transactions LIMIT 20").all();
      const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        messages: [
          { role: "system", content: "You are a financial analyst. Summarize spending patterns concisely." },
          { role: "user",   content: JSON.stringify(txns.results) },
        ],
      });
      return Response.json({ summary: response.response });
    }

    return new Response("Insight Hunter User Worker", { status: 200 });
  }
};
`;
