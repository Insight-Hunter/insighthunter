import React from "react";

export type StepStatus = "not-started" | "in-progress" | "complete" | "warning";

export type StepMeta = {
  id: string;
  title: string;
  shortTitle?: string;
  description?: string;
  status?: StepStatus;
  isValid?: boolean;
  hasDraft?: boolean;
  isLocked?: boolean;
};

type ProgressStepperProps = {
  steps: StepMeta[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  allowStepJump?: boolean;
  showMobileSummary?: boolean;
  className?: string;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function getStatus(step: StepMeta, index: number, currentStep: number): StepStatus {
  if (step.status) return step.status;
  if (step.isValid) return "complete";
  if (index === currentStep) return "in-progress";
  return "not-started";
}

function getStatusLabel(status: StepStatus, hasDraft?: boolean) {
  if (status === "complete") return "Complete";
  if (status === "warning") return "Needs review";
  if (status === "in-progress" && hasDraft) return "Draft saved";
  if (status === "in-progress") return "In progress";
  if (hasDraft) return "Draft started";
  return "Not started";
}

function statusClasses(status: StepStatus, isCurrent: boolean) {
  if (isCurrent) {
    return {
      card: "border-teal-300/50 bg-teal-300/10 shadow-[0_0_0_1px_rgba(94,234,212,0.16)]",
      dot: "border-teal-300 bg-teal-300 text-slate-950",
      text: "text-white",
      meta: "text-teal-200",
      rail: "bg-teal-300/60",
    };
  }

  if (status === "complete") {
    return {
      card: "border-emerald-300/20 bg-emerald-300/10 hover:bg-emerald-300/15",
      dot: "border-emerald-300 bg-emerald-300 text-slate-950",
      text: "text-emerald-50",
      meta: "text-emerald-200/90",
      rail: "bg-emerald-300/50",
    };
  }

  if (status === "warning") {
    return {
      card: "border-amber-300/25 bg-amber-300/10 hover:bg-amber-300/15",
      dot: "border-amber-300 bg-amber-300 text-slate-950",
      text: "text-amber-50",
      meta: "text-amber-200/90",
      rail: "bg-amber-300/50",
    };
  }

  if (status === "in-progress") {
    return {
      card: "border-sky-300/20 bg-sky-300/10 hover:bg-sky-300/15",
      dot: "border-sky-300 bg-sky-300 text-slate-950",
      text: "text-sky-50",
      meta: "text-sky-200/90",
      rail: "bg-sky-300/50",
    };
  }

  return {
    card: "border-white/10 bg-white/5 hover:bg-white/10",
    dot: "border-white/15 bg-white/10 text-slate-200",
    text: "text-slate-200",
    meta: "text-slate-400",
    rail: "bg-white/10",
  };
}

function StepBadge({
  status,
  isValid,
  hasDraft,
}: {
  status: StepStatus;
  isValid?: boolean;
  hasDraft?: boolean;
}) {
  if (status === "complete" || isValid) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-300/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
        Complete
      </span>
    );
  }

  if (status === "warning") {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300/30 bg-amber-300/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-100">
        Review
      </span>
    );
  }

  if (hasDraft) {
    return (
      <span className="inline-flex items-center rounded-full border border-sky-300/30 bg-sky-300/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100">
        Saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
      Pending
    </span>
  );
}

export default function ProgressStepper({
  steps,
  currentStep,
  onStepClick,
  allowStepJump = true,
  showMobileSummary = true,
  className,
}: ProgressStepperProps) {
  const safeCurrentStep = Math.min(Math.max(currentStep, 0), Math.max(steps.length - 1, 0));
  const completedCount = steps.filter((step, index) => {
    const status = getStatus(step, index, safeCurrentStep);
    return status === "complete" || step.isValid;
  }).length;

  const progressPercent =
    steps.length > 0 ? ((safeCurrentStep + 1) / steps.length) * 100 : 0;

  const current = steps[safeCurrentStep];

  return (
    <aside className={cx("space-y-4", className)}>
      {showMobileSummary && current ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Step {safeCurrentStep + 1} of {steps.length}
              </div>
              <h3 className="mt-1 text-base font-semibold text-white">
                {current.title}
              </h3>
              <p className="mt-1 text-sm text-slate-300">
                {getStatusLabel(
                  getStatus(current, safeCurrentStep, safeCurrentStep),
                  current.hasDraft
                )}
              </p>
            </div>

            <StepBadge
              status={getStatus(current, safeCurrentStep, safeCurrentStep)}
              isValid={current.isValid}
              hasDraft={current.hasDraft}
            />
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-teal-300 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{completedCount} completed</span>
            <span>{steps.length - completedCount} remaining</span>
          </div>
        </div>
      ) : null}

      <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur md:block">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Formation progress
            </div>
            <div className="mt-1 text-sm font-medium text-white">
              {completedCount} of {steps.length} steps complete
            </div>
          </div>
          <div className="text-sm text-slate-300">
            {Math.round(progressPercent)}%
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-teal-300 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isCurrent = index === safeCurrentStep;
          const isComplete = index < safeCurrentStep || !!step.isValid;
          const inferredStatus = getStatus(
            { ...step, isValid: isComplete || step.isValid },
            index,
            safeCurrentStep
          );
          const styles = statusClasses(inferredStatus, isCurrent);
          const clickable =
            !!onStepClick && allowStepJump && !step.isLocked;

          const inner = (
            <div
              className={cx(
                "group relative flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                styles.card,
                clickable && "cursor-pointer"
              )}
            >
              <div className="relative flex flex-col items-center">
                <div
                  className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    styles.dot
                  )}
                >
                  {isComplete ? "✓" : index + 1}
                </div>

                {index < steps.length - 1 ? (
                  <div
                    className={cx(
                      "mt-2 h-8 w-px rounded-full",
                      isComplete ? "bg-emerald-300/40" : styles.rail
                    )}
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={cx("text-sm font-medium", styles.text)}>
                      {step.title}
                    </div>

                    {step.description ? (
                      <p className="mt-1 text-xs text-slate-400">
                        {step.description}
                      </p>
                    ) : null}
                  </div>

                  <StepBadge
                    status={inferredStatus}
                    isValid={step.isValid}
                    hasDraft={step.hasDraft}
                  />
                </div>

                <div className={cx("mt-2 text-xs uppercase tracking-[0.18em]", styles.meta)}>
                  {step.isLocked
                    ? "Locked"
                    : isCurrent
                    ? "Current step"
                    : getStatusLabel(inferredStatus, step.hasDraft)}
                </div>
              </div>
            </div>
          );

          if (clickable) {
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick(index)}
                className="block w-full"
                aria-current={isCurrent ? "step" : undefined}
              >
                {inner}
              </button>
            );
          }

          return (
            <div key={step.id} aria-current={isCurrent ? "step" : undefined}>
              {inner}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
