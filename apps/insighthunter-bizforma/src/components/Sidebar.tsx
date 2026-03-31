// src/components/Sidebar.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PHASES, COLORS } from "../constants";
import { ProgressBar, AppleButton } from "./ui";
import { useForm } from "../context/FormContext";
import { useExport } from "../hooks/useApi";

interface SidebarProps {
  activePhase: string;
  activeStep: string;
  onPhaseChange: (phaseId: string) => void;
  onStepChange: (stepId: string) => void;
}

export function Sidebar({
  activePhase,
  activeStep,
  onPhaseChange,
  onStepChange,
}: SidebarProps) {
  const { formData, progressPct, completedSteps, totalSteps, saving, lastSaved } =
    useForm();
  const { exportJson, exportSummary } = useExport();

  return (
    <aside
      style={{
        width: 272,
        flexShrink: 0,
        backgroundColor: COLORS.surface,
        borderRight: `1px solid ${COLORS.sep}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* App Header */}
      <div
        style={{
          padding: "20px 18px 16px",
          borderBottom: `1px solid ${COLORS.sep}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.purple})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🚀
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: "-0.3px",
                color: COLORS.gray1,
              }}
            >
              BizForma
            </div>
            <div style={{ fontSize: 11, color: COLORS.gray5, marginTop: 1 }}>
              Business Formation Guide
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div
          style={{
            backgroundColor: COLORS.fill,
            borderRadius: 10,
            padding: "10px 12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 7,
            }}
          >
            <span style={{ fontSize: 12, color: COLORS.gray5 }}>
              {completedSteps} of {totalSteps} steps
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: progressPct === 100 ? COLORS.green : COLORS.blue,
              }}
            >
              {progressPct}%
            </span>
          </div>
          <ProgressBar
            value={progressPct}
            color={progressPct === 100 ? COLORS.green : COLORS.blue}
          />
          {saving && (
            <div
              style={{
                fontSize: 11,
                color: COLORS.gray5,
                marginTop: 6,
                textAlign: "right",
              }}
            >
              Saving…
            </div>
          )}
          {!saving && lastSaved && (
            <div
              style={{
                fontSize: 11,
                color: COLORS.green,
                marginTop: 6,
                textAlign: "right",
              }}
            >
              ✓ Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* Phase / Step Navigation */}
      <nav
        style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}
        aria-label="Formation steps"
      >
        {PHASES.map((phase) => {
          const isActivePhase = activePhase === phase.id;
          const phaseStepsDone = phase.steps.filter(
            (s) => Object.keys(formData[s.id] ?? {}).length > 0
          ).length;

          return (
            <div key={phase.id}>
              {/* Phase Header */}
              <button
                onClick={() => {
                  onPhaseChange(phase.id);
                  if (!isActivePhase) onStepChange(phase.steps[0].id);
                }}
                style={{
                  width: "100%",
                  padding: "9px 18px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  textAlign: "left",
                }}
                aria-expanded={isActivePhase}
              >
                <span style={{ fontSize: 15 }}>{phase.icon}</span>
                <span
                  style={{
                    fontWeight: isActivePhase ? 700 : 500,
                    fontSize: 13,
                    color: isActivePhase ? phase.color : COLORS.gray1,
                    flex: 1,
                    transition: "color 0.15s",
                  }}
                >
                  {phase.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: phaseStepsDone === phase.steps.length ? COLORS.green : COLORS.gray5,
                    fontWeight: 600,
                  }}
                >
                  {phaseStepsDone}/{phase.steps.length}
                </span>
              </button>

              {/* Step List */}
              <AnimatePresence initial={false}>
                {isActivePhase && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: "hidden" }}
                  >
                    {phase.steps.map((step) => {
                      const hasData =
                        Object.keys(formData[step.id] ?? {}).length > 0;
                      const isActive = activeStep === step.id;

                      return (
                        <button
                          key={step.id}
                          onClick={() => onStepChange(step.id)}
                          style={{
                            width: "100%",
                            padding: "7px 18px 7px 44px",
                            background: isActive
                              ? `${phase.color}12`
                              : "none",
                            border: "none",
                            borderLeft: isActive
                              ? `3px solid ${phase.color}`
                              : "3px solid transparent",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            textAlign: "left",
                            transition: "background 0.15s",
                          }}
                          aria-current={isActive ? "step" : undefined}
                        >
                          <span style={{ fontSize: 13 }}>{step.icon}</span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: 13,
                              fontWeight: isActive ? 600 : 400,
                              color: isActive ? phase.color : COLORS.gray1,
                              transition: "color 0.15s",
                            }}
                          >
                            {step.label}
                          </span>
                          {hasData && !isActive && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: COLORS.green,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: `1px solid ${COLORS.sep}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <AppleButton
          variant="secondary"
          style={{ width: "100%", fontSize: 13 }}
          onClick={() => exportJson(formData)}
        >
          💾 Export JSON
        </AppleButton>
        <AppleButton
          variant="secondary"
          style={{ width: "100%", fontSize: 13 }}
          onClick={() => exportSummary(formData, crypto.randomUUID())}
        >
          📄 Export Summary
        </AppleButton>
      </div>
    </aside>
  );
}
