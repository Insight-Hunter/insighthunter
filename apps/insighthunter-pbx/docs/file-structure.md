apps/
├── insighthunter-marketing/ # + dashboard shell entry
├── insighthunter-auth/   # Auth, registration, tenant
├── insighthunter-bizforma/
├── insighthunter-bookkeeping/
├── insighthunter-payroll/
├── insighthunter-reports/
├── insighthunter-insights/
├── insighthunter-pbx/
│   ├── src/
│   │   ├── backend/
│   │   │   ├── index.ts                  # Worker entry
│   │   │   ├── types.ts     # Env + shared backend
│   │   │   ├── routes/
│   │   │   │   ├── onboarding.ts
│   │   │   │   ├── numbers.ts
│   │   │   │   ├── departments.ts
│   │   │   │   ├── employees.ts
│   │   │   │   ├── callFlows.ts
│   │   │   │   ├── queues.ts
│   │   │   │   ├── voicemail.ts
│   │   │   │   ├── conversations.ts
│   │   │   │   ├── messages.ts
│   │   │   │   ├── automations.ts
│   │   │   │   ├── aiReceptionist.ts
│   │   │   │   ├── reports.ts
│   │   │   │   ├── billing.ts
│   │   │   │   ├── addons.ts
│   │   │   │   ├── webhooks.twilio.ts
│   │   │   │   └── health.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── tenant.ts
│   │   │   │   ├── roles.ts
│   │   │   │   ├── idempotency.ts
│   │   │   │   └── logger.ts
│   │   │   ├── services/
│   │   │   │   ├── pbxAccountService.ts
│   │   │   │   ├── numberProvisioningService.ts
│   │   │   │   ├── callRoutingService.ts
│   │   │   │   ├── queueService.ts
│   │   │   │   ├── voicemailService.ts
│   │   │   │   ├── conversationService.ts
│   │   │   │   ├── messagingService.ts
│   │   │   │   ├── automationService.ts
│   │   │   │   ├── aiReceptionistService.ts
│   │   │   │   ├── ratingService.ts
│   │   │   │   ├── vendorUsageService.ts
│   │   │   │   ├── reconciliationService.ts
│   │   │   │   └── addonOrderService.ts
│   │   │   ├── providers/
│   │   │   │   ├── interfaces/
│   │   │   │   │   ├── TelephonyProvider.ts
│   │   │   │   │   ├── MessagingProvider.ts
│   │   │   │   │   ├── VideoProvider.ts
│   │   │   │   │   ├── TranscriptionProvider.ts
│   │   │   │   │   └── PhysicalServiceProvider.ts
│   │   │   │   ├── twilio/
│   │   │   │   │   ├── TwilioTelephonyProvider.ts
│   │   │   │   │   ├── TwilioMessagingProvider.ts
│   │   │   │   │   ├── TwilioWebhookVerifier.ts
│   │   │   │   │   └── twiml.ts
│   │   │   │   ├── daily/
│   │   │   │   │   └── DailyVideoProvider.ts
│   │   │   │   └── partner/
│   │   │   │       └── ManualOpsMailboxProvider.ts
│   │   │   ├── agents/
│   │   │   │   ├── CallSessionAgent.ts
│   │   │   │   ├── QueueAgent.ts
│   │   │   │   ├── ConversationAssignmentAgent.ts
│   │   │   │   └── AIReceptionistSessionAgent.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.sql
│   │   │   │   └── migrations/
│   │   │   │       ├── 0001_core_accounts.sql
│   │   │   │       ├── 0002_numbers_extensions.sql
│   │   │   │       ├── 0003_callflows_queues.sql
│   │   │   │       ├── 0004_calls_voicemail.sql
│   │   │   │       ├── 0005_conversations_messages.sql
│   │   │   │       ├── 0006_automations_ai.sql
│   │   │   │       ├── 0007_billing_usage.sql
│   │   │   │       ├── 0008_addons_audit.sql
│   │   │   │       └── 0009_indexes_views.sql
│   │   │   └── utils/
│   │   │       ├── phone.ts
│   │   │       ├── time.ts
│   │   │       ├── retention.ts
│   │   │       ├── currency.ts
│   │   │       ├── events.ts
│   │   │       └── validation.ts
│   │   └── frontend/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── index.html
│   │       ├── pages/
│   │       │   ├── Home.tsx
│   │       │   ├── Inbox.tsx
│   │       │   ├── Calls.tsx
│   │       │   ├── Numbers.tsx
│   │       │   ├── CallFlows.tsx
│   │       │   ├── Queues.tsx
│   │       │   ├── Voicemail.tsx
│   │       │   ├── Automations.tsx
│   │       │   ├── AIReceptionist.tsx
│   │       │   ├── Team.tsx
│   │       │   ├── Reports.tsx
│   │       │   ├── Billing.tsx
│   │       │   ├── Addons.tsx
│   │       │   └── Settings.tsx
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   ├── inbox/
│   │       │   ├── calls/
│   │       │   ├── flows/
│   │       │   ├── ai/
│   │       │   ├── billing/
│   │       │   └── shared/
│   │       ├── hooks/
│   │       └── styles/
│   ├── tests/
│   ├── wrangler.toml
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
├── packages/
│   ├── shared-types/   # tenant, auth, billing, event
│   ├── ui/    # shared UI components if needed
│   ├── config/  # eslint, tsconfig, shared build config
│   ├── event-contracts/   # internal event schemas
│   └── pricing-catalog/   # reusable plan/add-on
└── tooling/
    ├── scripts/
    └── docs/
