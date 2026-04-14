export type TaxChecklistItem = {
  id: string;
  scope: "federal" | "state";
  category: string;
  title: string;
  description: string;
};

export const taxAccountChecklist: TaxChecklistItem[] = [
  {
    id: "ein",
    scope: "federal",
    category: "registration",
    title: "Apply for EIN",
    description: "Obtain a federal employer identification number before payroll, banking, or tax account setup.",
  },
  {
    id: "eftps",
    scope: "federal",
    category: "payments",
    title: "Enroll in EFTPS",
    description: "Set up the Electronic Federal Tax Payment System for business tax remittances.",
  },
  {
    id: "withholding",
    scope: "state",
    category: "payroll",
    title: "Register state withholding account",
    description: "Open the state payroll withholding account before hiring employees.",
  },
  {
    id: "suta",
    scope: "state",
    category: "payroll",
    title: "Register unemployment tax account",
    description: "Open state unemployment insurance registration for payroll compliance.",
  },
  {
    id: "sales-tax",
    scope: "state",
    category: "indirect-tax",
    title: "Register sales and use tax account if applicable",
    description: "Required when the business sells taxable goods or services in the state.",
  },
];
