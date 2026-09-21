// insighthunter-main — DECOMMISSIONED
// This Worker has been split into:
//   • apps/insighthunter-marketing  →  insighthunter.app  (public marketing site)
//   • apps/insighthunter-dashboard  →  app.insighthunter.app  (authenticated dashboard)
//
// This stub issues permanent redirects so any stray traffic or lingering DNS
// entries never reach a broken page. It should not be re-enabled as a route.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Authenticated paths → dashboard
    if (
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/app")
    ) {
      return Response.redirect(`https://app.insighthunter.app${url.pathname}${url.search}`, 301);
    }

    // Everything else → marketing site
    return Response.redirect(`https://insighthunter.app${url.pathname}${url.search}`, 301);
  },
} satisfies ExportedHandler;
