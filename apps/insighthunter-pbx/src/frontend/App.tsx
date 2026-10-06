import { AIReceptionistPage } from "./pages/AIReceptionist";
import { AddonsPage }         from "./pages/Addons";
import { AutomationsPage }    from "./pages/Automations";
import { BillingPage }        from "./pages/Billing";
import { CallFlowsPage }      from "./pages/CallFlows";
import { CallsPage }          from "./pages/Calls";
import { HomePage }           from "./pages/Home";
import { InboxPage }          from "./pages/Inbox";
import { QueuesPage }
  from "./pages/Queues.js";
import { ReportsPage }        from "./pages/Reports.js";
import { SettingsPage }       from "./pages/Settings.js";
import { TeamPage }           from "./pages/Team.js";
import { VoicemailPage }      from "./pages/Voicemail.js";
import { NumbersPage, resetNumbersPageHydration } from "./pages/Numbers";

type NavItem = {
  id: string;
  label: string;
  description: string;
  page: () => string;
};

const navItems: NavItem[] = [
  { id: "home", label: "Overview", description: "KPIs, alerts, and service health", page: HomePage },
  { id: "inbox", label: "Inbox", description: "SMS, MMS, and threaded conversations", page: InboxPage },
  { id: "calls", label: "Calls", description: "Live status and recent call activity", page: CallsPage },
  { id: "numbers", label: "Numbers", description: "DIDs, assignments, and porting", page: NumbersPage },
  { id: "call-flows", label: "Call Flows", description: "IVR, routing, and emergency branches", page: CallFlowsPage },
  { id: "queues", label: "Queues", description: "Departments, staffing, and SLA coverage", page: QueuesPage },
  { id: "voicemail", label: "Voicemail", description: "Mailboxes, transcripts, and retention", page: VoicemailPage },
  { id: "automations", label: "Automations", description: "Missed-call texts, reminders, and follow-ups", page: AutomationsPage },
  { id: "ai", label: "AI Receptionist", description: "Intake logic, routing, and escalation", page: AIReceptionistPage },
  { id: "team", label: "Team", description: "Extensions, permissions, and coverage", page: TeamPage },
  { id: "reports", label: "Reports", description: "Usage, performance, and margins", page: ReportsPage },
  { id: "billing", label: "Billing", description: "Plan, usage rating, and vendor cost", page: BillingPage },
  { id: "addons", label: "Add-ons", description: "Mailbox, freight, and partner services", page: AddonsPage },
  { id: "settings", label: "Settings", description: "Compliance, hours, and system policy", page: SettingsPage },
];

function iconFor(id: string): string {
  const icons: Record<string, string> = {
    home: "◫",
    inbox: "✉",
    calls: "◉",
    numbers: "#",
    "call-flows": "⇄",
    queues: "≣",
    voicemail: "◌",
    automations: "⚙",
    ai: "◇",
    team: "◎",
    reports: "▣",
    billing: "$",
    addons: "+",
    settings: "☰",
  };

  return icons[id] ?? "•";
}

export function App(): string {
  const sections = navItems
    .map(
      (item) => `
        <button class="ih-nav-button${item.id === "home" ? " is-active" : ""}" data-nav-target="${item.id}">
          <span class="ih-nav-icon">${iconFor(item.id)}</span>
          <span>
            <strong>${item.label}</strong>
            <small>${item.description}</small>
          </span>
        </button>
      `,
    )
    .join("");

  const pages = navItems
    .map(
      (item) => `
        <section id="page-${item.id}" class="ih-page${item.id === "home" ? " is-active" : ""}" data-page="${item.id}">
          ${item.page()}
        </section>
      `,
    )
    .join("");

  queueMicrotask(() => wireNavigation());

  return `
    <div class="ih-shell">
      <aside class="ih-sidebar">
        <div class="ih-brand">
          <div class="ih-brand-mark">IH</div>
          <div>
            <h1>Insight Hunter PBX</h1>
            <p>Business communications command center</p>
          </div>
        </div>

        <div class="ih-tenant-card">
          <span class="ih-badge success">Live</span>
          <h2>Acme Roofing Group</h2>
          <p>Main number: +1 (470) 555-0110</p>
          <p>Twilio active, AI receptionist enabled, 4 locations</p>
        </div>

        <nav class="ih-nav">${sections}</nav>
      </aside>

      <main class="ih-main">
        <header class="ih-topbar">
          <div>
            <span class="ih-eyebrow">PBX Control Center</span>
            <h2>Operator dashboard</h2>
          </div>

          <div class="ih-topbar-actions">
            <button class="ih-button ghost">Emergency routing</button>
            <button class="ih-button secondary">Open softphone</button>
            <button class="ih-button primary">Create automation</button>
          </div>
        </header>

        <div class="ih-announcement">
          <strong>System status:</strong> Twilio webhooks healthy, queue latency 480ms, SMS delivery 98.9%, billing sync current through 9:45 PM.
        </div>

        <div class="ih-page-stack">${pages}</div>
      </main>
    </div>
  `;
  }

function wireNavigation(): void {
  const buttons = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-target]"));
  const pages = Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));

  for (const button of buttons) {
    button.onclick = () => {
      const target = button.dataset.navTarget;
      if (!target) return;

      for (const candidate of buttons) {
        candidate.classList.toggle("is-active", candidate === button);
      }

      for (const page of pages) {
        page.classList.toggle("is-active", page.dataset.page === target);
      }

      if (target === "numbers") {
        resetNumbersPageHydration();
        queueMicrotask(() => {
          const section = document.querySelector<HTMLElement>('[data-page="numbers"]');
          if (section) {
            section.innerHTML = NumbersPage();
          }
        });
      }
    };
  }
}


window.addEventListener("ih:numbers:active", () => {
  const marker = document.getElementById("ih-numbers-list");
    if (!marker) return;
});

for (const button of buttons) {
  button.addEventListener("click", () => activate(button.dataset.navTarget ?? "home"));
}

