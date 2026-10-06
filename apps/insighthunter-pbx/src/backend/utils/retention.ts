// apps/insighthunter-pbx/src/backend/utils/retention.ts
//
// Planning stub for data-retention/purge scheduling. Backs recording/voicemail/transcript retention policy (docs/insight-pbx-master-prompt.md §7 compliance).
// TODO(retention): implement once a real caller needs it.
export function retentionExpiryDate(_createdAt: Date, _retentionDays: number): Date {
  throw new Error("not_implemented: utils/retention.ts is a planning stub");
}
