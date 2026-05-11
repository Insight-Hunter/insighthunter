export interface FormTemplate {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  schema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FormSubmission {
  id: string;
  tenantId: string;
  templateId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
