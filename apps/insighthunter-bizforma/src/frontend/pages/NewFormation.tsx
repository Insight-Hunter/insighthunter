import React from 'react';
import { useStore } from '@nanostores/react';
import { currentStep, nextStep, prevStep } from '../stores/wizard';
import { ConceptStep } from '../components/steps/ConceptStep';
// Import other steps here as they are created

const STEPS = [
  { id: 1, title: 'Business Concept', component: ConceptStep },
  // { id: 2, title: 'Naming', component: NamingStep },
  // { id: 3, title: 'Entity', component: EntityStep },
];

export const NewFormation: React.FC = () => {
  const step = useStore(currentStep);
  const CurrentStepComponent = STEPS.find(s => s.id === step)?.component;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Start Your Business</h1>
      <p className="text-gray-500 mb-8">Our wizard will guide you through the process step by step.</p>

      {/* Progress Bar */}
      <div className="mb-8">
        {/* Add progress bar component here later */}
      </div>

      {CurrentStepComponent && <CurrentStepComponent />}

      <div className="flex justify-between mt-8">
        {step > 1 ? (
          <button onClick={prevStep} className="px-6 py-2 border rounded-md">
            Back
          </button>
        ) : <div />} 

        {step < STEPS.length ? (
          <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white rounded-md">
            Next
          </button>
        ) : (
          <button className="px-6 py-2 bg-green-600 text-white rounded-md">
            Finish
          </button>
        )}
      </div>
    </div>
  );
};