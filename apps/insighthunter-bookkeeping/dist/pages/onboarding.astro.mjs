import { c as createComponent, r as renderComponent, b as renderTemplate } from '../chunks/astro/server_DPCtPSmh.mjs';
import 'piccolore';
import 'html-escaper';
import { $ as $$AppLayout } from '../chunks/AppLayout_0Czg83ng.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
import { c as FiCheck } from '../chunks/index_IorU0Hm2.mjs';
/* empty css                                      */
export { renderers } from '../renderers.mjs';

const CompanySetup = ({ onComplete }) => {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("h2", { children: "Company Setup" }),
    /* @__PURE__ */ jsx("p", { children: "This is a placeholder for the company setup form." }),
    /* @__PURE__ */ jsx("button", { onClick: onComplete, children: "Complete" })
  ] });
};

function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState("company");
  const [completedSteps, setCompletedSteps] = useState([]);
  const steps = [
    { id: "company", title: "Company Setup", description: "Tell us about your business" },
    { id: "plan", title: "Choose Plan", description: "Select your pricing tier" },
    { id: "bank", title: "Connect Bank", description: "Link your accounts" },
    { id: "complete", title: "All Set!", description: "Start using InsightHunter" }
  ];
  const handleStepComplete = (step) => {
    setCompletedSteps([...completedSteps, step]);
    const stepIndex = steps.findIndex((s) => s.id === step);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "onboarding-container", children: [
    /* @__PURE__ */ jsxs("div", { className: "onboarding-sidebar", children: [
      /* @__PURE__ */ jsx("h1", { children: "Welcome to InsightHunter" }),
      /* @__PURE__ */ jsx("p", { children: "Let's get your account set up in just a few minutes" }),
      /* @__PURE__ */ jsx("div", { className: "steps-list", children: steps.map((step, index) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: `step-item ${currentStep === step.id ? "active" : ""} ${completedSteps.includes(step.id) ? "completed" : ""}`,
          children: [
            /* @__PURE__ */ jsx("div", { className: "step-number", children: completedSteps.includes(step.id) ? /* @__PURE__ */ jsx(FiCheck, {}) : index + 1 }),
            /* @__PURE__ */ jsxs("div", { className: "step-content", children: [
              /* @__PURE__ */ jsx("div", { className: "step-title", children: step.title }),
              /* @__PURE__ */ jsx("div", { className: "step-description", children: step.description })
            ] })
          ]
        },
        step.id
      )) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "onboarding-main", children: [
      currentStep === "company" && /* @__PURE__ */ jsx(CompanySetup, { onComplete: () => handleStepComplete("company") }),
      currentStep === "plan" && /* @__PURE__ */ jsxs("div", { className: "onboarding-step", children: [
        /* @__PURE__ */ jsx("h2", { children: "Choose Your Plan" }),
        /* @__PURE__ */ jsx("p", { children: "Select the plan that best fits your business needs" }),
        /* @__PURE__ */ jsx("a", { href: "/pricing", className: "btn-primary", children: "View Plans" })
      ] }),
      currentStep === "bank" && /* @__PURE__ */ jsxs("div", { className: "onboarding-step", children: [
        /* @__PURE__ */ jsx("h2", { children: "Connect Your Bank" }),
        /* @__PURE__ */ jsx("p", { children: "Link your bank accounts to automatically sync transactions" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleStepComplete("bank"),
            className: "btn-primary",
            children: "Connect Bank Account"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => handleStepComplete("bank"),
            className: "btn-secondary",
            children: "Skip for Now"
          }
        )
      ] }),
      currentStep === "complete" && /* @__PURE__ */ jsxs("div", { className: "onboarding-step onboarding-complete", children: [
        /* @__PURE__ */ jsx("div", { className: "success-icon", children: "✓" }),
        /* @__PURE__ */ jsx("h2", { children: "You're All Set!" }),
        /* @__PURE__ */ jsx("p", { children: "Your account is ready. Let's start managing your books." }),
        /* @__PURE__ */ jsx("a", { href: "/dashboard", className: "btn-primary", children: "Go to Dashboard" })
      ] })
    ] })
  ] });
}

const $$Onboarding = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AppLayout", $$AppLayout, { "title": "Welcome to InsightHunter" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "OnboardingWizard", OnboardingWizard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/onboarding/OnboardingWizard", "client:component-export": "default" })} ` })}`;
}, "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/onboarding.astro", void 0);

const $$file = "/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/onboarding.astro";
const $$url = "/onboarding";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Onboarding,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
