import React from "react";

type ProgressStepperProps = {
  steps: string[];
  currentStep: number;
  onStepClick?: (index: number) => void;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function ProgressStepper({
  steps,
  currentStep,
  onStepClick,
}: ProgressStepperProps) {
  return (
    <div className="space-y-4">
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-teal-300 transition-all duration-300"
          style={{
            width: `${((currentStep + 1) / Math.max(steps.length, 1)) * 100}%`,
          }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          const content = (
            <div
              className={cx(
                "group flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition",
                isCurrent &&
                  "border-teal-300/50 bg-teal-300/10 shadow-[0_0_0_1px_rgba(94,234,212,0.15)]",
                isComplete &&
                  "border-emerald-300/20 bg-emerald-300/10 hover:bg-emerald-300/15",
                isUpcoming &&
                  "border-white/10 bg-white/5 hover:bg-white/10"
              )}
            >
              <div
                className={cx(
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  isCurrent && "border-teal-300 bg-teal-300 text-slate-950",
                  isComplete && "border-emerald-300 bg-emerald-300 text-slate-950",
                  isUpcoming && "border-white/15 bg-white/10 text-slate-200"
                )}
              >
                {isComplete ? "✓" : index + 1}
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={cx(
                    "text-sm font-medium",
                    isCurrent && "text-white",
                    isComplete && "text-emerald-100",
                    isUpcoming && "text-slate-200"
                  )}
                >
                  {step}
                </div>
                <div
                  className={cx(
                    "mt-1 text-xs uppercase tracking-[0.18em]",
                    isCurrent && "text-teal-200",
                    isComplete && "text-emerald-200/80",
                    isUpcoming && "text-slate-400"
                  )}
                >
                  {isCurrent
                    ? "Current step"
                    : isComplete
                    ? "Completed"
                    : "Upcoming"}
                </div>
              </div>
            </div>
          );

          if (onStepClick) {
            return (
              <button
                key={step}
                type="button"
                onClick={() => onStepClick(index)}
                className="block w-full"
              >
                {content}
              </button>
            );
          }

          return <div key={step}>{content}</div>;
        })}
      </div>
    </div>
  );
}
