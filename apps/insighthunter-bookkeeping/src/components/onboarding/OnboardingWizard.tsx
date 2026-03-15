// src/components/onboarding/OnboardingWizard.tsx
import { useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import CompanySetup from './CompanySetup';
import './OnboardingWizard.css';

type OnboardingStep = 'company' | 'plan' | 'bank' | 'complete';

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('company');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);

  const steps = [
    { id: 'company', title: 'Company Setup', description: 'Tell us about your business' },
    { id: 'plan', title: 'Choose Plan', description: 'Select your pricing tier' },
    { id: 'bank', title: 'Connect Bank', description: 'Link your accounts' },
    { id: 'complete', title: 'All Set!', description: 'Start using InsightHunter' },
  ];

  const handleStepComplete = (step: OnboardingStep) => {
    setCompletedSteps([...completedSteps, step]);
    
    const stepIndex = steps.findIndex((s) => s.id === step);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id as OnboardingStep);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-sidebar">
        <h1>Welcome to InsightHunter</h1>
        <p>Let's get your account set up in just a few minutes</p>

        <div className="steps-list">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`step-item ${
                currentStep === step.id ? 'active' : ''
              } ${completedSteps.includes(step.id as OnboardingStep) ? 'completed' : ''}`}
            >
              <div className="step-number">
                {completedSteps.includes(step.id as OnboardingStep) ? (
                  <FiCheck />
                ) : (
                  index + 1
                )}
              </div>
              <div className="step-content">
                <div className="step-title">{step.title}</div>
                <div className="step-description">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="onboarding-main">
        {currentStep === 'company' && (
          <CompanySetup onComplete={() => handleStepComplete('company')} />
        )}

        {currentStep === 'plan' && (
          <div className="onboarding-step">
            <h2>Choose Your Plan</h2>
            <p>Select the plan that best fits your business needs</p>
            <a href="/pricing" className="btn-primary">
              View Plans
            </a>
          </div>
        )}

        {currentStep === 'bank' && (
          <div className="onboarding-step">
            <h2>Connect Your Bank</h2>
            <p>Link your bank accounts to automatically sync transactions</p>
            <button
              onClick={() => handleStepComplete('bank')}
              className="btn-primary"
            >
              Connect Bank Account
            </button>
            <button
              onClick={() => handleStepComplete('bank')}
              className="btn-secondary"
            >
              Skip for Now
            </button>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="onboarding-step onboarding-complete">
            <div className="success-icon">✓</div>
            <h2>You're All Set!</h2>
            <p>Your account is ready. Let's start managing your books.</p>
            <a href="/dashboard" className="btn-primary">
              Go to Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
