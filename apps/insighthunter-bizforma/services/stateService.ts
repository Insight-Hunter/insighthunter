import { states } from "../data/states";

export function listStateRequirements() {
  return states;
}

export function getStateRequirement(stateCode: string) {
  return states.find((state) => state.stateCode === stateCode.toUpperCase()) ?? null;
}

export function buildStateChecklist(stateCode: string, entityType: string) {
  const state = getStateRequirement(stateCode);
  if (!state) return [];

  return [
    {
      id: "formation-filing",
      title: `File ${entityType.toUpperCase()} formation documents`,
      feeCents: entityType === "corp" ? state.corpFeeCents : state.llcFeeCents,
      link: state.sosUrl,
    },
    {
      id: "registered-agent",
      title: "Maintain registered agent",
      required: state.registeredAgentRequired,
      link: state.sosUrl,
    },
    {
      id: "annual-report",
      title: "Track annual report or registration",
      required: state.annualReportRequired,
      feeCents: state.annualReportFeeCents,
      link: state.sosUrl,
    },
  ];
}
