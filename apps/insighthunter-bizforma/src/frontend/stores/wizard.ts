import { atom } from 'nanostores';

export const currentStep = atom(1);

export const formData = atom({
  concept: {},
  naming: {},
  entity: {},
  registration: {},
  tax: {},
  compliance: {},
});

export function nextStep() {
  currentStep.set(currentStep.get() + 1);
}

export function prevStep() {
  currentStep.set(currentStep.get() - 1);
}

export function updateFormData(step, data) {
  const currentData = formData.get();
  formData.set({ ...currentData, [step]: data });
}
