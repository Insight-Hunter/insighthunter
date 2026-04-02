insight-hunter-pbx/
├── src/
│   ├── index.ts                         ← Worker entry + queue consumer
│   ├── types.ts                         ← All interfaces & Env
│   ├── routes/
│   │   ├── calls.ts                     ← Telnyx webhook + outbound
│   │   ├── extensions.ts                ← Extension CRUD
│   │   ├── voicemail.ts                 ← VM list/stream/delete
│   │   ├── cdr.ts                       ← Call history + stats
│   │   ├── ivr.ts                       ← IVR menu management
│   │   └── config.ts                    ← Business hours, ring groups
│   ├── durable-objects/
│   │   ├── CallSession.ts               ← Per-call WebSocket state
│   │   └── PBXCoordinator.ts            ← Org-level live dashboard
│   ├── services/
│   │   ├── telnyxService.ts             ← All Telnyx API calls
│   │   ├── ivrService.ts                ← Call flow & routing logic
│   │   ├── voicemailService.ts          ← R2 storage + AI transcription
│   │   └── analyticsService.ts          ← Analytics Engine helpers
│   ├── middleware/
│   │   ├── auth.ts                      ← JWT via auth worker
│   │   └── logger.ts                    ← Request logger
│   └── db/
│       └── schema.sql                   ← D1 table definitions
├── wrangler.jsonc
├── package.json
├── tsconfig.json
└── README.md
