import { useApi } from "../hooks/useApi";

type PhoneNumberRecord = {
  id: string;
  phoneNumber: string;
  label: string | null;
  createdAt: string;
};

type NumbersResponse = {
  items: PhoneNumberRecord[];
};

let numbersLoaded = false;

export function NumbersPage(): string {
  queueMicrotask(() => {
    void hydrateNumbersPage();
  });

  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-2">
        <article class="ih-card">
          <div class="ih-card-heading">
            <h3>Number inventory</h3>
            <span class="ih-badge success" id="ih-numbers-count">Loading...</span>
          </div>

          <div id="ih-numbers-state" class="ih-inline-status">Loading phone numbers...</div>
          <ul id="ih-numbers-list" class="ih-list"></ul>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading">
            <h3>Provisioning actions</h3>
            <span class="ih-badge info">Twilio</span>
          </div>

          <div class="ih-progress-block" id="ih-numbers-summary">
            <div><span>Status</span><strong>Waiting for data</strong></div>
            <div><span>Assigned</span><strong>--</strong></div>
            <div><span>Unassigned</span><strong>--</strong></div>
            <div><span>Newest add</span><strong>--</strong></div>
          </div>
        </article>
      </section>
    </div>
  `;
}

export function resetNumbersPageHydration(): void {
  numbersLoaded = false;
}

async function hydrateNumbersPage(): Promise<void> {
  const list = document.getElementById("ih-numbers-list");
  const state = document.getElementById("ih-numbers-state");
  const badge = document.getElementById("ih-numbers-count");
  const summary = document.getElementById("ih-numbers-summary");

  if (!list || !state || !badge || !summary) return;
  if (numbersLoaded) return;

  numbersLoaded = true;

  try {
    const data = await useApi<NumbersResponse>({ path: "/api/numbers" });
    const items = Array.isArray(data.items) ? data.items : [];

    badge.textContent = `${items.length} active`;
    state.textContent = items.length === 0 ? "No phone numbers found for this PBX tenant." : "";
    state.style.display = items.length === 0 ? "block" : "none";

    list.innerHTML = items.length
      ? items
          .map((item) => {
            const label = item.label?.trim() ? item.label.trim() : "Unlabeled number";
            const created = formatDate(item.createdAt);
            return `
              <li>
                <strong>${escapeHtml(formatPhoneDisplay(item.phoneNumber))}</strong>
                — ${escapeHtml(label)}.
                <small>Added ${escapeHtml(created)}</small>
              </li>
            `;
          })
          .join("")
      : "";

    const assigned = items.filter((item) => Boolean(item.label?.trim())).length;
    const unassigned = items.length - assigned;
    const newest = items[0]?.createdAt ? formatDate(items[0].createdAt) : "—";

    summary.innerHTML = `
      <div><span>Status</span><strong>${items.length ? "Inventory synced" : "No records yet"}</strong></div>
      <div><span>Assigned</span><strong>${assigned}</strong></div>
      <div><span>Unassigned</span><strong>${unassigned}</strong></div>
      <div><span>Newest add</span><strong>${escapeHtml(newest)}</strong></div>
    `;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    badge.textContent = "Error";
    state.textContent = `Could not load phone numbers: ${message}`;
    state.style.display = "block";
    list.innerHTML = "";
    summary.innerHTML = `
      <div><span>Status</span><strong>Load failed</strong></div>
      <div><span>Hint</span><strong>Check auth / PBX access</strong></div>
      <div><span>Route</span><strong>/api/numbers</strong></div>
      <div><span>Action</span><strong>Retry after session check</strong></div>
    `;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatPhoneDisplay(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phoneNumber;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
