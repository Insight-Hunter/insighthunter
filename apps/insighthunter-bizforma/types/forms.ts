export type LegoFormField = {
  id: string;
  type: string;
  label: string;
  required?: boolean;
};

export type LegoForm = {
  id: string;
  name: string;
  fields: LegoFormField[];
};

export type FormSubmission = {
  id: string;
  formId: string;
  values: Record<string, unknown>;
  submittedAt: string;
};
