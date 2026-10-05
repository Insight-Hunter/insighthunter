// apps/insighthunter-pbx/src/backend/utils/events.ts
//
// Planning stub for internal domain-event publishing (e.g. to Durable Object agents or queues). Backs the eventual call-flow/queue/AI-receptionist event bus (docs/insight-pbx-master-prompt.md §4.3-§4.8).
// TODO(events): implement once a real caller needs it.
export function publishEvent(_type: string, _payload: unknown): void {
  throw new Error("not_implemented: utils/events.ts is a planning stub");
}
