const API_BASE = "https://api.insighthunter.app";

async function fetchJSON(path) {
  const res = await fetch(API_BASE + path, { credentials: "include" });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

// Dashboard metrics
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

// Compliance table
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

// Admin actions
const genBtn = document.getElementById("btn-generate-engagement");
if (genBtn) {
  genBtn.addEventListener("click", () => {
    fetch(API_BASE + "/api/compliance/current/forms/engagement-letter/pdf", {
      method: "POST",
      credentials: "include",
    }).catch(console.error);
  });
}

const cleanupBtn = document.getElementById("btn-cleanup-uploads");
if (cleanupBtn) {
  cleanupBtn.addEventListener("click", () => {
    fetch(API_BASE + "/api/compliance/current/cleanup-uploads", {
      method: "POST",
      credentials: "include",
    }).catch(console.error);
  });
}

// Login button (redirect to Access)
const loginBtn = document.getElementById("login-btn");
if (loginBtn) {
  loginBtn.addEventListener("click", () => {
    window.location.href = "https://auth.insighthunter.app/login";
  });
}

// Logout
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    window.location.href = "https://auth.insighthunter.app/logout";
  });

}
// Bookkeeping ledger
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
  
  // Reconciliation button
  const reconBtn = document.getElementById("start-recon");
  if (reconBtn) {
    reconBtn.addEventListener("click", () => {
      alert("Reconciliation flow coming soon.");
    });
  }
  
