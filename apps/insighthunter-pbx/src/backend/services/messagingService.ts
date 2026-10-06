// apps/insighthunter-pbx/src/backend/services/messagingService.ts
//
// Planning stub for outbound message send orchestration across MessagingProvider implementations (docs/insight-pbx-master-prompt.md §4.6).
// routes/messages.ts currently talks to TwilioMessagingProvider directly; this stub is the extraction target once multiple providers/channels exist.
// TODO(messagingService): implement once the dependent route(s) are built.
export class MessagingService {
  constructor(private readonly db: D1Database) {}
}
