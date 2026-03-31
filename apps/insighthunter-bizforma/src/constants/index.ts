// src/constants/index.ts
import type { Phase, StepWithPhase } from "../types";

// ─── Apple HIG Color System ───────────────────────────────────────────────────
export const COLORS = {
  blue:    "#007AFF",
  green:   "#34C759",
  orange:  "#FF9500",
  red:     "#FF3B30",
  purple:  "#AF52DE",
  indigo:  "#5856D6",
  teal:    "#5AC8FA",
  gray1:   "#1C1C1E",
  gray2:   "#2C2C2E",
  gray3:   "#3A3A3C",
  gray4:   "#48484A",
  gray5:   "#636366",
  gray6:   "#8E8E93",
  label:   "#000000",
  label2:  "#3C3C43",
  sep:     "rgba(60,60,67,0.12)",
  fill:    "rgba(120,120,128,0.12)",
  bg:      "#F2F2F7",
  surface: "#FFFFFF",
} as const;

export type ColorKey = keyof typeof COLORS;

// ─── Phase & Step Registry ────────────────────────────────────────────────────
export const PHASES: Phase[] = [
  {
    id: "conceptualize",
    icon: "💡",
    label: "Conceptualize",
    color: COLORS.purple,
    steps: [
      { id: "idea",      label: "Business Idea",    icon: "🧠" },
      { id: "market",    label: "Market Research",  icon: "🔍" },
      { id: "model",     label: "Business Model",   icon: "📊" },
      { id: "name",      label: "Business Name",    icon: "✏️" },
      { id: "structure", label: "Legal Structure",  icon: "⚖️" },
    ],
  },
  {
    id: "register",
    icon: "📋",
    label: "Register",
    color: COLORS.blue,
    steps: [
      { id: "state_reg",        label: "State Registration",  icon: "🏛️" },
      { id: "ein",              label: "EIN / Federal Tax ID", icon: "🔢" },
      { id: "licenses",         label: "Licenses & Permits",   icon: "📜" },
      { id: "registered_agent", label: "Registered Agent",     icon: "👤" },
      { id: "operating",        label: "Operating Agreement",  icon: "📄" },
    ],
  },
  {
    id: "finance",
    icon: "💰",
    label: "Finance & Tax",
    color: COLORS.green,
    steps: [
      { id: "bank",       label: "Business Bank Account", icon: "🏦" },
      { id: "accounting", label: "Accounting Setup",      icon: "📒" },
      { id: "fed_tax",    label: "Federal Tax Setup",     icon: "🦅" },
      { id: "state_tax",  label: "State Tax Setup",       icon: "🏠" },
      { id: "payroll",    label: "Payroll Setup",         icon: "💸" },
      { id: "funding",    label: "Funding Strategy",      icon: "🚀" },
    ],
  },
  {
    id: "digital",
    icon: "🌐",
    label: "Digital Presence",
    color: COLORS.teal,
    steps: [
      { id: "domain",  label: "Domain Selection",  icon: "🔗" },
      { id: "website", label: "Website Creation",  icon: "💻" },
      { id: "seo",     label: "SEO Strategy",      icon: "📈" },
      { id: "social",  label: "Social Media",      icon: "📱" },
    ],
  },
  {
    id: "launch",
    icon: "🚀",
    label: "Launch & Market",
    color: COLORS.orange,
    steps: [
      { id: "branding",    label: "Brand Identity",    icon: "🎨" },
      { id: "marketing",   label: "Marketing Plan",    icon: "📣" },
      { id: "launch_plan", label: "Launch Checklist",  icon: "✅" },
    ],
  },
];

export const ALL_STEPS: StepWithPhase[] = PHASES.flatMap((p) =>
  p.steps.map((s) => ({ ...s, phase: p.id, phaseColor: p.color }))
);

// ─── US States ────────────────────────────────────────────────────────────────
export const US_STATES: string[] = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
  "District of Columbia",
];

// ─── API Base URL ─────────────────────────────────────────────────────────────
export const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8787" : "");
