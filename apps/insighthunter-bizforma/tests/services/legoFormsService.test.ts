import { describe, expect, it } from 'vitest';
import { validateFormSchema, createSubmission } from '../../services/legoFormsService';

describe('legoFormsService', () => {
  it('validates a basic schema', () => {
    expect(validateFormSchema({
      id: 'form_1',
      name: 'Vendor Intake',
      fields: [{ id: 'name', type: 'text', label: 'Name' }],
    })).toBe(true);
  });

  it('creates a submission', () => {
    const result = createSubmission('form_1', { name: 'Acme' });
    expect(result.formId).toBe('form_1');
    expect(result.values.name).toBe('Acme');
  });
});
