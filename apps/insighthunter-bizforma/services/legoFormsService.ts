import type { FormSubmission, LegoForm } from '../types/forms';

export function validateFormSchema(form: LegoForm) {
  if (!form.id || !form.name) throw new Error('Form id and name are required');
  if (!Array.isArray(form.fields) || form.fields.length === 0) throw new Error('Form must include fields');
  return true;
}

export function createSubmission(formId: string, values: Record<string, unknown>): FormSubmission {
  return {
    id: crypto.randomUUID(),
    formId,
    values,
    submittedAt: new Date().toISOString(),
  };
}
