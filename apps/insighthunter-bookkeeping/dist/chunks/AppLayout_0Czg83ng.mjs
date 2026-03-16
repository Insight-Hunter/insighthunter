import { c as createComponent, d as renderHead, r as renderComponent, e as renderSlot, b as renderTemplate, f as createAstro } from './astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { jsxs, jsx } from 'react/jsx-runtime';
import { f as FiHome, g as FiUsers, h as FiDollarSign, i as FiFileText, j as FiSettings } from './index_IorU0Hm2.mjs';
/* empty css                           */
/* empty css                          */

function NavBar() {
  return /* @__PURE__ */ jsxs("nav", { className: "navbar", children: [
    /* @__PURE__ */ jsx("div", { className: "nav-brand", children: /* @__PURE__ */ jsx("h1", { children: "InsightHunter" }) }),
    /* @__PURE__ */ jsxs("div", { className: "nav-links", children: [
      /* @__PURE__ */ jsxs("a", { href: "/dashboard", className: "nav-link", children: [
        /* @__PURE__ */ jsx(FiHome, {}),
        " Dashboard"
      ] }),
      /* @__PURE__ */ jsxs("a", { href: "/clients", className: "nav-link", children: [
        /* @__PURE__ */ jsx(FiUsers, {}),
        " Clients"
      ] }),
      /* @__PURE__ */ jsxs("a", { href: "/reconciliation", className: "nav-link", children: [
        /* @__PURE__ */ jsx(FiDollarSign, {}),
        " Reconciliation"
      ] }),
      /* @__PURE__ */ jsxs("a", { href: "/reports", className: "nav-link", children: [
        /* @__PURE__ */ jsx(FiFileText, {}),
        " Reports"
      ] }),
      /* @__PURE__ */ jsxs("a", { href: "/settings", className: "nav-link", children: [
        /* @__PURE__ */ jsx(FiSettings, {}),
        " Settings"
      ] })
    ] })
  ] });
}

const $$Astro = createAstro();
const $$AppLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AppLayout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="en" data-astro-cid-j3tygqaf> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} - InsightHunter Bookkeeping</title><link rel="manifest" href="/manifest.webmanifest">${renderHead()}</head> <body data-astro-cid-j3tygqaf> ${renderComponent($$result, "NavBar", NavBar, { "client:load": true, "client:component-hydration": "load", "client:component-path": "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/shared/NavBar.tsx", "client:component-export": "default", "data-astro-cid-j3tygqaf": true })} <main data-astro-cid-j3tygqaf> ${renderSlot($$result, $$slots["default"])} </main> </body></html>`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/layouts/AppLayout.astro", void 0);

export { $$AppLayout as $ };
