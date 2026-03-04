import { c as createComponent, r as renderComponent, a as renderScript, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { $ as $$AppLayout } from '../chunks/AppLayout_0Czg83ng.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
import { F as FiChevronUp, a as FiChevronDown, b as FiPlus } from '../chunks/index_IorU0Hm2.mjs';
/* empty css                                     */
export { renderers } from '../renderers.mjs';

function TransactionRow({ transaction }) {
  const [expanded, setExpanded] = useState(false);
  const total = transaction.entries.filter((e) => e.type === "debit").reduce((sum, e) => sum + e.amount, 0);
  return /* @__PURE__ */ jsxs("div", { className: "transaction-row", children: [
    /* @__PURE__ */ jsxs("div", { className: "transaction-summary", onClick: () => setExpanded(!expanded), children: [
      /* @__PURE__ */ jsxs("div", { className: "summary-left", children: [
        /* @__PURE__ */ jsx("button", { className: "expand-btn", children: expanded ? /* @__PURE__ */ jsx(FiChevronUp, {}) : /* @__PURE__ */ jsx(FiChevronDown, {}) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "transaction-date", children: transaction.date }),
          /* @__PURE__ */ jsx("div", { className: "transaction-description", children: transaction.description })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "transaction-amount", children: [
        "$",
        total.toFixed(2)
      ] })
    ] }),
    expanded && /* @__PURE__ */ jsx("div", { className: "transaction-details", children: /* @__PURE__ */ jsxs("table", { children: [
      /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { children: "Account" }),
        /* @__PURE__ */ jsx("th", { children: "Debit" }),
        /* @__PURE__ */ jsx("th", { children: "Credit" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: transaction.entries.map((entry, index) => /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { children: entry.accountName }),
        /* @__PURE__ */ jsx("td", { children: entry.type === "debit" ? `$${entry.amount.toFixed(2)}` : "-" }),
        /* @__PURE__ */ jsx("td", { children: entry.type === "credit" ? `$${entry.amount.toFixed(2)}` : "-" })
      ] }, index)) })
    ] }) })
  ] });
}

function LedgerTable({ companyId }) {
  const [transactions, setTransactions] = useState([]);
  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    description: "",
    entries: [
      { accountId: "", accountName: "", type: "debit", amount: 0 },
      { accountId: "", accountName: "", type: "credit", amount: 0 }
    ]
  });
  const API_URL = "http://localhost:8787";
  useEffect(() => {
    loadTransactions();
  }, []);
  async function loadTransactions() {
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/transactions`
      );
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  }
  async function createTransaction() {
    try {
      await fetch(`${API_URL}/api/ledger/${companyId}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTransaction)
      });
      setShowNewTransaction(false);
      setNewTransaction({
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        description: "",
        entries: [
          { accountId: "", accountName: "", type: "debit", amount: 0 },
          { accountId: "", accountName: "", type: "credit", amount: 0 }
        ]
      });
      loadTransactions();
    } catch (error) {
      console.error("Failed to create transaction:", error);
    }
  }
  function addEntry() {
    setNewTransaction({
      ...newTransaction,
      entries: [
        ...newTransaction.entries,
        { accountId: "", accountName: "", type: "debit", amount: 0 }
      ]
    });
  }
  function updateEntry(index, field, value) {
    const entries = [...newTransaction.entries];
    entries[index] = { ...entries[index], [field]: value };
    setNewTransaction({ ...newTransaction, entries });
  }
  const debitTotal = newTransaction.entries.filter((e) => e.type === "debit").reduce((sum, e) => sum + Number(e.amount), 0);
  const creditTotal = newTransaction.entries.filter((e) => e.type === "credit").reduce((sum, e) => sum + Number(e.amount), 0);
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;
  return /* @__PURE__ */ jsxs("div", { className: "ledger-table", children: [
    /* @__PURE__ */ jsxs("div", { className: "table-header", children: [
      /* @__PURE__ */ jsx("h2", { children: "General Ledger" }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          className: "btn-primary",
          onClick: () => setShowNewTransaction(true),
          children: [
            /* @__PURE__ */ jsx(FiPlus, {}),
            " New Transaction"
          ]
        }
      )
    ] }),
    showNewTransaction && /* @__PURE__ */ jsxs("div", { className: "transaction-form", children: [
      /* @__PURE__ */ jsx("h3", { children: "New Journal Entry" }),
      /* @__PURE__ */ jsxs("div", { className: "form-row", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "date",
            value: newTransaction.date,
            onChange: (e) => setNewTransaction({ ...newTransaction, date: e.target.value })
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            placeholder: "Description",
            value: newTransaction.description,
            onChange: (e) => setNewTransaction({
              ...newTransaction,
              description: e.target.value
            })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("table", { className: "entry-table", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { children: "Account" }),
          /* @__PURE__ */ jsx("th", { children: "Debit" }),
          /* @__PURE__ */ jsx("th", { children: "Credit" }),
          /* @__PURE__ */ jsx("th", {})
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: newTransaction.entries.map((entry, index) => /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              placeholder: "Account name",
              value: entry.accountName,
              onChange: (e) => updateEntry(index, "accountName", e.target.value)
            }
          ) }),
          /* @__PURE__ */ jsx("td", { children: entry.type === "debit" ? /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              step: "0.01",
              value: entry.amount,
              onChange: (e) => updateEntry(index, "amount", e.target.value)
            }
          ) : /* @__PURE__ */ jsx("span", { className: "empty-cell", children: "-" }) }),
          /* @__PURE__ */ jsx("td", { children: entry.type === "credit" ? /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              step: "0.01",
              value: entry.amount,
              onChange: (e) => updateEntry(index, "amount", e.target.value)
            }
          ) : /* @__PURE__ */ jsx("span", { className: "empty-cell", children: "-" }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => updateEntry(
                index,
                "type",
                entry.type === "debit" ? "credit" : "debit"
              ),
              className: "btn-switch",
              children: "↔"
            }
          ) })
        ] }, index)) }),
        /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("strong", { children: "Totals" }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            debitTotal.toFixed(2)
          ] }) }),
          /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("strong", { children: [
            "$",
            creditTotal.toFixed(2)
          ] }) }),
          /* @__PURE__ */ jsx("td", { children: isBalanced ? /* @__PURE__ */ jsx("span", { className: "balanced", children: "✓" }) : /* @__PURE__ */ jsx("span", { className: "unbalanced", children: "✗" }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "form-actions", children: [
        /* @__PURE__ */ jsx("button", { onClick: addEntry, className: "btn-secondary", children: "+ Add Line" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setShowNewTransaction(false),
              className: "btn-secondary",
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: createTransaction,
              className: "btn-primary",
              disabled: !isBalanced || !newTransaction.description,
              children: "Post Transaction"
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "transactions-list", children: transactions.map((tx) => /* @__PURE__ */ jsx(TransactionRow, { transaction: tx }, tx.id)) })
  ] });
}

const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Dashboard", "data-astro-cid-3nssi2tu": true }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="dashboard" data-astro-cid-3nssi2tu> <h1 data-astro-cid-3nssi2tu>Dashboard</h1> <div class="metrics-grid" data-astro-cid-3nssi2tu> <div class="metric-card" data-astro-cid-3nssi2tu> <h3 data-astro-cid-3nssi2tu>Total Revenue</h3> <p class="metric-value" id="totalRevenue" data-astro-cid-3nssi2tu>$0</p> </div> <div class="metric-card" data-astro-cid-3nssi2tu> <h3 data-astro-cid-3nssi2tu>Total Expenses</h3> <p class="metric-value" id="totalExpenses" data-astro-cid-3nssi2tu>$0</p> </div> <div class="metric-card" data-astro-cid-3nssi2tu> <h3 data-astro-cid-3nssi2tu>Net Income</h3> <p class="metric-value" id="netIncome" data-astro-cid-3nssi2tu>$0</p> </div> <div class="metric-card" data-astro-cid-3nssi2tu> <h3 data-astro-cid-3nssi2tu>Cash Balance</h3> <p class="metric-value" id="cashBalance" data-astro-cid-3nssi2tu>$0</p> </div> </div> ${renderComponent($$result2, "LedgerTable", LedgerTable, { "client:load": true, "companyId": "default", "client:component-hydration": "load", "client:component-path": "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/bookkeeping/LedgerTable.tsx", "client:component-export": "default", "data-astro-cid-3nssi2tu": true })} </div> ` })}  ${renderScript($$result, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/dashboard.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/dashboard.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/dashboard.astro";
const $$url = "/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
