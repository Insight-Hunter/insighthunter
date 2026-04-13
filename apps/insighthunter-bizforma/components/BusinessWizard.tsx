import React, { useMemo, useState } from "react";
import ProgressStepper from "./ProgressStepper";
import {
  GlassButton,
  GlassCard,
  GlassPanel,
  GlassSection,
} from "./GlassComponents";

type WizardStepId =
  | "concept"
  | "name"
  | "entity"
  | "registration"
  | "ein"
  | "compliance"
  | "accounting"
  | "financing"
  | "marketing"
  | "web"
  | "calendar";

export type BizFormaWizardState = {
  concept: string;
  targetCustomer: string;
  businessName: string;
  alternateNames: string[];
  entityType: string;
  formationState: string;
  registeredAgent: string;
  needsEin: boolean;
  taxNotes: string;
  complianceNotes: string;
  accountingStack: string;
  financingPlan: string;
  marketingPlan: string;
  domainStatus: string;
  calendarNotes: string;
};

type StepComponentProps = {
  state: BizFormaWizardState;
  update: (patch: Partial<BizFormaWizardState>) => void;
};

function StepPlaceholder({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: React.ReactNode;
}) {
  return (
    <GlassSection title={title} description={description}>
      <GlassCard>{fields}</GlassCard>
    </GlassSection>
  );
}

function ConceptStep({ state, update }: StepComponentProps) {
  return (
    <StepPlaceholder
      title="Business concept"
      description="Define the idea, customer profile, and intended offer before formation choices are scored."
      fields={
        <div className="grid gap-4">
          <textarea
            value={state.concept}
            onChange={(e) => update({ concept: e.target.value })}
            placeholder="Describe the business idea, product, or service"
            className="min-h-32 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none"
          />
          <input
            value={state.targetCustomer}
            onChange={(e) => update({ targetCustomer: e.target.value })}
            placeholder="Who is the target customer?"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none"
          />
        </div>
      }
    />
  );
}

function NameSelectionStep({ state, update }: StepComponentProps) {
  return (
    <StepPlaceholder
      title="Name selection"
      description="Capture the primary business name and fallback options for state availability checks."
      fields={
        <div className="grid gap-4">
          <input
            value={state.businessName}
            onChange={(e) => update({ businessName: e.target.value })}
            placeholder="Preferred business name"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none"
          />
          <input
            value={state.alternateNames[0] ?? ""}
            onChange={(e) =>
              update({
                alternateNames: [
                  e.target.value,
                  state.alternateNames[1] ?? "",
                  state.alternateNames[2] ?? "",
                ],
              })
            }
            placeholder="Alternate name 1"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none"
          />
          <input
            value={state.alternateNames[1] ?? ""}
            onChange={(e) =>
              update({
                alternateNames: [
                  state.alternateNames[0] ?? "",
                  e.target.value,
                  state.alternateNames[2] ?? "",
                ],
              })
            }
            placeholder="Alternate name 2"
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none"
          />
        </div>
      }
    />
  );
}

function GenericStep({
  title,
  description,
  value,
  onChange,
  placeholder,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <StepPlaceholder
      title={title}
      description={description}
      fields={
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-36 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-300/70 focus:border-teal-300/70 focus:outline-none"
        />
      }
    />
  );
}

const wizardSteps: Array<{ id: WizardStepId; title: string; shortTitle: string; description: string; }> = [
  { id: "concept", 
    title: "Business concept",
    shortTitle: "Concept",
    description: "Define your idea, audience, and launch goals.",
    isValid: true,
    hasDraft: true },
  { id: "name", 
    title: "Name",
    description: "Choose an available, brandable business name.",
    status: "in-progress",
    hasDraft: true },
  { id: "entity", 
   title: "Entity",
   shortTitle: "Entity",
   description: "Compare LLC, corporation, and tax treatment."},
  { id: "registration", 
    title: "Registration",
    shortTitle: "Register",
    description: "State filing and registered agent setup."},
  { id: "ein", 
    title: "EIN & Tax",
    shortTitle: "EIN",
    description: "Prepare SS-4 and federal tax setup."},
  { id: "compliance", 
    title: "Compliance",
    shortTitle: "Compliance",
    description: "Annual reports, BOI, permits, and reminders."},
  { id: "accounting", 
    title: "Accounting",
    shortTitle: "Accounting",
    description: "Books, tax strategy, and software setup."},
  { id: "financing", 
    title: "Financing",
    shortTitle: "Finance",
    description: "Banking, startup budget, and funding options."},
  { id: "marketing", 
    title: "Marketing", 
    shortTitle: "Marketing",
    description: "Go-to-market strategy and budget planning."},
  { id: "web", 
    title: "Web & Domain",
    shortTitle: "Web",
    description: "Domain, DNS, email, and web presence setup." },
  { id: "calendar", 
    title: "Compliance Calendar", 
    shortTitle: "Calendar",
    description: "AI-generated filing and tax deadline calendar.",},
];

const initialState: BizFormaWizardState = {
  concept: "",
  targetCustomer: "",
  businessName: "",
  alternateNames: ["", "", ""],
  entityType: "",
  formationState: "",
  registeredAgent: "",
  needsEin: true,
  taxNotes: "",
  complianceNotes: "",
  accountingStack: "",
  financingPlan: "",
  marketingPlan: "",
  domainStatus: "",
  calendarNotes: "",
};

export default function BusinessWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [state, setState] = useState<BizFormaWizardState>(initialState);
  const [isSaving, setIsSaving] = useState(false);

  const step = wizardSteps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / wizardSteps.length) * 100);

  function update(patch: Partial<BizFormaWizardState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  async function saveDraft() {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsSaving(false);
    }
  }

  const renderedStep = useMemo(() => {
    switch (step.id) {
      case "concept":
        return <ConceptStep state={state} update={update} />;
      case "name":
        return <NameSelectionStep state={state} update={update} />;
      case "entity":
        return (
          <GenericStep
            title="Entity type"
            description="Capture owner count, liability concerns, tax preference, and growth plans."
            value={state.entityType}
            onChange={(value) => update({ entityType: value })}
            placeholder="Example: Single-owner consulting business, wants liability protection and simple tax handling."
          />
        );
      case "registration":
        return (
          <GenericStep
            title="Registration"
            description="Track formation state, registered agent, and filing path."
            value={`${state.formationState}\n${state.registeredAgent}`.trim()}
            onChange={(value) => update({ formationState: value })}
            placeholder="Formation state, registered agent, filing readiness, and state-specific notes."
          />
        );
      case "ein":
        return (
          <GenericStep
            title="EIN and tax"
            description="Prepare EIN details, SS-4 notes, and early tax registrations."
            value={state.taxNotes}
            onChange={(value) => update({ taxNotes: value })}
            placeholder="Responsible party, EIN timing, payroll intent, and tax classification notes."
          />
        );
      case "compliance":
        return (
          <GenericStep
            title="Compliance"
            description="List annual report needs, BOI tracking, permits, and renewal tasks."
            value={state.complianceNotes}
            onChange={(value) => update({ complianceNotes: value })}
            placeholder="Annual report, BOI, licenses, permits, registered agent, and deadlines."
          />
        );
      case "accounting":
        return (
          <GenericStep
            title="Accounting"
            description="Define bookkeeping stack, chart of accounts needs, and advisor support."
            value={state.accountingStack}
            onChange={(value) => update({ accountingStack: value })}
            placeholder="Software, CPA relationship, bookkeeping workflow, and tax planning approach."
          />
        );
      case "financing":
        return (
          <GenericStep
            title="Financing"
            description="Capture funding path, banking setup, and startup cost planning."
            value={state.financingPlan}
            onChange={(value) => update({ financingPlan: value })}
            placeholder="Owner capital, loans, grants, bank account setup, and startup cash needs."
          />
        );
      case "marketing":
        return (
          <GenericStep
            title="Marketing"
            description="Define launch channels, positioning, and budget assumptions."
            value={state.marketingPlan}
            onChange={(value) => update({ marketingPlan: value })}
            placeholder="Target channels, launch offer, messaging, brand priorities, and budget."
          />
        );
      case "web":
        return (
          <GenericStep
            title="Web and domain"
            description="Track domain, website, DNS, email, and online presence decisions."
            value={state.domainStatus}
            onChange={(value) => update({ domainStatus: value })}
            placeholder="Domain purchased, DNS setup, business email, and site launch 
