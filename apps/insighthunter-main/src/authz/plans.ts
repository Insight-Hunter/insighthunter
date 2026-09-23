export const FEATURE_KEYS = {
  APP_BIZFORMA: "app.bizforma",
  DASHBOARD_ADVANCED: "dashboard.advanced",
  DOCUMENTS_VAULT: "documents.vault",
  AI_ADVISOR: "ai.advisor",
  PAYROLL_WORKSPACE: "payroll.workspace",
  COMPLIANCE_CALENDAR: "compliance.calendar",
  FORMS_LEGO: "forms.lego",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export const PLAN_FEATURES: Record<string, FeatureKey[]> = {
  starter: [
    FEATURE_KEYS.APP_BIZFORMA,
    FEATURE_KEYS.DOCUMENTS_VAULT,
    FEATURE_KEYS.COMPLIANCE_CALENDAR,
  ],
  growth: [
    FEATURE_KEYS.APP_BIZFORMA,
    FEATURE_KEYS.DOCUMENTS_VAULT,
    FEATURE_KEYS.COMPLIANCE_CALENDAR,
    FEATURE_KEYS.AI_ADVISOR,
    FEATURE_KEYS.FORMS_LEGO,
    FEATURE_KEYS.DASHBOARD_ADVANCED,
  ],
  pro: [
    FEATURE_KEYS.APP_BIZFORMA,
    FEATURE_KEYS.DOCUMENTS_VAULT,
    FEATURE_KEYS.COMPLIANCE_CALENDAR,
    FEATURE_KEYS.AI_ADVISOR,
    FEATURE_KEYS.FORMS_LEGO,
    FEATURE_KEYS.DASHBOARD_ADVANCED,
    FEATURE_KEYS.PAYROLL_WORKSPACE,
  ],
};

export function getPlanFeatures(planCode: string): FeatureKey[] {
  return PLAN_FEATURES[planCode] ?? [];
}
