import { c as createComponent, r as renderComponent, a as renderScript, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { $ as $$AppLayout } from '../chunks/AppLayout_0Czg83ng.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useEffect, useCallback } from 'react';
import { d as FiAlertTriangle, c as FiCheck, e as FiRefreshCw } from '../chunks/index_IorU0Hm2.mjs';
/* empty css                                    */
export { renderers } from '../renderers.mjs';

function QuickBooksConnect({
  companyId
}) {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [realmId, setRealmId] = useState(null);
  const API_URL = "http://localhost:8787";
  useEffect(() => {
    const saved = localStorage.getItem(`qb-connected-${companyId}`);
    if (saved) {
      const { connected: connected2, realmId: savedRealmId } = JSON.parse(saved);
      setConnected(connected2);
      setRealmId(savedRealmId);
    }
  }, [companyId]);
  const saveConnection = useCallback(
    (isConnected, newRealmId) => {
      const data = { connected: isConnected, realmId: newRealmId || realmId };
      setConnected(isConnected);
      setRealmId(newRealmId || realmId);
      localStorage.setItem(`qb-connected-${companyId}`, JSON.stringify(data));
    },
    [companyId, realmId]
  );
  const connectQuickBooks = async () => {
    try {
      setError(null);
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/auth`
      );
      if (!response.ok) throw new Error("Auth URL fetch failed");
      const { authUrl } = await response.json();
      const popup = window.open(
        authUrl,
        "QuickBooks OAuth",
        "width=800,height=600,noopener,noreferrer"
      );
      const handleMessage = (event) => {
        const validOrigins = [
          window.location.origin,
          "http://localhost:8787",
          "https://yourapp.com"
        ];
        if (!validOrigins.includes(event.origin)) return;
        if (event.data.type === "quickbooks-connected") {
          saveConnection(true, event.data.realmId);
          if (popup) popup.close();
        } else if (event.data.type === "quickbooks-error") {
          setError(event.data.message);
          if (popup) popup.close();
        }
      };
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    } catch (err) {
      setError("Connection failed. Check console.");
      console.error("QB Connect error:", err);
    }
  };
  useEffect(() => {
  }, []);
  const syncWithQuickBooks = async () => {
    if (!realmId) return setError("No company connected");
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/quickbooks/sync`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ realmId })
          // Pass realmId for backend
        }
      );
      if (!response.ok) throw new Error("Sync failed");
    } catch (err) {
      setError("Sync failed. Verify tokens.");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };
  const disconnect = () => {
    localStorage.removeItem(`qb-connected-${companyId}`);
    setConnected(false);
    setRealmId(null);
    fetch(`${API_URL}/api/ledger/${companyId}/quickbooks/disconnect`, {
      method: "POST"
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "quickbooks-connect", children: [
    /* @__PURE__ */ jsxs("div", { className: "qb-header", children: [
      /* @__PURE__ */ jsx("img", { src: "/quickbooks-logo.svg", alt: "QuickBooks", className: "qb-logo" }),
      /* @__PURE__ */ jsx("h3", { children: "QuickBooks Integration" })
    ] }),
    error && /* @__PURE__ */ jsxs("div", { className: "error-banner", children: [
      /* @__PURE__ */ jsx(FiAlertTriangle, {}),
      " ",
      error,
      " ",
      /* @__PURE__ */ jsx("button", { onClick: () => setError(null), children: "Dismiss" })
    ] }),
    !connected ? /* @__PURE__ */ jsxs("div", { className: "qb-connect", children: [
      /* @__PURE__ */ jsx("p", { children: "Connect QuickBooks to sync: Chart of Accounts, Customers/Vendors, Invoices/Bills, Bank Transactions.[web:11][web:14]" }),
      /* @__PURE__ */ jsx("button", { onClick: connectQuickBooks, className: "btn-primary", children: "Connect to QuickBooks" })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "qb-connected", children: [
      /* @__PURE__ */ jsxs("div", { className: "status-badge success", children: [
        /* @__PURE__ */ jsx(FiCheck, {}),
        " Connected (Realm: ",
        realmId?.slice(-8),
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "button-group", children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: syncWithQuickBooks,
            disabled: syncing,
            className: "btn-secondary",
            children: [
              syncing ? /* @__PURE__ */ jsx(FiRefreshCw, { className: "spinning" }) : /* @__PURE__ */ jsx(FiRefreshCw, {}),
              " ",
              syncing ? "Syncing..." : "Sync Now"
            ]
          }
        ),
        /* @__PURE__ */ jsx("button", { onClick: disconnect, className: "btn-outline", children: "Disconnect" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "qb-features", children: [
      /* @__PURE__ */ jsx("h4", { children: "Synced Data:" }),
      /* @__PURE__ */ jsxs("ul", { children: [
        /* @__PURE__ */ jsxs("li", { children: [
          "Chart of Accounts (GET /v3/company/",
          realmId,
          "/account)"
        ] }),
        /* @__PURE__ */ jsx("li", { children: "Customers & Vendors (Customer/Vendor endpoints)" }),
        /* @__PURE__ */ jsx("li", { children: "Invoices & Bills (Invoice/Bill with LinkedTxn)" }),
        /* @__PURE__ */ jsx("li", { children: "Bank Transactions (JournalEntry/Deposit)" }),
        /* @__PURE__ */ jsx("li", { children: "Reports (query?query=SELECT * FROM Report)" })
      ] })
    ] })
  ] });
}

const $$Settings = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Settings", "data-astro-cid-swhfej32": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="settings-page" data-astro-cid-swhfej32> <h1 data-astro-cid-swhfej32>Settings</h1> <div class="settings-sections" data-astro-cid-swhfej32> <section class="settings-section" data-astro-cid-swhfej32> <h2 data-astro-cid-swhfej32>Company Information</h2> <form id="companyForm" class="settings-form" data-astro-cid-swhfej32> <div class="form-group" data-astro-cid-swhfej32> <label data-astro-cid-swhfej32>Company Name</label> <input type="text" name="companyName" placeholder="Your Company Inc." data-astro-cid-swhfej32> </div> <div class="form-group" data-astro-cid-swhfej32> <label data-astro-cid-swhfej32>Fiscal Year Start</label> <select name="fiscalYearStart" data-astro-cid-swhfej32> <option value="1" data-astro-cid-swhfej32>January</option> <option value="2" data-astro-cid-swhfej32>February</option> <option value="3" data-astro-cid-swhfej32>March</option> <option value="4" data-astro-cid-swhfej32>April</option> <option value="5" data-astro-cid-swhfej32>May</option> <option value="6" data-astro-cid-swhfej32>June</option> <option value="7" data-astro-cid-swhfej32>July</option> <option value="8" data-astro-cid-swhfej32>August</option> <option value="9" data-astro-cid-swhfej32>September</option> <option value="10" data-astro-cid-swhfej32>October</option> <option value="11" data-astro-cid-swhfej32>November</option> <option value="12" data-astro-cid-swhfej32>December</option> </select> </div> <div class="form-group" data-astro-cid-swhfej32> <label data-astro-cid-swhfej32>Currency</label> <select name="currency" data-astro-cid-swhfej32> <option value="USD" data-astro-cid-swhfej32>USD - US Dollar</option> <option value="EUR" data-astro-cid-swhfej32>EUR - Euro</option> <option value="GBP" data-astro-cid-swhfej32>GBP - British Pound</option> <option value="CAD" data-astro-cid-swhfej32>CAD - Canadian Dollar</option> </select> </div> <button type="submit" class="btn-primary" data-astro-cid-swhfej32>Save Changes</button> </form> </section> <section class="settings-section" data-astro-cid-swhfej32> <h2 data-astro-cid-swhfej32>Integrations</h2> ${renderComponent($$result2, "QuickBooksConnect", QuickBooksConnect, { "client:load": true, "companyId": "default", "client:component-hydration": "load", "client:component-path": "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/quickbooks/QuickBooksConnect.tsx", "client:component-export": "default", "data-astro-cid-swhfej32": true })} </section> <section class="settings-section" data-astro-cid-swhfej32> <h2 data-astro-cid-swhfej32>Data Management</h2> <div class="data-actions" data-astro-cid-swhfej32> <button class="btn-secondary" id="exportBtn" data-astro-cid-swhfej32>Export Data</button> <button class="btn-secondary" id="importBtn" data-astro-cid-swhfej32>Import Data</button> <button class="btn-danger" id="resetBtn" data-astro-cid-swhfej32>Reset All Data</button> </div> </section> </div> </div> ` })}  ${renderScript($$result, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/settings.astro?astro&type=script&index=0&lang.ts")}`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/settings.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/settings.astro";
const $$url = "/settings";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Settings,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
