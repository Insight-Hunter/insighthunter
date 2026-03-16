export enum FieldType {
    TEXT      = 'TEXT',
    TEXTAREA  = 'TEXTAREA',
    NUMBER    = 'NUMBER',
    DATE      = 'DATE',
    EMAIL     = 'EMAIL',
    PHONE     = 'PHONE',
    SELECT    = 'SELECT',
    MULTISELECT = 'MULTISELECT',
    CHECKBOX  = 'CHECKBOX',
    RADIO     = 'RADIO',
    FILE      = 'FILE',
    SIGNATURE = 'SIGNATURE',
    HEADING   = 'HEADING',
    DIVIDER   = 'DIVIDER',
  }
  
  export interface FormField {
    id:           string;
    type:         FieldType;
    label:        string;
    placeholder:  string | null;
    required:     boolean;
    options:      string[] | null;       // for SELECT / RADIO / MULTISELECT
    validation:   FieldValidation | null;
    helpText:     string | null;
    order:        number;
    width:        'full' | 'half';
    defaultValue: string | null;
  }
  
  export interface FieldValidation {
    minLength?:  number;
    maxLength?:  number;
    min?:        number;
    max?:        number;
    pattern?:    string;
    message?:    string;
  }
  
  export interface FormTemplate {
    id:          string;
    orgId:       string | null;          // null = system template
    name:        string;
    description: string | null;
    category:    string;
    fields:      FormField[];
    isSystem:    boolean;
    isPublished: boolean;
    submissionCount: number;
    createdBy:   string;
    createdAt:   string;
    updatedAt:   string;
  }
  
  export interface FormSubmission {
    id:         string;
    orgId:      string;
    templateId: string;
    businessId: string | null;
           Record<string, unknown>;
    submittedBy: string;
    ipAddress:  string | null;
    createdAt:  string;
  }
  