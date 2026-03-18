
apps/insighthunter-pbx/                       ← Dedicated PBX Worker + React SPA
│
├── wrangler.jsonc                            ← Worker config (D1, R2, KV, DO, AI, Queues)
├── package.json                              ← scripts: dev, deploy, tail, types
├── tsconfig.json
├── vite.config.ts                            ← builds frontend → dist/
├── .dev.vars                                 ← TWILIO_*, JWT_SECRET (gitignored)
│
├── db/
│   ├── schema.sql                              ← all PBX tables
│   └── migrations/
│       ├── 0001_phone_numbers.sql              ← virtual numbers, routing config
│       ├── 0002_calls.sql                      ← call log, status, duration, direction
│       ├── 0003_voicemails.sql                 ← voicemail metadata + R2 key
│       ├── 0004_sms_messages.sql               ← SMS threads + message history
│       └── 0005_routing_rules.sql              ← forward, IVR, schedule-based routing
│
└── src/
    │
    ├── backend/                     ← Cloudflare Worker (Hono)
    │   ├── index.ts                 ← Worker entry + DO exports
    │   ├── types.ts                 ← Env, all shared interfaces
    │   │
    │   ├── routes/
    │   │   ├── numbers.ts           ← GET/POST/DELETE /pbx/numbers
    │   │   ├── calls.ts             ← GET /pbx/calls, POST /pbx/calls/dial
    │   │   ├── voicemails.ts        ← GET /pbx/voicemails, GET /:id/audio (R2 stream)
    │   │   ├── sms.ts               ← GET /pbx/sms, POST /pbx/sms/send
    │   │   ├── routing.ts           ← GET/PUT /pbx/numbers/:id/routing
    │   │   ├── websocket.ts         ← GET /pbx/ws → upgrades to DO WebSocket
    │   │   └── webhooks.ts          ← POST /pbx/webhooks/twilio (inbound calls/SMS)
    │   │
    │   ├── agents/
    │   │   ├── PBXRoom.ts           ← DO: WebSocket hub per phone number
    │   │   │                          real-time call events → connected clients
    │   │   └── CallSession.ts       ← DO: stateful per-call session tracker
    │   │                              (ringing → answered → completed)
    │   │
    │   ├── services/
    │   │   ├── twilioService.ts               ← Twilio REST API wrapper (numbers, calls, SMS)
    │   │   ├── callService.ts                 ← call log CRUD + status machine
    │   │   ├── smsService.ts                  ← SMS thread grouping + delivery status
    │   │   ├── voicemailService.ts            ← R2 upload, presigned URL, metadata
    │   │   ├── transcriptionService.ts        ← Workers AI Whisper transcription
    │   │   ├── routingService.ts              ← eval routing rules (schedule, IVR, forward)
    │   │   └── notificationService.ts         ← push missed call / new voicemail alerts via Queue
    │   │
    │   ├── middleware/
    │   │   ├── auth.ts                             ← KV session cookie guard
    │   │   ├── twilioSignature.ts                  ← validate X-Twilio-Signature on webhooks
    │   │   └── logger.ts                           ← structured request logging
    │   │
    │   └── utils/
    │       ├── twiml.ts                            ← TwiML response builder helpers
    │       ├── phoneNumber.ts                      ← E.164 formatting, parsing, validation
    │       └── analytics.ts                        ← Analytics Engine write helpers
    │
    └── frontend/                                   ← React SPA (Vite)
        ├── main.tsx                                ← ReactDOM.createRoot entry
        ├── App.tsx                                 ← BrowserRouter + routes
        ├── index.html
        │
        ├── pages/
        │   ├── Dashboard.tsx                       ← /  → call summary KPIs
        │   ├── Calls.tsx                           ← /calls → call log + softphone dialpad
        │   ├── Voicemails.tsx                      ← /voicemails → list + inline audio player
        │   ├── SMS.tsx                             ← /sms → thread list + conversation view
        │   ├── Numbers.tsx                         ← /numbers → manage virtual phone numbers
        │   └── Settings.tsx                        ← /settings → routing rules, hours, IVR
        │
        ├── components/
        │   ├── layout/
        │   │   ├── Shell.tsx                             ← sidebar nav + topbar
        │   │   └── MobileNav.tsx
        │   │
        │   ├── phone/
        │   │   ├── Dialpad.tsx              ← click-to-dial softphone UI
        │   │   ├── ActiveCall.tsx           ← real-time call timer + mute/hang-up
        │   │   ├── CallCard.tsx             ← single call log row (inbound/outbound/missed)
        │   │   ├── CallBadge.tsx            ← direction/status badge
        │   │   └── IncomingCallToast.tsx    ← WebSocket-triggered incoming call popup
        │   │
        │   ├── voicemail/
        │   │   ├── VoicemailCard.tsx               ← playback, transcript toggle, delete
        │   │   └── AudioPlayer.tsx                 ← custom HTML5 audio player
        │   │
        │   ├── sms/
        │   │   ├── ThreadList.tsx                        ← list of SMS contacts/threads
        │   │   ├── MessageBubble.tsx                     ← inbound/outbound chat bubble
        │   │   ├── ConversationView.tsx                  ← full thread with compose box
        │   │   └── NewSMSModal.tsx                       ← compose to new number
        │   │
        │   ├── routing/
        │   │   ├── RoutingRuleEditor.tsx          ← add/edit forward/IVR/voicemail rules
        │   │   ├── BusinessHoursPicker.tsx        ← schedule-based routing config
        │   │   └── IVRBuilder.tsx                 ← simple key-press menu builder
        │   │
        │   └── shared/
        │       ├── StatusBadge.tsx
        │       ├── EmptyState.tsx
        │       ├── ConfirmModal.tsx
        │       └── Spinner.tsx
        │
        ├── hooks/
        │   ├── usePBXSocket.ts                ← WebSocket connection to PBXRoom DO
        │   ├── useCalls.ts                    ← fetch + real-time call log
        │   ├── useVoicemails.ts               ← voicemail list + playback URL
        │   ├── useSMS.ts                      ← SMS threads + send
        │   ├── useNumbers.ts                  ← virtual number management
        │   └── useCallSession.ts              ← active call state (ringing/answered/ended)
        │
        ├── lib/
        │   ├── api.ts          ← typed fetch client → insighthunter-pbx Worker
        │   ├── twiml.ts        ← client-side TwiML helpers (if WebRTC)
        │   └── utils.ts        ← formatDuration, formatPhone, relativeTime
        │
        └── styles/
            ├── globals.scss
            └── theme.scss      ← inherits sand/taupe tokens from insighthunter-main
