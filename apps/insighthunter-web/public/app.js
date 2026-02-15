// ============================================================
// InsightHunter Web — Global JS Wiring (Phase 4)
// ============================================================

const API_BASE = "https://api.insighthunter.app";

// -------------------------------
// Helper: Fetch JSON with cookies
// -------------------------------
async function fetchJSON(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    console.error("API error:", res.status, path);
    throw new Error(`API error ${res.status}`);
  }

  return res.json();
}

// -------------------------------
// LOGIN BUTTON
// -------------------------------
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "https://auth.insighthunter.app/login";
  });
}

// -------------------------------
// LOGOUT BUTTON
// -------------------------------
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://auth.insighthunter.app/logout";
  });
}

// ============================================================
// DASHBOARD
// ============================================================
if (document.getElementById("metric-monthly-revenue")) {
  fetchJSON("/api/mobile/dashboard")
    .then((data) => {
      document.getElementById("metric-monthly-revenue").textContent =
        "$" + data.monthlyRevenue.toLocaleString();

      document.getElementById("metric-cash-on-hand").textContent =
        "$" + data.cashOnHand.toLocaleString();

      document.getElementById("metric-open-compliance").textContent =
        data.openComplianceItems;

      document.getElementById("metric-unreconciled").textContent =
        data.unreconciledTransactions;

      const list = document.getElementById("recent-activity");
      data.recentActivity.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.message;
        list.appendChild(li);
      });
    })
    .catch(console.error);
}

// ============================================================
// COMPLIANCE TABLE
// ============================================================
if (document.getElementById("compliance-table")) {
  fetchJSON("/api/compliance/current")
    .then((data) => {
      const tbody = document.querySelector("#compliance-table tbody");

      data.items.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.title}</td>
          <td>${item.type}</td>
          <td>${item.status}</td>
          <td>${new Date(item.updatedAt).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

// ============================================================
// ADMIN — ENGAGEMENT LETTER GENERATION
// ============================================================
const genBtn = document.getElementById("btn-generate-engagement");
if (genBtn) {
  genBtn.addEventListener("click", () => {
    fetch(API_BASE + "/api/compliance/current/forms/engagement-letter/pdf", {
      method: "POST",
      credentials: "include",
    })
      .then(() => alert("Engagement letter generated."))
      .catch(console.error);
  });
}

// ============================================================
// ADMIN — CLEANUP UPLOADS
// ============================================================
const cleanupBtn = document.getElementById("btn-cleanup-uploads");
if (cleanupBtn) {
  cleanupBtn.addEventListener("click", () => {
    fetch(API_BASE + "/api/compliance/current/cleanup-uploads", {
      method: "POST",
      credentials: "include",
    })
      .then(() => alert("Old uploads cleaned up."))
      .catch(console.error);
  });
}

// ============================================================
// BOOKKEEPING — LEDGER
// ============================================================
if (document.getElementById("ledger-table")) {
  fetchJSON("/api/bookkeeping/current/ledger")
    .then((data) => {
      const tbody = document.querySelector("#ledger-table tbody");

      data.entries.forEach((entry) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${new Date(entry.date).toLocaleDateString()}</td>
          <td>${entry.description}</td>
          <td>${entry.debit ? "$" + entry.debit.toFixed(2) : ""}</td>
          <td>${entry.credit ? "$" + entry.credit.toFixed(2) : ""}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

// ============================================================
// RECONCILIATION — FILE UPLOAD + UNMATCHED TABLE
// ============================================================
const reconBtn = document.getElementById("start-recon");
if (reconBtn) {
  reconBtn.addEventListener("click", () => {
    const fileInput = document.getElementById("bank-statement");
    if (!fileInput.files.length) {
      alert("Please upload a bank statement first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    fetch(API_BASE + "/api/bookkeeping/reconcile/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        const tbody = document.querySelector("#unmatched-table tbody");
        tbody.innerHTML = "";

        data.unmatched.forEach((tx) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${new Date(tx.date).toLocaleDateString()}</td>
            <td>${tx.description}</td>
            <td>$${tx.amount.toFixed(2)}</td>
          `;
          tbody.appendChild(tr);
        });
      })
      .catch(console.error);
  });
}

// ============================================================
// REPORTS — GENERATION
// ============================================================
if (document.querySelector("[data-report]")) {
  document.querySelectorAll("[data-report]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.report;

      fetch(API_BASE + `/api/reports/generate/${type}`, {
        method: "POST",
        credentials: "include",
      })
        .then((res) => res.json())
        .then((report) => {
          const list = document.getElementById("reports-list");
          const li = document.createElement("li");
          li.textContent = `${report.name} — ready to download`;
          list.appendChild(li);
        })
        .catch(console.error);
    });
  });
}

// ============================================================
// CLIENTS TABLE
// ============================================================
if (document.getElementById("clients-table")) {
  fetchJSON("/api/clients")
    .then((data) => {
      const tbody = document.querySelector("#clients-table tbody");

      data.clients.forEach((client) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${client.name}</td>
          <td>${client.entityType}</td>
          <td>${client.status}</td>
          <td>${new Date(client.lastActivity).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(console.error);
}

// ============================================================
// PROFILE — LOAD + SAVE
// ============================================================
if (document.getElementById("profile-name")) {
  fetchJSON("/api/account/profile")
    .then((profile) => {
      document.getElementById("profile-name").value = profile.name;
      document.getElementById("profile-email").value = profile.email;
      document.getElementById("profile-role").value = profile.role;
    })
    .catch(console.error);

  document.querySelector(".form").addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      name: document.getElementById("profile-name").value,
      email: document.getElementById("profile-email").value,
      role: document.getElementById("profile-role").value,
    };

    fetch(API_BASE + "/api/account/profile", {
      method: "PUT",
      credentials: "include",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    })
      .then(() => alert("Profile updated."))
      .catch(console.error);
  });
}

// ============================================================
// NOTIFICATIONS — LOAD + SAVE
// ============================================================
if (document.getElementById("notif-compliance")) {
  fetchJSON("/api/account/notifications")
    .then((settings) => {
      document.getElementById("notif-compliance").checked = settings.compliance;
      document.getElementById("notif-bookkeeping").checked =
        settings.bookkeeping;
      document.getElementById("notif-reports").checked = settings.reports;
    })
    .catch(console.error);

  document.querySelector(".form").addEventListener("submit", (e) => {
    e.preventDefault();

    const payload = {
      compliance: document.getElementById("notif-compliance").checked,
      bookkeeping: document.getElementById("notif-bookkeeping").checked,
      reports: document.getElementById("notif-reports").checked,
    };

    fetch(API_BASE + "/api/account/notifications", {
      method: "PUT",
      credentials: "include",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    })
      .then(() => alert("Notification settings saved."))
      .catch(console.error);
  });
}
