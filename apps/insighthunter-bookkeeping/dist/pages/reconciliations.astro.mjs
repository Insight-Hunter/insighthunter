import { c as createComponent, r as renderComponent, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { $ as $$AppLayout } from '../chunks/AppLayout_0Czg83ng.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
/* empty css                                           */
export { renderers } from '../renderers.mjs';

function ReconciliationWizard({ companyId }) {
  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState("cash");
  const [statementDate, setStatementDate] = useState("");
  const [endingBalance, setEndingBalance] = useState("");
  const [result, setResult] = useState(null);
  const API_URL = "http://localhost:8787";
  async function reconcile() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId,
            statement: {
              date: statementDate,
              endingBalance: parseFloat(endingBalance)
            }
          })
        }
      );
      const data = await response.json();
      setResult(data);
      setStep(3);
    } catch (error) {
      console.error("Reconciliation failed:", error);
    }
  }
  return /* @__PURE__ */ jsxs("div", { className: "reconciliation-wizard", children: [
    /* @__PURE__ */ jsxs("div", { className: "wizard-steps", children: [
      /* @__PURE__ */ jsx("div", { className: `step ${step >= 1 ? "active" : ""}`, children: "1. Select Account" }),
      /* @__PURE__ */ jsx("div", { className: `step ${step >= 2 ? "active" : ""}`, children: "2. Enter Statement" }),
      /* @__PURE__ */ jsx("div", { className: `step ${step >= 3 ? "active" : ""}`, children: "3. Review" })
    ] }),
    step === 1 && /* @__PURE__ */ jsxs("div", { className: "wizard-content", children: [
      /* @__PURE__ */ jsx("h3", { children: "Select Account to Reconcile" }),
      /* @__PURE__ */ jsxs(
        "select",
        {
          value: accountId,
          onChange: (e) => setAccountId(e.target.value),
          className: "account-select",
          children: [
            /* @__PURE__ */ jsx("option", { value: "cash", children: "Cash - Checking Account" }),
            /* @__PURE__ */ jsx("option", { value: "savings", children: "Cash - Savings Account" }),
            /* @__PURE__ */ jsx("option", { value: "credit-card", children: "Credit Card" })
          ]
        }
      ),
      /* @__PURE__ */ jsx("button", { onClick: () => setStep(2), className: "btn-primary", children: "Next" })
    ] }),
    step === 2 && /* @__PURE__ */ jsxs("div", { className: "wizard-content", children: [
      /* @__PURE__ */ jsx("h3", { children: "Enter Bank Statement Details" }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { children: "Statement Date" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "date",
            value: statementDate,
            onChange: (e) => setStatementDate(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-group", children: [
        /* @__PURE__ */ jsx("label", { children: "Ending Balance" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "number",
            step: "0.01",
            value: endingBalance,
            onChange: (e) => setEndingBalance(e.target.value),
            placeholder: "0.00"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "button-group", children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setStep(1), className: "btn-secondary", children: "Back" }),
        /* @__PURE__ */ jsx("button", { onClick: reconcile, className: "btn-primary", children: "Reconcile" })
      ] })
    ] }),
    step === 3 && result && /* @__PURE__ */ jsxs("div", { className: "wizard-content", children: [
      /* @__PURE__ */ jsx("h3", { children: "Reconciliation Results" }),
      /* @__PURE__ */ jsxs("div", { className: "reconciliation-results", children: [
        /* @__PURE__ */ jsxs("div", { className: "result-row", children: [
          /* @__PURE__ */ jsx("span", { children: "Book Balance:" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "$",
            result.bookBalance.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "result-row", children: [
          /* @__PURE__ */ jsx("span", { children: "Statement Balance:" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "$",
            result.statementBalance.toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "result-row", children: [
          /* @__PURE__ */ jsx("span", { children: "Difference:" }),
          /* @__PURE__ */ jsxs("span", { className: result.difference === 0 ? "balanced" : "unbalanced", children: [
            "$",
            Math.abs(result.difference).toFixed(2)
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "reconciliation-status", children: result.reconciled ? /* @__PURE__ */ jsx("div", { className: "status-success", children: "✓ Account Reconciled" }) : /* @__PURE__ */ jsx("div", { className: "status-warning", children: "⚠ Difference found - please review transactions" }) })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            setStep(1);
            setResult(null);
          },
          className: "btn-primary",
          children: "Start New Reconciliation"
        }
      )
    ] })
  ] });
}

const $$Reconciliations = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Bank Reconciliation", "data-astro-cid-4bcezwbq": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="reconciliation-page" data-astro-cid-4bcezwbq> <h1 data-astro-cid-4bcezwbq>Bank Reconciliation</h1> ${renderComponent($$result2, "ReconciliationWizard", ReconciliationWizard, { "client:load": true, "companyId": "default", "client:component-hydration": "load", "client:component-path": "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/ReconciliationWizard", "client:component-export": "default", "data-astro-cid-4bcezwbq": true })} </div> ` })} `;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/reconciliations.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/reconciliations.astro";
const $$url = "/reconciliations";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Reconciliations,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
