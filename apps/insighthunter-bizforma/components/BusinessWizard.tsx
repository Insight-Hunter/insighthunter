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

function PlaceholderStep({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return function Step({ value, onChange }: StepComponentProps) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
          <label className="block text-sm font-medium text-slate-200">
            Notes
          </label>
          <textarea
            value={String(value.notes ?? "")}
            onChange={(event) => onChange({ notes: event.target.value })}
            rows={6}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500"
            placeholder={`Add details for ${title.toLowerCase()}...`}
          />
        </div>
      </div>
    );
  };
}

const defaultSteps: WizardStepDefinition[] = [
  {
    id: "concept",
    title: "Business concept",
    shortTitle: "Concept",
    description: "Define your idea, customer, and launch goals.",
    component: PlaceholderStep({
      title: "Business concept",
      subtitle: "Capture the core business idea and target market.",
    }),
    validate: (value) => Boolean(String(value.notes ?? "").trim()),
  },
  {
    id: "name",
    title: "Name selection",
    shortTitle: "Name",
    description: "Pick and refine your business name.",
    component: PlaceholderStep({
      title: "Name selection",
      subtitle: "Store shortlisted names and naming rationale.",
    }),
    validate: (value) => Boolean(String(value.notes ?? "").trim()),
  },
  {
    id: "entity",
    title: "Entity type",
    shortTitle: "Entity",
    description: "Compare LLC, corporation, and tax options.",
    component: PlaceholderStep({
      title: "Entity type",
      subtitle: "Document the recommended entity and why.",
    }),
  },
  {
    id: "registration",
    title: "Registration",
    shortTitle: "Register",
    description: "Plan state filing and registered agent setup.",
    component: PlaceholderStep({
      title: "Registration",
      subtitle: "Track state formation tasks and filing decisions.",
    }),
  },
  {
    id: "ein",
    title: "EIN & tax",
    shortTitle: "EIN",
    description: "Prepare EIN application and tax setup.",
    component: PlaceholderStep({
      title: "EIN & tax",
      subtitle: "Capture SS-4 preparation details and tax steps.",
    }),
  },
  {
    id: "compliance",
    title: "Compliance",
    shortTitle: "Compliance",
    description: "Outline annual filings and reminders.",
    component: PlaceholderStep({
      title: "Compliance",
      subtitle: "Track renewal, BOI, and reporting obligations.",
    }),
  },
  {
    id: "accounting",
    title: "Accounting",
    shortTitle: "Accounting",
    description: "Select bookkeeping and tax workflows.",
    component: PlaceholderStep({
      title: "Accounting",
      subtitle: "Capture accounting stack and advisory needs.",
    }),
  },
  {
    id: "financing",
    title: "Financing",
    shortTitle: "Finance",
    description: "Model startup costs, banking, and funding.",
    component: PlaceholderStep({
      title: "Financing",
      subtitle: "Document runway, capital needs, and account setup.",
    }),
  },
  {
    id: "marketing",
    title: "Marketing",
    shortTitle: "Marketing",
    description: "Plan channels, messaging, and budget.",
    component: PlaceholderStep({
      title: "Marketing",
      subtitle: "Set launch channels and customer acquisition plan.",
    }),
  },
  {
    id: "web",
    title: "Web & domain",
    shortTitle: "Web",
    description: "Set up domain, DNS, and business email.",
    component: PlaceholderStep({
      title: "Web & domain",
      subtitle: "Capture digital presence setup requirements.",
    }),
  },
  {
    id: "calendar",
    title: "Compliance calendar",
    shortTitle: "Calendar",
    description: "Generate your filing and tax calendar.",
    component: PlaceholderStep({
      title: "Compliance calendar",
      subtitle: "Review and confirm timeline assumptions.",
    }),
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
