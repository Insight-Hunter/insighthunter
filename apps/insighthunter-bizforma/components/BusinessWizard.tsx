import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProgressStepper, { StepMeta, StepStatus } from "./ProgressStepper";

type StepComponentProps = {
  value: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
};

type WizardStepDefinition = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  component: React.ComponentType<StepComponentProps>;
  validate?: (value: Record<string, unknown>, allData: WizardData) => boolean;
};

type WizardData = Record<string, Record<string, unknown>>;

type SessionPayload = {
  sessionId: string;
  currentStep: number;
  data: WizardData;
};

type BusinessWizardProps = {
  sessionId?: string;
  initialStep?: number;
  initialData?: WizardData;
  steps?: WizardStepDefinition[];
  onComplete?: (payload: SessionPayload) => void;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function PanelField({
  label,
  value,
  placeholder,
  rows = 1,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm text-slate-200">
      <span className="font-medium">{label}</span>
      {rows === 1 ? (
        <input
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
        />
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          rows={rows}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
        />
      )}
    </label>
  );
}

function StepSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

function ConceptStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Business concept"
      subtitle="Define your product, ideal customer, and launch goals."
    >
      <PanelField
        label="Core idea"
        value={String(value.concept ?? "")}
        placeholder="Describe what your business does and why it matters."
        rows={4}
        onChange={(next) => onChange({ ...value, concept: next })}
      />
      <PanelField
        label="Target customer"
        value={String(value.targetCustomer ?? "")}
        placeholder="Who will buy this product or service?"
        onChange={(next) => onChange({ ...value, targetCustomer: next })}
      />
      <PanelField
        label="Launch goal"
        value={String(value.launchGoal ?? "")}
        placeholder="What is the earliest milestone you want to reach?"
        onChange={(next) => onChange({ ...value, launchGoal: next })}
      />
    </StepSection>
  );
}

function NameStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Name selection"
      subtitle="Capture your business name and alternatives."
    >
      <PanelField
        label="Business name"
        value={String(value.businessName ?? "")}
        placeholder="e.g. Insight Hunter LLC"
        onChange={(next) => onChange({ ...value, businessName: next })}
      />
      <PanelField
        label="Doing business as"
        value={String(value.dba ?? "")}
        placeholder="Optional trade name if different from legal name"
        onChange={(next) => onChange({ ...value, dba: next })}
      />
      <PanelField
        label="Alternatives"
        value={String(value.alternatives ?? "")}
        placeholder="Add a few backup name ideas separated by commas"
        rows={3}
        onChange={(next) => onChange({ ...value, alternatives: next })}
      />
    </StepSection>
  );
}

function EntityStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Entity type"
      subtitle="Compare the structure, ownership, and tax treatment."
    >
      <PanelField
        label="Entity type"
        value={String(value.entityType ?? "")}
        placeholder="LLC, S Corp, C Corp, partnership"
        onChange={(next) => onChange({ ...value, entityType: next })}
      />
      <PanelField
        label="Ownership structure"
        value={String(value.ownershipStructure ?? "")}
        placeholder="Single member, multi-member, shareholders"
        onChange={(next) => onChange({ ...value, ownershipStructure: next })}
      />
      <PanelField
        label="Formation state"
        value={String(value.stateCode ?? "")}
        placeholder="State code for registration, e.g. CA"
        onChange={(next) => onChange({ ...value, stateCode: next.toUpperCase() })}
      />
    </StepSection>
  );
}

function RegistrationStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Registration"
      subtitle="Track your state filing and registered agent preferences."
    >
      <PanelField
        label="Registered agent"
        value={String(value.registeredAgent ?? "")}
        placeholder="Company or person designated to receive service of process"
        onChange={(next) => onChange({ ...value, registeredAgent: next })}
      />
      <PanelField
        label="Filing path"
        value={String(value.filingPath ?? "")}
        placeholder="Online filing, paper filing, or using a service"
        onChange={(next) => onChange({ ...value, filingPath: next })}
      />
      <PanelField
        label="Estimated filing date"
        value={String(value.filingDate ?? "")}
        placeholder="e.g. 2025-05-01"
        onChange={(next) => onChange({ ...value, filingDate: next })}
      />
    </StepSection>
  );
}

function EINStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="EIN & tax"
      subtitle="Prepare your federal tax profile and payroll intent."
    >
      <PanelField
        label="EIN status"
        value={String(value.ein ?? "")}
        placeholder="Enter EIN if already assigned"
        onChange={(next) => onChange({ ...value, ein: next })}
      />
      <PanelField
        label="Payroll intent"
        value={String(value.payrollIntent ?? "")}
        placeholder="Will you hire employees in the first 12 months?"
        onChange={(next) => onChange({ ...value, payrollIntent: next })}
      />
      <PanelField
        label="Primary tax use"
        value={String(value.taxUse ?? "")}
        placeholder="E.g. payroll, contractor payments, sales tax"
        onChange={(next) => onChange({ ...value, taxUse: next })}
      />
    </StepSection>
  );
}

function ComplianceStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Compliance"
      subtitle="Capture your annual filing schedule and regulatory obligations."
    >
      <PanelField
        label="Annual filings"
        value={String(value.annualFilings ?? "")}
        placeholder="Annual report, registered agent, franchise tax"
        onChange={(next) => onChange({ ...value, annualFilings: next })}
      />
      <PanelField
        label="Licenses / permits"
        value={String(value.licenses ?? "")}
        placeholder="List any local, state, or industry permits needed"
        rows={3}
        onChange={(next) => onChange({ ...value, licenses: next })}
      />
      <PanelField
        label="Compliance team"
        value={String(value.complianceTeam ?? "")}
        placeholder="Accountant, attorney, or business advisor"
        onChange={(next) => onChange({ ...value, complianceTeam: next })}
      />
    </StepSection>
  );
}

function AccountingStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Accounting"
      subtitle="Choose bookkeeping, reporting, and cash management support."
    >
      <PanelField
        label="Accounting software"
        value={String(value.accountingSoftware ?? "")}
        placeholder="QuickBooks, Xero, Wave, or manual spreadsheets"
        onChange={(next) => onChange({ ...value, accountingSoftware: next })}
      />
      <PanelField
        label="Bookkeeping support"
        value={String(value.bookkeeper ?? "")}
        placeholder="In-house, outsourced, or advisory partner"
        onChange={(next) => onChange({ ...value, bookkeeper: next })}
      />
      <PanelField
        label="Tax advisor"
        value={String(value.taxAdvisor ?? "")}
        placeholder="CPA, enrolled agent, or tax lawyer"
        onChange={(next) => onChange({ ...value, taxAdvisor: next })}
      />
    </StepSection>
  );
}

function FinancingStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Financing"
      subtitle="Model cash needs, banking, and funding sources."
    >
      <PanelField
        label="Funding plan"
        value={String(value.fundingPlan ?? "")}
        placeholder="Bootstrapped, loan, investor, or line of credit"
        rows={3}
        onChange={(next) => onChange({ ...value, fundingPlan: next })}
      />
      <PanelField
        label="Bank account"
        value={String(value.bankAccount ?? "")}
        placeholder="Preferred business bank or treasury account"
        onChange={(next) => onChange({ ...value, bankAccount: next })}
      />
      <PanelField
        label="Runway"
        value={String(value.runway ?? "")}
        placeholder="How many months of cash runway do you need?"
        onChange={(next) => onChange({ ...value, runway: next })}
      />
    </StepSection>
  );
}

function MarketingStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Marketing"
      subtitle="Plan customer acquisition, positioning, and launch messaging."
    >
      <PanelField
        label="Channels"
        value={String(value.channels ?? "")}
        placeholder="Email, social, referrals, paid ads"
        rows={3}
        onChange={(next) => onChange({ ...value, channels: next })}
      />
      <PanelField
        label="Positioning"
        value={String(value.positioning ?? "")}
        placeholder="What makes your business unique?"
        rows={3}
        onChange={(next) => onChange({ ...value, positioning: next })}
      />
      <PanelField
        label="Marketing budget"
        value={String(value.marketingBudget ?? "")}
        placeholder="Monthly or launch budget target"
        onChange={(next) => onChange({ ...value, marketingBudget: next })}
      />
    </StepSection>
  );
}

function WebStep({ value, onChange }: StepComponentProps) {
  return (
    <StepSection
      title="Web & domain"
      subtitle="Capture your domain, website, and business email requirements."
    >
      <PanelField
        label="Domain name"
        value={String(value.domainName ?? "")}
        placeholder="e.g. acmesolutions.com"
        onChange={(next) => onChange({ ...value, domainName: next })}
      />
      <PanelField
        label="Website goals"
        value={String(value.websiteGoals ?? "")}
        placeholder="Landing page, e-commerce, service booking"
        rows={3}
        onChange={(next) => onChange({ ...value, websiteGoals: next })}
      />
      <PanelField
        label="Business email"
        value={String(value.emailProvider ?? "")}
        placeholder="Google Workspace, Microsoft 365, or other provider"
        onChange={(next) => onChange({ ...value, emailProvider: next })}
      />
    </StepSection>
  );
}

function CalendarStep({ value }: StepComponentProps) {
  return (
    <StepSection
      title="Compliance calendar"
      subtitle="Review your planned deadlines and next milestones."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-white">Current summary</h3>
          <p className="mt-2 text-sm text-slate-300">
            {String(value.summary ?? 'Review your prior step inputs to confirm filings and deadlines.')}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-white">Next milestone</h3>
          <p className="mt-2 text-sm text-slate-300">
            {String(value.nextMilestone ?? 'Finalize filings, registered agent setup, and EIN application.')}
          </p>
        </div>
      </div>
    </StepSection>
  );
}

const defaultSteps: WizardStepDefinition[] = [
  {
    id: "concept",
    title: "Business concept",
    shortTitle: "Concept",
    description: "Define your idea, customer, and launch goals.",
    component: ConceptStep,
    validate: (value) => String(value.concept ?? "").trim().length > 0,
  },
  {
    id: "name",
    title: "Name selection",
    shortTitle: "Name",
    description: "Pick and refine your business name.",
    component: NameStep,
    validate: (value) => String(value.businessName ?? "").trim().length > 0,
  },
  {
    id: "entity",
    title: "Entity type",
    shortTitle: "Entity",
    description: "Compare LLC, corporation, and tax options.",
    component: EntityStep,
    validate: (value) => String(value.entityType ?? "").trim().length > 0,
  },
  {
    id: "registration",
    title: "Registration",
    shortTitle: "Register",
    description: "Plan state filing and registered agent setup.",
    component: RegistrationStep,
    validate: (value) => String(value.registeredAgent ?? "").trim().length > 0,
  },
  {
    id: "ein",
    title: "EIN & tax",
    shortTitle: "EIN",
    description: "Prepare EIN application and tax setup.",
    component: EINStep,
    validate: (value) => String(value.payrollIntent ?? "").trim().length > 0,
  },
  {
    id: "compliance",
    title: "Compliance",
    shortTitle: "Compliance",
    description: "Outline annual filings and reminders.",
    component: ComplianceStep,
    validate: (value) => String(value.annualFilings ?? "").trim().length > 0,
  },
  {
    id: "accounting",
    title: "Accounting",
    shortTitle: "Accounting",
    description: "Select bookkeeping and tax workflows.",
    component: AccountingStep,
    validate: (value) => String(value.accountingSoftware ?? "").trim().length > 0,
  },
  {
    id: "financing",
    title: "Financing",
    shortTitle: "Finance",
    description: "Model startup costs, banking, and funding.",
    component: FinancingStep,
    validate: (value) => String(value.fundingPlan ?? "").trim().length > 0,
  },
  {
    id: "marketing",
    title: "Marketing",
    shortTitle: "Marketing",
    description: "Plan channels, messaging, and budget.",
    component: MarketingStep,
    validate: (value) => String(value.channels ?? "").trim().length > 0,
  },
  {
    id: "web",
    title: "Web & domain",
    shortTitle: "Web",
    description: "Set up domain, DNS, and business email.",
    component: WebStep,
    validate: (value) => String(value.domainName ?? "").trim().length > 0,
  },
  {
    id: "calendar",
    title: "Compliance calendar",
    shortTitle: "Calendar",
    description: "Generate your filing and tax calendar.",
    component: CalendarStep,
    validate: () => true,
  },
];

function createEmptyWizardData(steps: WizardStepDefinition[]): WizardData {
  return steps.reduce<WizardData>((acc, step) => {
    acc[step.id] = {};
    return acc;
  }, {});
}

function inferStepStatus(
  index: number,
  currentStep: number,
  isValid: boolean,
  hasDraft: boolean
): StepStatus {
  if (isValid) return "complete";
  if (index === currentStep && hasDraft) return "in-progress";
  if (index === currentStep) return "in-progress";
  if (hasDraft) return "warning";
  return "not-started";
}

async function saveSession(payload: SessionPayload) {
  const response = await fetch("/api/session", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to save session: ${response.status}`);
  }

  return response.json().catch(() => null);
}

export default function BusinessWizard({
  sessionId = crypto.randomUUID(),
  initialStep = 0,
  initialData,
  steps = defaultSteps,
  onComplete,
}: BusinessWizardProps) {
  const [currentStep, setCurrentStep] = useState(() =>
    Math.min(Math.max(initialStep, 0), Math.max(steps.length - 1, 0))
  );
  const [wizardData, setWizardData] = useState<WizardData>(
    initialData ?? createEmptyWizardData(steps)
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const autosaveTimer = useRef<number | null>(null);
  const firstRenderRef = useRef(true);

  const stepMeta = useMemo<StepMeta[]>(() => {
    return steps.map((step, index) => {
      const stepData = wizardData[step.id] ?? {};
      const hasDraft = Object.values(stepData).some((value) => {
        if (typeof value === "string") return value.trim().length > 0;
        return value !== undefined && value !== null && value !== "";
      });

      const isValid = step.validate ? step.validate(stepData, wizardData) : false;
      const status = inferStepStatus(index, currentStep, isValid, hasDraft);

      return {
        id: step.id,
        title: step.title,
        shortTitle: step.shortTitle,
        description: step.description,
        isValid,
        hasDraft,
        status,
        isLocked: false,
      };
    });
  }, [steps, wizardData, currentStep]);

  const currentDefinition = steps[currentStep];
  const CurrentStepComponent = currentDefinition.component;
  const isLastStep = currentStep === steps.length - 1;
  const currentStepMeta = stepMeta[currentStep];
  const canAdvance = currentStepMeta?.isValid || currentStepMeta?.hasDraft;

  const persist = useCallback(async () => {
    try {
      setSaveState("saving");

      await saveSession({
        sessionId,
        currentStep,
        data: wizardData,
      });

      setSaveState("saved");
      setLastSavedAt(new Date().toISOString());

      window.setTimeout(() => {
        setSaveState((prev) => (prev === "saved" ? "idle" : prev));
      }, 1800);
    } catch (error) {
      console.error(error);
      setSaveState("error");
    }
  }, [sessionId, currentStep, wizardData]);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }

    setSaveState("saving");

    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(() => {
      void persist();
    }, 700);

    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [wizardData, currentStep, persist]);

  const updateStepData = useCallback(
    (patch: Record<string, unknown>) => {
      const stepId = steps[currentStep].id;

      setWizardData((prev) => ({
        ...prev,
        [stepId]: {
          ...(prev[stepId] ?? {}),
          ...patch,
        },
      }));
    },
    [currentStep, steps]
  );

  const goToStep = useCallback((index: number) => {
    setCurrentStep(Math.min(Math.max(index, 0), steps.length - 1));
  }, [steps.length]);

  const goNext = useCallback(() => {
    if (isLastStep) {
      onComplete?.({
        sessionId,
        currentStep,
        data: wizardData,
      });
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [currentStep, isLastStep, onComplete, sessionId, steps.length, wizardData]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-6 lg:self-start">
        <ProgressStepper
          steps={stepMeta}
          currentStep={currentStep}
          allowStepJump
          onStepClick={goToStep}
        />
      </div>

      <section className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Step {currentStep + 1} of {steps.length}
              </div>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                {currentDefinition.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                {currentDefinition.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                  saveState === "saving" && "bg-sky-300/15 text-sky-100",
                  saveState === "saved" && "bg-emerald-300/15 text-emerald-100",
                  saveState === "error" && "bg-rose-300/15 text-rose-100",
                  saveState === "idle" && "bg-white/5 text-slate-300"
                )}
              >
                {saveState === "saving" && "Saving"}
                {saveState === "saved" && "Saved"}
                {saveState === "error" && "Save failed"}
                {saveState === "idle" && "Draft"}
              </span>

              {lastSavedAt ? (
                <span className="text-xs text-slate-400">
                  Last saved {new Date(lastSavedAt).toLocaleTimeString()}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 md:p-6">
          <CurrentStepComponent
            value={wizardData[currentDefinition.id] ?? {}}
            onChange={updateStepData}
          />
        </div>

        <div className="hidden items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4 md:flex">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <div className="text-sm text-slate-400">
            {currentStepMeta?.isValid
              ? "This step is complete."
              : currentStepMeta?.hasDraft
              ? "Draft progress saved."
              : "Add some details to continue."}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="rounded-2xl bg-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLastStep ? "Finish" : "Continue"}
          </button>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-slate-950/95 p-4 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="min-w-[140px] rounded-2xl bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLastStep ? "Finish" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
