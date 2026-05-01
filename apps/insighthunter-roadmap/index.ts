// InsightHunter Interactive Roadmap Worker
// Exposes roadmap phases/tracks as JSON and basic health/ping endpoints.

export interface Env {
  // Future bindings for persistence/analytics can be added here
  // ROADMAP_DB: D1Database;
  // INSIGHT_ANALYTICS: AnalyticsEngineDataset;
}

type RoadmapTrackId = "advisor-portal" | "ledger-automation" | "finops" | "intelligence";

interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  trackId: RoadmapTrackId;
  phase: 1 | 2 | 3 | 4;
  targetQuarter: string; // e.g. "2026-Q2"
  status: "planned" | "in-progress" | "complete" | "blocked";
  sortOrder: number;
}

interface RoadmapPhase {
  phase: 1 | 2 | 3 | 4;
  name: string;
  summary: string;
  targetWindow: string; // e.g. "Weeks 1–8"
}

interface RoadmapTrack {
  id: RoadmapTrackId;
  name: string;
  summary: string;
}

// Static seed data – can later be moved into D1 and managed via admin UI
const PHASES: RoadmapPhase[] = [
  {
    phase: 1,
    name: "Advisor Portal Foundation",
    summary:
      "Ship the multi-client Advisor Portal, firm/client role model, and basic alerts so accountants have a single pane of glass.",
    targetWindow: "Weeks 1–8",
  },
  {
    phase: 2,
    name: "Ledger Automation Engine",
    summary:
      "Stand up transaction ingestion, GL mapping rules, and close workflows so InsightHunter starts doing real accounting work.",
    targetWindow: "Weeks 9–20",
  },
  {
    phase: 3,
    name: "Finance Ops (AP/Expenses/AR)",
    summary:
      "Layer in bill approvals, reimbursements, and lightweight invoicing so advisory connects directly to money movement.",
    targetWindow: "Weeks 21–36",
  },
  {
    phase: 4,
    name: "Intelligence, Command Center & Cert",
    summary:
      "Add cross-module health scores, command center views, AI insight feed, and an advisor certification/enablement layer.",
    targetWindow: "Weeks 37–52",
  },
];

const TRACKS: RoadmapTrack[] = [
  {
    id: "advisor-portal",
    name: "Advisor Portal",
    summary:
      "Multi-client firm workspace that unifies every InsightHunter app into a single accountant view.",
  },
  {
    id: "ledger-automation",
    name: "Ledger Automation",
    summary:
      "Transaction ingestion, classification, GL mapping, and close-cycle automation built on Workers/D1/Queues.",
  },
  {
    id: "finops",
    name: "Finance Ops",
    summary:
      "AP, reimbursements, and AR flows that tie directly into compliance, payroll, and analytics.",
  },
  {
    id: "intelligence",
    name: "Intelligence & Enablement",
    summary:
      "AI insight feed, risk/health scoring, report builder, and partner/advisor certification.",
  },
];

const MILESTONES: RoadmapMilestone[] = [
  // Phase 1 – Advisor Portal
  {
    id: "p1-firms-model",
    title: "Firm & client relationship model in D1",
    description:
      "Add firms, firm_members, and firm_clients tables so one firm login can see all client orgs.",
    trackId: "advisor-portal",
    phase: 1,
    targetQuarter: "2026-Q2",
    status: "planned",
    sortOrder: 10,
  },
  {
    id: "p1-portal-shell",
    title: "Advisor Portal shell & client switcher",
    description:
      "Ship the basic advisor UI with client switcher, alerts panel, and links into BizForma, Payroll, and Dashboard.",
    trackId: "advisor-portal",
    phase: 1,
    targetQuarter: "2026-Q2",
    status: "planned",
    sortOrder: 20,
  },
  {
    id: "p1-alerts-feed",
    title: "Cross-app advisor alerts feed",
    description:
      "Aggregate compliance, formation, payroll, and cash alerts into a single advisor feed.",
    trackId: "advisor-portal",
    phase: 1,
    targetQuarter: "2026-Q3",
    status: "planned",
    sortOrder: 30,
  },

  // Phase 2 – Ledger Automation
  {
    id: "p2-transactions-schema",
    title: "Transactions & GL schema",
    description:
      "Create transactions, gl_accounts, and categorization_rules tables plus basic ingestion endpoints.",
    trackId: "ledger-automation",
    phase: 2,
    targetQuarter: "2026-Q3",
    status: "planned",
    sortOrder: 10,
  },
  {
    id: "p2-rules-engine",
    title: "Categorization rules engine",
    description:
      "Implement rule evaluation and exception queues, wired into Queues and Workflows for close automation.",
    trackId: "ledger-automation",
    phase: 2,
    targetQuarter: "2026-Q3",
    status: "planned",
    sortOrder: 20,
  },
  {
    id: "p2-close-workflow",
    title: "Month-end close workflow",
    description:
      "Durable Workflows to orchestrate month-end close checklists across AP, AR, banking, and compliance.",
    trackId: "ledger-automation",
    phase: 2,
    targetQuarter: "2026-Q4",
    status: "planned",
    sortOrder: 30,
  },

  // Phase 3 – Finance Ops
  {
    id: "p3-bills-core",
    title: "Bills & approvals core API",
    description:
      "Expose CRUD for bills, vendors, and approval chains, ready to sit on top of existing document vault.",
    trackId: "finops",
    phase: 3,
    targetQuarter: "2027-Q1",
    status: "planned",
    sortOrder: 10,
  },
  {
    id: "p3-reimbursements",
    title: "Reimbursements & policies",
    description:
      "Add reimbursements, spend_policies, and receipt upload flows, integrated with payroll readiness checks.",
    trackId: "finops",
    phase: 3,
    targetQuarter: "2027-Q1",
    status: "planned",
    sortOrder: 20,
  },
  {
    id: "p3-light-ar",
    title: "Lightweight invoicing & AR view",
    description:
      "Support invoice creation, status tracking, and cash-forecast inputs without becoming a full AR suite.",
    trackId: "finops",
    phase: 3,
    targetQuarter: "2027-Q2",
    status: "planned",
    sortOrder: 30,
  },

  // Phase 4 – Intelligence & Cert
  {
    id: "p4-health-scores",
    title: "Cross-module health scores",
    description:
      "Compute per-client finance/compliance health scores from existing modules and surface in Advisor Portal.",
    trackId: "intelligence",
    phase: 4,
    targetQuarter: "2027-Q2",
    status: "planned",
    sortOrder: 10,
  },
  {
    id: "p4-command-center",
    title: "Advisor command center",
    description:
      "Single dashboard for firm owners to see workload, risks, and revenue across all clients.",
    trackId: "intelligence",
    phase: 4,
    targetQuarter: "2027-Q3",
    status: "planned",
    sortOrder: 20,
  },
  {
    id: "p4-cert-program",
    title: "InsightHunter Advisor Certification",
    description:
      "Program and content that turns the roadmap into a structured certification for firms.",
    trackId: "intelligence",
    phase: 4,
    targetQuarter: "2027-Q3",
    status: "planned",
    sortOrder: 30,
  },
];

function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*", // tighten to InsightHunter domains in production
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization",
      ...init?.headers,
    },
  });
}

function notFound(message = "Not found"): Response {
  return jsonResponse({ error: message }, { status: 404 });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "Content-Type, Authorization",
          "access-control-max-age": "86400",
        },
      });
    }

    // Health check
    if (pathname === "/health" && request.method === "GET") {
      return jsonResponse({ status: "ok", service: "insighthunter-roadmap" });
    }

    // Basic ping for smoke tests
    if (pathname === "/ping" && request.method === "GET") {
      return new Response("pong", { status: 200 });
    }

    // GET /roadmap – full roadmap (phases + tracks + milestones)
    if (pathname === "/roadmap" && request.method === "GET") {
      const phaseFilter = searchParams.get("phase");
      const trackFilter = searchParams.get("trackId");

      let milestones = [...MILESTONES];

      if (phaseFilter) {
        const phaseNum = Number(phaseFilter) as 1 | 2 | 3 | 4;
        if ([1, 2, 3, 4].includes(phaseNum)) {
          milestones = milestones.filter((m) => m.phase === phaseNum);
        }
      }

      if (trackFilter) {
        milestones = milestones.filter((m) => m.trackId === trackFilter);
      }

      milestones.sort((a, b) => a.sortOrder - b.sortOrder);

      return jsonResponse({
        phases: PHASES,
        tracks: TRACKS,
        milestones,
      });
    }

    // GET /roadmap/phases
    if (pathname === "/roadmap/phases" && request.method === "GET") {
      return jsonResponse(PHASES);
    }

    // GET /roadmap/tracks
    if (pathname === "/roadmap/tracks" && request.method === "GET") {
      return jsonResponse(TRACKS);
    }

    // GET /roadmap/milestones
    if (pathname === "/roadmap/milestones" && request.method === "GET") {
      const phaseFilter = searchParams.get("phase");
      const trackFilter = searchParams.get("trackId");

      let milestones = [...MILESTONES];

      if (phaseFilter) {
        const phaseNum = Number(phaseFilter) as 1 | 2 | 3 | 4;
        if ([1, 2, 3, 4].includes(phaseNum)) {
          milestones = milestones.filter((m) => m.phase === phaseNum);
        }
      }

      if (trackFilter) {
        milestones = milestones.filter((m) => m.trackId === trackFilter);
      }

      milestones.sort((a, b) => a.sortOrder - b.sortOrder);

      return jsonResponse(milestones);
    }

    return notFound();
  },
};

// Example curl commands for local testing (with `wrangler dev`):
//   curl -i http://127.0.0.1:8787/health
//   curl -s http://127.0.0.1:8787/roadmap | jq
//   curl -s "http://127.0.0.1:8787/roadmap?phase=2" | jq '.milestones'
//   curl -s "http://127.0.0.1:8787/roadmap?trackId=ledger-automation" | jq '.milestones'
