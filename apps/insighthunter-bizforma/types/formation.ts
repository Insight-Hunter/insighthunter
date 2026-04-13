export interface IntakeAnswers { concept: string; businessName: string; entityType: string; stateCode: string; owners: string; payrollIntent: string; fundingPlan: string; marketingPlan: string; websiteNeeds: string; }
export interface FormationCase { id: string; businessId: string; status: string; intake: IntakeAnswers; }
