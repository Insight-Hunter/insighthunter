export const EventTypes = {
  OrganizationCreated: 'organization.created',
  UserRegistered: 'user.registered',
  UserLoggedIn: 'user.logged_in',
  JournalCreated: 'journal.created',
  JournalPosted: 'journal.posted',
  JournalReversed: 'journal.reversed',
  InvoiceCreated: 'invoice.created',
  InvoicePaid: 'invoice.paid',
  PayrollProcessed: 'payroll.processed',
  ReportGenerated: 'report.generated',
  AiConversationStarted: 'ai.conversation.started',
  AiResponseGenerated: 'ai.response.generated',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
