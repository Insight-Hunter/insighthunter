// src/App.tsx
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PHASES, ALL_STEPS, COLORS } from "./constants";
import { FormProvider, useForm } from "./context/FormContext";
import { Sidebar } from "./components/Sidebar";
import { TaxDeadlinesPanel } from "./components/TaxDeadlines";
import { AppleButton } from "./components/ui";
import {
  IdeaStep, MarketStep, BusinessModelStep, NameStep, StructureStep,
  StateRegStep, EINStep, LicensesStep, RegisteredAgentStep, OperatingStep,
  BankStep, AccountingStep, FedTaxStep, StateTaxStep, PayrollStep, FundingStep,
  DomainStep, WebsiteStep, SEOStep, SocialStep, BrandingStep, MarketingStep,
  LaunchChecklistStep,
} from "./components/steps";
import type { StepData } from "./types";

// ─── Step Component Registry ──────────────────────────────────────────────────
const STEP_COMPONENTS: Record<string, React.ComponentType<{ data: StepData; onChange: (d: StepData) => void }>> = {
  idea:             IdeaStep,
  market:           MarketStep,
  model:            BusinessModelStep,
  name:             NameStep,
  structure:        StructureStep,
  state_reg:        StateRegStep,
  ein:              EINStep,
  licenses:         LicensesStep,
  registered_agent: RegisteredAgentStep,
  operating:        OperatingStep,
  bank:             BankStep,
  accounting:       AccountingStep,
  fed_tax:          FedTaxStep,
  state_tax:        StateTaxStep,
  payroll:          PayrollStep,
  funding:          FundingStep,
  domain:           DomainStep,
  website:          WebsiteStep,
  seo:              SEOStep,
  social:           SocialStep,
  branding:         BrandingStep,
  marketing:        MarketingStep,
  launch_plan:      LaunchChecklistStep,
};

// ─── Tab Types ────────────────────────────────────────────────────────────────
type Tab = "steps" | "deadlines";

// ─── Inner App (needs FormContext) ────────────────────────────────────────────
function AppInner() {
  const [activePhase, setActivePhase] = useState<string>(PHASES[0].id);
  const [activeStep, setActiveStep]   = useState<string>(ALL_STEPS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab]     = useState<Tab>("steps");

  const { getStepData, setStepData } = useForm();

  const currIdx    = ALL_STEPS.findIndex((s) => s.id === activeStep);
  const currPhase  = PHASES.find((p) => p.id === activePhase);
  const currStep   = ALL_STEPS[currIdx];

  const goToStep = useCallback((stepId: string) => {
    setActiveStep(stepId);
    const phase = PHASES.find((p) => p.steps.some((s) => s.id === stepId));
    if (phase) setActivePhase(phase.id);
  }, []);

  const goNext = () => {
    if (currIdx < ALL_STEPS.length - 1) goToStep(ALL_STEPS[currIdx + 1].id);
  };
  const goPrev = () => {
    if (currIdx > 0) goToStep(ALL_STEPS[currIdx - 1].id);
  };

  const StepComponent = STEP_COMPONENTS[activeStep];
  const stepData = getStepData(activeStep);

  // Dot-nav window around current step
  const dotStart = Math.max(0, currIdx - 2);
  const dotEnd   = Math.min(ALL_STEPS.length, currIdx + 3);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
        backgroundColor: COLORS.bg,
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <Sidebar
              activePhase={activePhase}
              activeStep={activeStep}
              onPhaseChange={setActivePhase}
              onStepChange={goToStep}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Top Bar */}
        <div
          style={{
            height: 52,
            borderBottom: `1px solid ${COLORS.sep}`,
            backgroundColor: COLORS.surface,
            display: "flex",
            alignItems: "center",
            padding: "0 20px",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle sidebar"
            style={{
              width: 32,
              height: 32,
              border: "none",
              background: COLORS.fill,
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ☰
          </button>

          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 2, backgroundColor: COLORS.fill, borderRadius: 8, padding: 2 }}>
            {(["steps", "deadlines"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "5px 14px",
                  fontSize: 13,
                  fontWeight: activeTab === tab ? 600 : 400,
                  border: "none",
                  borderRadius: 6,
                  backgroundColor: activeTab === tab ? COLORS.surface : "transparent",
                  color: activeTab === tab ? COLORS.gray1 : COLORS.gray5,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                }}
              >
                {tab === "steps" ? "📋 Steps" : "📅 Tax Deadlines"}
              </button>
            ))}
          </div>

          {/* Breadcrumb */}
          {activeTab === "steps" && (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 13, color: COLORS.gray5, flexShrink: 0 }}>
                {currPhase?.label}
              </span>
              <span style={{ color: COLORS.sep, flexShrink: 0 }}>›</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: COLORS.gray1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {currStep?.label}
              </span>
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              color: COLORS.gray5,
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {activeTab === "steps" ? `Step ${currIdx + 1} / ${ALL_STEPS.length}` : ""}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <AnimatePresence mode="wait">
            {activeTab === "deadlines" ? (
              <motion.div
                key="deadlines"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
                style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 60px" }}
              >
                <TaxDeadlinesPanel />
              </motion.div>
            ) : (
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.18 }}
                style={{ maxWidth: 720, margin: "0 auto", padding: "0 24px 60px" }}
              >
                {StepComponent ? (
                  <StepComponent data={stepData} onChange={(d) => setStepData(activeStep, d)} />
                ) : (
                  <div style={{ padding: 40, color: COLORS.gray5 }}>
                    Step not found
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        {activeTab === "steps" && (
          <div
            style={{
              borderTop: `1px solid ${COLORS.sep}`,
              backgroundColor: COLORS.surface,
              padding: "10px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <AppleButton variant="secondary" onClick={goPrev} disabled={currIdx === 0}>
              ← Back
            </AppleButton>

            {/* Dot indicators */}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {ALL_STEPS.slice(dotStart, dotEnd).map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => goToStep(s.id)}
                  style={{
                    width: s.id === activeStep ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: s.id === activeStep ? COLORS.blue : COLORS.sep,
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                  }}
                />
              ))}
            </div>

            <AppleButton
              variant="primary"
              onClick={goNext}
              disabled={currIdx === ALL_STEPS.length - 1}
            >
              {currIdx === ALL_STEPS.length - 1 ? "🎉 Done!" : "Next →"}
            </AppleButton>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <FormProvider>
      <AppInner />
    </FormProvider>
  );
}
