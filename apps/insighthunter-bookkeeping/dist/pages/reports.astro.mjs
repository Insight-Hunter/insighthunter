import { c as createComponent, r as renderComponent, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { $ as $$AppLayout } from '../chunks/AppLayout_0Czg83ng.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
/* empty css                                   */
export { renderers } from '../renderers.mjs';

function ReportCard({ title, type, companyId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const API_URL = "http://localhost:8787";
  useEffect(() => {
    loadReport();
  }, [type]);
  async function loadReport() {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/${type}`
      );
      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Failed to load report:", error);
    } finally {
      setLoading(false);
    }
  }
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "report-card loading", children: "Loading..." });
  }
  if (!report) {
    return /* @__PURE__ */ jsx("div", { className: "report-card error", children: "Failed to load report" });
  }
  return /* @__PURE__ */ jsxs("div", { className: "report-card", children: [
    /* @__PURE__ */ jsx("h2", { children: title }),
    type === "balance-sheet" && /* @__PURE__ */ jsxs("div", { className: "balance-sheet", children: [
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h3", { children: "Assets" }),
        /* @__PURE__ */ jsxs("div", { className: "subsection", children: [
          /* @__PURE__ */ jsx("h4", { children: "Current Assets" }),
          report.assets.currentAssets.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
            /* @__PURE__ */ jsx("span", { children: item.name }),
            /* @__PURE__ */ jsxs("span", { children: [
              "$",
              item.amount.toFixed(2)
            ] })
          ] }, i))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "subsection", children: [
          /* @__PURE__ */ jsx("h4", { children: "Fixed Assets" }),
          report.assets.fixedAssets.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
            /* @__PURE__ */ jsx("span", { children: item.name }),
            /* @__PURE__ */ jsxs("span", { children: [
              "$",
              item.amount.toFixed(2)
            ] })
          ] }, i))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "total-line", children: [
          /* @__PURE__ */ jsx("strong", { children: "Total Assets" }),
          /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            report.assets.total.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h3", { children: "Liabilities & Equity" }),
        /* @__PURE__ */ jsxs("div", { className: "subsection", children: [
          /* @__PURE__ */ jsx("h4", { children: "Liabilities" }),
          [
            ...report.liabilities.currentLiabilities,
            ...report.liabilities.longTermLiabilities
          ].map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
            /* @__PURE__ */ jsx("span", { children: item.name }),
            /* @__PURE__ */ jsxs("span", { children: [
              "$",
              item.amount.toFixed(2)
            ] })
          ] }, i))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "subsection", children: [
          /* @__PURE__ */ jsx("h4", { children: "Equity" }),
          report.equity.items.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
            /* @__PURE__ */ jsx("span", { children: item.name }),
            /* @__PURE__ */ jsxs("span", { children: [
              "$",
              item.amount.toFixed(2)
            ] })
          ] }, i))
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "total-line", children: [
          /* @__PURE__ */ jsx("strong", { children: "Total Liabilities & Equity" }),
          /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            (report.liabilities.total + report.equity.total).toFixed(2)
          ] })
        ] })
      ] })
    ] }),
    type === "profit-loss" && /* @__PURE__ */ jsxs("div", { className: "profit-loss", children: [
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h3", { children: "Revenue" }),
        report.revenue.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
          /* @__PURE__ */ jsx("span", { children: item.name }),
          /* @__PURE__ */ jsxs("span", { children: [
            "$",
            item.amount.toFixed(2)
          ] })
        ] }, i)),
        /* @__PURE__ */ jsxs("div", { className: "total-line", children: [
          /* @__PURE__ */ jsx("strong", { children: "Total Revenue" }),
          /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            report.totalRevenue.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h3", { children: "Cost of Goods Sold" }),
        report.costOfGoodsSold.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
          /* @__PURE__ */ jsx("span", { children: item.name }),
          /* @__PURE__ */ jsxs("span", { children: [
            "$",
            item.amount.toFixed(2)
          ] })
        ] }, i)),
        /* @__PURE__ */ jsxs("div", { className: "total-line", children: [
          /* @__PURE__ */ jsx("strong", { children: "Total COGS" }),
          /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            report.totalCOGS.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "gross-profit", children: [
        /* @__PURE__ */ jsx("strong", { children: "Gross Profit" }),
        /* @__PURE__ */ jsxs("strong", { children: [
          "$",
          report.grossProfit.toFixed(2)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h3", { children: "Expenses" }),
        report.expenses.map((item, i) => /* @__PURE__ */ jsxs("div", { className: "line-item", children: [
          /* @__PURE__ */ jsx("span", { children: item.name }),
          /* @__PURE__ */ jsxs("span", { children: [
            "$",
            item.amount.toFixed(2)
          ] })
        ] }, i)),
        /* @__PURE__ */ jsxs("div", { className: "total-line", children: [
          /* @__PURE__ */ jsx("strong", { children: "Total Expenses" }),
          /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            report.totalExpenses.toFixed(2)
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "net-income", children: [
        /* @__PURE__ */ jsx("strong", { children: "Net Income" }),
        /* @__PURE__ */ jsxs("strong", { className: report.netIncome >= 0 ? "positive" : "negative", children: [
          "$",
          report.netIncome.toFixed(2)
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("button", { onClick: loadReport, className: "btn-refresh", children: "Refresh Report" })
  ] });
}

const $$Reports = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Financial Reports", "data-astro-cid-k5zskagf": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="reports-page" data-astro-cid-k5zskagf> <h1 data-astro-cid-k5zskagf>Financial Reports</h1> <div class="report-types" data-astro-cid-k5zskagf> ${renderComponent($$result2, "ReportCard", ReportCard, { "client:load": true, "title": "Balance Sheet", "type": "balance-sheet", "companyId": "default", "client:component-hydration": "load", "client:component-path": "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/bookkeeping/ReportCard.tsx", "client:component-export": "default", "data-astro-cid-k5zskagf": true })} ${renderComponent($$result2, "ReportCard", ReportCard, { "client:load": true, "title": "Profit & Loss", "type": "profit-loss", "companyId": "default", "client:component-hydration": "load", "client:component-path": "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/bookkeeping/ReportCard.tsx", "client:component-export": "default", "data-astro-cid-k5zskagf": true })} </div> </div> ` })} `;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/reports.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/reports.astro";
const $$url = "/reports";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Reports,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
