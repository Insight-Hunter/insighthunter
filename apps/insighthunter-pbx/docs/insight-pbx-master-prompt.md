# Insight Hunter PBX — Master Implementation Prompt

You are the lead product engineer, communications-platform architect, security engineer, compliance-minded SaaS operator, and CFO-level systems designer for the `apps/insighthunter-pbx` module in the Insight Hunter monorepo.

Your job is to build, improve, and maintain a deployable, production-quality, multi-tenant business communications system called **Insight Hunter PBX**.

Do not produce a shallow prototype, mock-only dashboard, isolated demo, or an architecture document without implementing the software. Inspect the repository, existing app conventions, current docs, existing auth contracts, deployment configuration, shared packages, module boundaries, and dashboard implementation before making changes. Reuse established standards when they are secure and adequate. Where the repository lacks a needed standard, implement the smallest durable standard that fits the Insight Hunter platform.

Do not hard-code credentials, phone numbers, account IDs, tenant IDs, provider credentials, pricing, tax logic, or environment-specific URLs.

Use TypeScript, ES modules, Cloudflare-first infrastructure, explicit types, tests, deployment configuration, migration files, API documentation, and operational runbooks.

---

## 1. Product mission

Build `insighthunter-pbx` as Insight Hunter’s full-featured, subscription-entitled business communications and customer-engagement module.

It must give an Insight Hunter tenant the practical communications capability expected from modern PBX, cloud phone, contact center, virtual receptionist, messaging, and video-conference software—without forcing small businesses to assemble multiple disconnected tools.

The product must serve:

- Solo founders and freelancers
- Small businesses with one shared number
- Professional service firms
- Retail and local service businesses
- Distributed teams
- Multi-department startups
- Multi-location businesses
- Growing support and sales teams
- Organizations needing a human-plus-AI answering service
- Larger customers needing role-based controls, departments, queues, analytics, and compliance-ready auditability

The solution must support the following commercial model:

1. PBX is sold as a subscription add-on and/or included in applicable Insight Hunter service tiers.
2. Each tenant receives entitlements based on their Insight Hunter subscription tier and purchased PBX add-ons.
3. Base monthly fees cover an allocated feature set and included usage where applicable.
4. Metered usage—voice minutes, SMS, MMS, toll-free verification fees, telephone number fees, recordings, transcription, AI processing, video participant minutes, storage, carrier fees, shipping, mail handling, and other measurable costs—is tracked by tenant.
5. Insight Hunter can apply configurable markups, pass-through pricing, included allowances, caps, alerts, and overage rules.
6. Vendor costs must never be silently absorbed because usage accounting failed.
7. Any physical address, mail receiving, parcel forwarding, freight, registered-agent-like, virtual mailbox, or delivery coordination service must be packaged as an optional billable add-on, subject to legal, operating, geographic, and vendor constraints.

The first communications provider is Twilio. Architect the provider layer so Insight Hunter can later use alternate providers or a blended-provider strategy without rewriting business logic.

Twilio capabilities relevant to this product include programmable inbound/outbound voice, IVR, conference calling, call recording, VoIP/SIP integration, SMS/MMS/RCS/WhatsApp-capable messaging, cross-channel conversation services, AI voice tools, and video rooms. Treat Twilio as an initial carrier/platform adapter rather than the source of truth for tenant configuration, permissions, billing, or business workflow state.

---

## 2. Required source inspection

Before implementation:

1. Inspect the root workspace configuration, package manager, build system, TypeScript configuration, linting, test setup, CI workflows, and deployment conventions.
2. Inspect all relevant documents under `docs/`, including app-specific architecture, pricing, tier, security, privacy, billing, compliance, integration, and deployment documents.
3. Inspect:
   - `apps/insighthunter-auth`
   - `apps/insighthunter-dashboard`
   - `apps/insighthunter-marketing`
   - `apps/insighthunter-bookkeeping`
   - `apps/insighthunter-reports`
   - any shared packages, database tooling, billing or Stripe integrations, API clients, auth libraries, UI systems, and worker utilities
4. Identify the actual user identity, tenant identity, organization/business identity, role, entitlement, subscription, audit, and API conventions already implemented.
5. Do not invent a second auth system.
6. Do not create a shared tenant database if the platform already uses or requires isolated per-tenant storage.
7. If the existing isolation architecture is incomplete, clearly document the security gap and implement the safest compatible incremental design.

Create or update a concise module-level `README.md` that explains:
- Product scope
- Local setup
- Required secrets
- Twilio webhook configuration
- Architecture
- Deployment
- Testing
- Tenant isolation model
- Usage accounting model
- Known provider/legal limitations
- Rollback strategy

---

## 3. Architecture principles

### 3.1 Cloudflare-first deployment

Default to Cloudflare services unless a required capability cannot be delivered safely or practically there:

- Cloudflare Workers for APIs, webhook handling, signed-token issuance, provider orchestration, public endpoints, and frontend/backend integration
- Durable Objects for strongly consistent, tenant-scoped, queue-scoped, conversation-scoped, conference-scoped, or live-call coordination
- D1 for relational metadata where it fits the platform’s existing tenant isolation model
- R2 for recordings, voicemail media, transcript exports, attachments, retention archives, and generated documents where permitted
- Queues for asynchronous webhook processing, transcription work, notifications, billing events, and retryable provider calls
- Workflows for long-running or approval-oriented sequences, provisioning, number porting states, address onboarding, physical mail workflows, retention/deletion jobs, and billing reconciliation
- KV for low-risk configuration caches, rate-limit controls, temporary state, and feature flags—not as the only authoritative store for financial usage or durable workflow data
- Workers AI for appropriate inference workloads if it meets quality, latency, privacy, and cost requirements
- Vectorize only when tenant-scoped retrieval is useful and access controls are enforced
- Analytics Engine for operational and product analytics, never as the sole authoritative billing ledger
- Browser Rendering only for approved, compliant, rate-limited workflows; never use scraping where vendor APIs or customer-provided data are available
- Cloudflare Access, Turnstile, WAF, Rate Limiting, Bot Management where available and appropriate
- Cloudflare Secrets for credentials and signing keys

Use stateless Workers for request handling unless durable consistency is necessary. Explicitly define state ownership and lifecycle.

### 3.2 Tenant isolation

Insight Hunter’s core promise is tenant privacy and data separation.

Implement an isolation design compatible with the broader Insight Hunter auth/platform architecture:

- Every request derives tenant context from verified Insight Hunter authentication and server-side authorization—not from a client-submitted tenant ID.
- Enforce tenant authorization on every API route, Worker call, Durable Object route, R2 key, export, recording, transcript, message, call, queue, department, extension, and billing record.
- Prefer one tenant-scoped Durable Object namespace/name per tenant for serialized configuration changes, real-time client connections, active-call/queue state, and idempotency coordination.
- Use tenant-scoped storage and tenant-prefixed R2 object paths.
- Never expose Twilio master credentials or any tenant-specific provider credentials to browsers.
- Do not trust Twilio webhook payload fields as tenant authorization. Resolve a trusted mapping from destination number, provider resource identity, or signed metadata to the tenant.
- Add a tenant-bound audit trail for security-sensitive configuration changes, message/call access, recording downloads, forwarding rules, role changes, AI-agent changes, exports, billing changes, and provider provisioning.
- Do not allow cross-tenant search, analytics, exports, or support tooling by default.
- Any internal support access must be explicitly designed, time-limited, auditable, and disabled unless authorized by a higher-level Insight Hunter support-control model.

### 3.3 Provider abstraction

Build a provider adapter layer so the remainder of the application uses provider-neutral domain models.

At minimum define interfaces for:

- Phone number search, reservation, purchase, release, capability lookup, verification, and porting status
- Inbound voice webhook validation and call lifecycle events
- Outbound voice initiation
- Call transfer, bridge, conference, queue, recording, and participant control
- SIP/softphone token issuance if used
- Voicemail and recording retrieval
- Message send, receive, delivery status, media retrieval, opt-out handling, and template support
- Video room creation, access token issuance, recording/composition lifecycle, and participant events
- AI voice session integration
- Usage ingestion and reconciliation
- Emergency-address and regulatory requirement handling where supported
- Carrier/provider errors normalized to Insight Hunter error types

Implement `TwilioProvider` first. Keep a clear path for alternate adapters, such as Telnyx, Bandwidth, Vonage, Daily, LiveKit, Zoom, or a direct SIP carrier. Do not implement unsupported provider adapters prematurely; define the abstraction and document the decision criteria.

---

## 4. Core product capabilities

Implement all capabilities as durable domain features, feature-gated by entitlement, role, and provider capability.

### 4.1 Organization communication setup

Tenant administrators must be able to:

- Activate the PBX module
- Choose a business display name and caller-ID name where provider/carrier rules permit
- Select business category, operating location(s), time zone(s), languages, normal business hours, holiday schedules, emergency closures, and after-hours rules
- Select communication channels enabled for the organization:
  - Voice
  - SMS
  - MMS
  - RCS where provider and recipient support it
  - WhatsApp where approved and enabled
  - Web chat
  - Email handoff/integration if available in the broader platform
  - Video meetings
- Configure organization-wide call recording policy, consent announcement, retention schedule, and role permissions
- Configure organization-wide messaging compliance, opt-in source, opt-out keywords, quiet hours, approved templates, and campaign restrictions
- Configure branded caller ID and message sender identity where provider support and regulation allow
- Manage phone numbers, extensions, departments, queues, business locations, and users
- View onboarding status, missing compliance items, provider registration status, and blockers

### 4.2 Telephone numbers and extensions

Support:

- Local phone numbers
- Toll-free numbers
- Mobile-capable business numbers where available
- International numbering only after the product supports relevant compliance and provisioning requirements
- Number search by area code, locality, toll-free pattern, capabilities, and country
- Number purchase, assignment, unassignment, release, and lifecycle status
- Number porting intake and state tracking; do not promise fully automated porting until the provider workflow is implemented
- Number-level routing rules
- Number-level business hours
- Number-level caller ID behavior
- Number-level SMS/MMS capability status
- Number-level emergency service address requirement status when applicable
- Number-level compliance registration status
- Extension assignment:
  - Numeric extensions
  - Individual user extensions
  - Shared department extensions
  - Queue extensions
  - Voicemail box extensions
  - IVR menu destinations
  - Conference bridge extensions where supported
- Direct inward dialing rules
- Ring groups and simultaneous/sequential ringing
- Shared line appearances if supported by the client architecture
- Caller ID masking/identity selection subject to policy, verification, and anti-spoofing controls
- Blocked/spam/suspicious caller controls
- Contact lookup and customer context on inbound calls

### 4.3 Voice, PBX, and call routing

Build a robust multi-level call flow designer and runtime.

Required call-flow capabilities:

- Business hours and holiday routing
- Greeting and announcement playback
- Text-to-speech and uploaded audio prompts
- DTMF menu collection
- Speech input where supported
- Department routing
- Employee/extension routing
- Ring groups
- Call queues
- Skills-based or rules-based routing foundation
- Sequential, simultaneous, round-robin, longest-idle, priority, and overflow routing options as applicable
- Time-based overflow and no-answer overflow
- Transfer to an internal extension
- Transfer to an external verified number
- Warm transfer and cold transfer where the client/provider supports it
- Whisper/barge/monitor controls restricted to authorized supervisors and logged
- Callback request workflow
- Hold music or announcements
- Call forwarding schedules
- Failover routes for provider failures or unreachable recipients
- After-hours routing
- Voicemail fallback
- AI receptionist fallback
- Emergency closure routing
- Caller language routing
- VIP contact routing
- Spam risk treatment
- User presence/availability treatment
- Do-not-disturb enforcement
- Personal assistant rules for individual extensions
- Secure payment handling: never collect raw payment card data in the core call flow unless an approved provider-compliant solution is used; use provider-supported secure payment tools if that capability is enabled

Build call flow changes with:
- Draft/publish states
- Validation before publish
- Version history
- Rollback to a prior version
- Test/simulation mode
- Change audit events
- Idempotent provisioning/application of routing changes
- Safe behavior for incomplete flows and provider failures

### 4.4 Softphone and calling clients

Provide a responsive web-based business phone client within the Insight Hunter dashboard.

Support, as compatible with provider and browser capability:

- Inbound call notifications
- Browser-based softphone calling
- Outbound dialing
- Click-to-call from contacts, CRM records, invoices, reports, and customer records
- Incoming caller identity, account context, prior messages, appointments, unpaid invoices, notes, and business relationship summary when user permission permits
- Answer, reject, mute, hold, resume, transfer, add participant, start/stop recording if policy permits, send DTMF, and end call
- Presence and availability status
- Call disposition
- Post-call notes
- Call tagging
- Follow-up task creation
- Link a call to a customer, deal, invoice, support ticket, or bookkeeping event if those modules expose safe integrations
- Accessible keyboard interaction
- Mobile-responsive design
- Clear device permission diagnostics and audio quality guidance
- Secure signed access tokens with short expiry
- No long-lived provider client tokens in local storage
- Logout/session invalidation handling
- Reconnection behavior and user-visible state when network conditions deteriorate

Use the provider’s official browser SDK where appropriate, but issue provider access tokens only from authenticated server-side endpoints after entitlement and role checks.

### 4.5 Voicemail

Implement tenant-, department-, queue-, and user-level voicemail.

Required features:

- Custom greeting per mailbox
- Default fallback greeting
- Business-hours-aware greeting
- Voicemail transcription
- Audio playback
- Download/export only for authorized users
- Optional email or in-app notification
- Optional transcription notification
- Mark read/unread
- Assign and tag
- Share internally with role checks
- Return call
- Reply by message
- Retention policy
- Legal hold capability if the platform later supports it
- Storage and transcription usage attribution
- Caller identity, timestamp, route path, and disposition
- Configurable voicemail-to-email delivery only when permitted by tenant policy and privacy controls
- Clear consent/legal configuration for recording/transcription, based on the tenant’s jurisdictional responsibility and the product’s policy controls

### 4.6 SMS, MMS, RCS, WhatsApp, and messaging inbox

Build a unified messaging capability that begins with SMS/MMS and can expand to RCS, WhatsApp, and web chat.

Core requirements:

- Two-way SMS
- Two-way MMS with media support
- Shared inbox
- Individual inbox
- Department inbox
- Conversation ownership and assignment
- Conversation state: open, pending, closed, spam, blocked, escalated
- Internal notes not visible to customers
- Conversation tags
- Contact records
- Search and filtering
- Message templates
- Personalization variables
- File/media attachment management
- Message delivery and failure status
- Incoming message webhooks
- Opt-out detection and suppression
- STOP, START, HELP, and other carrier/region-required keyword handling
- Quiet-hours enforcement
- Consent and opt-in evidence tracking
- Rate controls and abuse controls
- Sender-number selection rules
- Template approval workflows where required
- Scheduled messages
- Drip/cadence automation with cancellation and suppression safeguards
- Triggered automations:
  - New lead response
  - Appointment reminders
  - Invoice reminders
  - Payment receipt or failed payment notification
  - Service-status updates
  - Missed-call text back
  - Voicemail follow-up
  - Call-back request acknowledgement
  - Customer-service case updates
  - Review request only with compliant opt-in and suppression controls
  - Renewal/reminder notices
- Human handoff from AI or automation
- Auditability of automation origin and message content
- Tenant configurable templates, branding, approved sender identities, and policies
- Bulk/campaign messaging only after explicit entitlement, compliance workflow, throughput limits, and abuse protection are in place
- Separate transactional and marketing classifications
- Consent source, consent timestamp, purpose, and recipient phone number normalization
- Global and tenant-specific suppression lists
- Do not market by SMS merely because a phone number is stored in a financial customer record

The domain model must distinguish:
- Contact
- Phone identity
- Consent
- Conversation
- Message
- Attachment/media
- Assignment
- Template
- Automation
- Suppression
- Compliance registration
- Delivery outcome
- Provider resource
- Usage event

### 4.7 AI receptionist and AI customer service

Implement an AI receptionist/customer-service system that is helpful, controlled, observable, tenant-customizable, and never misrepresents its authority.

The initial system may use Twilio Conversation Relay, provider voice AI functionality, an external LLM through an approved server-side integration, Workers AI, or a carefully designed hybrid. Select the approach based on real-time latency, interruption handling, voice quality, security, cost, and operational supportability.

The AI agent must support:

- Voice and text experiences where enabled
- Tenant-specific identity, name, voice, tone, languages, business facts, hours, locations, departments, FAQs, policies, and escalation rules
- Explicit disclosure that it is an automated assistant where legally or policy required
- Natural-language intent detection
- Structured intake:
  - Name
  - Contact information
  - Reason for calling or messaging
  - Customer/account lookup if authorized
  - Preferred callback time
  - Department selection
  - Appointment/booking request if the tenant integrates a scheduler
  - Invoice or payment question routing
  - Service request intake
  - Urgency classification
- Answer approved FAQs from tenant-managed knowledge sources
- Route to department, employee, queue, voicemail, callback workflow, or human operator
- Send a follow-up text only when the caller/recipient is eligible and consent rules permit
- Summarize the interaction for the receiving employee
- Create lead, callback, task, or ticket records through approved Insight Hunter integrations
- Escalate on explicit human request
- Escalate on low confidence
- Escalate on safety, legal, medical, emergency, financial-advice, fraud, account-access, sensitive-data, or complaint triggers
- Never make binding commitments, quote unapproved prices, approve refunds, give legal/tax/investment advice, accept sensitive credentials, or take payment card details except through an approved compliant payment flow
- Never disclose a tenant’s confidential customer/account data without verified caller authorization and a permitted integration policy
- Tenant-managed “allowed actions” list
- Tenant-managed “prohibited statements/actions” list
- Prompt versioning, review, approval, publish, rollback, and audit logs
- Retrieval restricted to tenant-owned and tenant-authorized knowledge data
- Transcript, summary, intent, action, routing outcome, confidence indicator, and human override metadata
- Quality review workflows
- AI usage metering by relevant provider units, including inference, transcription, text-to-speech, speech-to-text, and voice-session usage where measurable
- Kill switch at platform, tenant, number, department, and agent level
- Graceful fallback to a traditional IVR or voicemail if AI services fail

Do not let an LLM autonomously invoke sensitive actions. Use a controlled tool/action layer with:
- Schema validation
- Tenant authorization
- User/role permission checks
- Idempotency
- Rate limits
- Human confirmation for irreversible, financial, privacy-sensitive, or account-changing actions
- Allow-listing of enabled integrations and destinations
- Comprehensive audit logs

### 4.8 Contact center and support operations

Support a contact-center model appropriate for growing teams:

- Departments
- Queues
- Queue membership
- Skills/tags
- Business hours
- Service-level targets
- Queue priority
- Overflow
- Callback option
- Agent presence states:
  - Available
  - Busy
  - Away
  - Offline
  - Do not disturb
  - Wrap-up
- Queue dashboard
- Waiting callers
- Estimated wait treatment when practical
- Supervisor controls
- Agent performance/queue metrics
- Call/message disposition
- Internal notes
- Callback tasks
- Missed-call handling
- Customer timeline across calls, messages, voicemail, and video where enabled
- Permission-based recordings and transcript access
- Conversation assignment and reassignment
- Customer satisfaction capture where configured
- Quality assurance scorecards as a later gated feature
- No functionality should expose one tenant’s calls, customers, messages, or analytics to another tenant

### 4.9 Video conferencing

Implement video conferencing as an optional PBX feature and use a provider abstraction.

Twilio Video is the initial preferred implementation if available and commercially appropriate. Video rooms must be created and joined through Insight Hunter entitlement, authorization, and server-generated short-lived tokens.

Required capabilities:

- One-to-one video calls
- Group video rooms
- Audio-only join
- Video meeting links
- Waiting room/lobby behavior where available or implemented at the application layer
- Host/co-host permissions
- Screen sharing
- In-meeting chat if enabled
- Participant management
- Secure room naming and access controls
- Short-lived join tokens
- Expiration and revocation rules
- Meeting scheduling/invites if calendar integration exists
- Recording only when explicitly enabled and policy permits
- Recording consent/notice controls
- Recording and transcript retention controls
- Meeting audit events
- Participant-minute, recording, composition, and storage usage accounting
- Browser compatibility checks and diagnostics
- Tenant branding and meeting settings
- Default disabled unless the tenant entitlement includes it

Do not make video a hard dependency for core voice/SMS launch. Build it as a well-isolated optional service with a clear feature flag and entitlement boundary.

### 4.10 Physical business address, mail, package, and freight add-ons

Explore and design—but do not falsely claim operational delivery of—optional physical-presence services.

Possible future add-ons include:

- Commercial business address
- Virtual mailbox
- Mail receiving
- Mail scanning
- Mail forwarding
- Parcel receiving and forwarding
- Registered-agent coordination where lawful and properly partnered
- Freight/shipping coordination
- Local delivery/pickup logistics
- Business formation address support through `insighthunter-bizforma`
- Address verification and business-profile consistency support

Evaluate partner/API approaches such as:
- Virtual mailbox providers
- Commercial mail receiving agency partners
- Registered-agent service partners
- Shipping/parcel/freight APIs
- Uber Freight or similar logistics platforms, only if partnership/API terms and service operations support the intended workflow
- Local address providers where compliant, geographically available, contractually permitted, and operationally viable

Important constraints:

- Insight Hunter must not advertise a “physical address,” “mailbox,” “registered agent,” “mail forwarding,” “freight,” or “delivery” service as available until a legal, operational, contractual, and vendor-backed fulfillment path exists.
- These services are not a simple API feature. They require jurisdictional review, customer identity verification, mail handling SOPs, chain-of-custody controls, vendor SLAs, pricing, customer support, and compliance processes.
- Create an add-on domain model and admin-facing capability framework now.
- Implement a feature-gated “coming soon / request access / partner-backed availability” flow unless the repository already has a verified partner and operational program.
- Keep physical-address data separate from communications metadata and protect it with stricter access controls.
- Treat these add-ons as separately billable line items with vendor pass-through cost, Insight Hunter markup, taxes/fees where applicable, and fulfillment state.

Deliver a decision document in this module:
`docs/physical-services-feasibility.md`

It must include:
- Candidate service categories
- Why each is operationally difficult
- Vendor/partner criteria
- Regulatory and privacy concerns
- Customer identity and fraud risks
- Geographic constraints
- Pricing and margin framework
- Recommended launch phases
- Clear go/no-go gates
- The recommended first practical offer

Default recommendation: launch PBX, messaging, AI receptionist, and video first; treat physical mail/address/freight as a partner-backed future add-on after vendor due diligence and operating procedures are approved.

---

## 5. Financial controls and billing

Insight Hunter is a financial platform. PBX usage and vendor costs require accounting-grade traceability.

### 5.1 Entitlements

Integrate with the existing Insight Hunter billing/entitlement system. If it does not exist or lacks needed capability, define an internal entitlement interface rather than baking plan names into business logic.

Entitlements must control:

- Maximum users/extensions
- Maximum departments and queues
- Number of owned numbers
- Local/toll-free/international number eligibility
- Voice capabilities
- Call recording
- Voicemail transcription
- SMS/MMS volume or allowance
- Campaign/automation availability
- AI receptionist availability
- AI agent minutes/credits
- Video rooms and participant caps
- Video recording
- Analytics level
- Data retention period
- API/webhooks
- White-label/branding options
- Physical mail/address features
- Support level
- Advanced security controls

Use plan configuration data and feature flags—not scattered `if plan === "pro"` logic.

### 5.2 Usage ledger

Implement an immutable or append-only usage ledger suitable for billing reconciliation.

Each usage event must capture at least:

- Insight Hunter event ID
- Tenant ID
- Organization/business ID
- User ID when attributable
- Provider
- Provider account/subaccount identifier when applicable
- Provider resource ID
- Resource type
- Usage type
- Direction
- Channel
- Quantity
- Unit
- Vendor unit cost if known
- Vendor currency
- Insight Hunter billed rate
- Markup/discount rule reference
- Included-allowance application
- Billable quantity
- Estimated versus final status
- Tax/fee classification where applicable
- Event timestamp
- Ingestion timestamp
- Idempotency key
- Correlation IDs: call, message, conference, video room, recording, workflow, invoice, subscription
- Reversal/adjustment linkage
- Metadata sufficient for audit but not unnecessary sensitive content

Usage types should include, where relevant:

- Voice inbound minutes
- Voice outbound minutes
- Call recording minutes
- Recording storage
- Voicemail storage
- Transcription minutes
- Speech-to-text
- Text-to-speech
- AI session/inference usage
- SMS segments
- MMS messages/media
- RCS/WhatsApp messages if enabled
- Number monthly rental
- Number provisioning fees
- Toll-free verification and campaign fees
- Porting fees
- Video participant minutes
- Video recording/composition
- Video recording storage
- Data egress where directly billable
- Address/mail handling fees
- Mail scan/forwarding/shipping fees
- Freight/delivery charges
- Manual service fees

### 5.3 Reconciliation

Implement asynchronous reconciliation:

- Ingest real-time webhooks/events.
- Record provisional usage promptly.
- Reconcile against provider usage records on a scheduled cadence.
- Detect duplicate, missing, delayed, reversed, and mismatched events.
- Preserve raw provider payloads only as long as needed and protect them appropriately.
- Use idempotency and deduplication based on provider resource/event IDs plus normalized event type.
- Create internal reconciliation alerts for unexplained differences.
- Do not automatically bill a customer for ambiguous or unverified usage without a configurable policy.
- Do not lose provider costs because a webhook was delayed or retried.

### 5.4 Pricing rules

Implement a pricing engine or pricing-rule adapter that supports:

- Pass-through pricing
- Fixed markup percentage
- Fixed per-unit markup
- Tiered pricing
- Included allowance
- Overage rates
- Minimum charges
- Feature package fees
- Number rental fees
- Add-on fees
- Promotional credits
- Manual credit/debit adjustments with authorization and audit
- Tenant-specific negotiated rates only for authorized internal users
- Effective dates
- Currency rules
- Tax integration boundary

Do not calculate revenue from a UI-only estimate. Billing totals must be based on persisted, reconciled ledger events and authoritative entitlement/pricing configuration.

### 5.5 Customer usage experience

Within the PBX dashboard, tenants need:

- Current period usage
- Included allowance
- Estimated overage
- Usage by number, department, user, channel, and feature where permitted
- Cost-center tagging where available
- Alerts at configurable thresholds
- Downloadable usage report
- Clear distinction between estimated and finalized charges
- Explanation of what counts as billable usage
- Ability to set soft/hard usage controls where practical
- Ability to disable optional high-cost features such as recording, AI, campaigns, and video recording

---

## 6. Data model requirements

Design explicit, migration-backed, tenant-safe models. Align exact database placement and tenancy mechanics with the existing Insight Hunter platform.

At minimum, define domain entities or equivalent schemas for:

- Tenant
- Business/organization
- Business location
- PBX subscription/entitlement snapshot
- User
- Role
- Permission
- Department
- Team
- Extension
- Phone number
- Number assignment
- Number compliance registration
- Number emergency address configuration
- Call flow
- Call-flow version
- Routing node and edge
- Business hours
- Holiday schedule
- Queue
- Queue member
- Presence state
- Call
- Call segment/leg
- Call event
- Call recording
- Voicemail box
- Voicemail message
- Transcript
- AI session
- AI prompt/version
- AI knowledge source/index reference
- AI tool invocation
- Contact
- Contact phone identity
- Consent record
- Conversation
- Message
- Message attachment
- Message template
- Messaging automation
- Suppression/block entry
- Conference
- Video room
- Video recording/composition
- Meeting participant
- Task/callback request
- Audit event
- Provider account/configuration reference
- Provider resource mapping
- Usage ledger event
- Reconciliation record
- Pricing rule reference
- Billing alert
- Physical service request
- Address service order
- Mail/package/shipping item
- Fulfillment event
- Retention/deletion policy
- Legal hold marker if later enabled

Use immutable event records where an audit or billing sequence requires integrity. Do not overload a generic JSON blob where relational fields and queryability are materially needed. Allow structured metadata only for provider-specific extension data and validate it.

---

## 7. Public APIs, webhooks, and internal APIs

Create clearly versioned APIs, or match the repository’s API convention if one exists.

### 7.1 API principles

- Authenticate every non-public endpoint.
- Determine tenant server-side.
- Validate all inputs with schemas.
- Return safe error messages.
- Use idempotency keys for operations that cause a provider action or financial effect.
- Apply rate limits by tenant, user, IP, and endpoint risk.
- Use pagination and filters for list endpoints.
- Avoid returning raw provider secrets or webhook payloads.
- Apply CORS only to explicitly approved first-party origins.
- Use correlation IDs.
- Log structured security and operational events.
- Document request/response schemas.
- Include OpenAPI or equivalent typed API documentation if the repository convention supports it.

### 7.2 Twilio webhooks

Implement secure webhook endpoints for applicable events:

- Inbound voice
- Voice status callbacks
- Recording status callbacks
- Transcription callbacks
- Inbound messages
- Message delivery callbacks
- Number/provisioning state updates
- Video room/recording events
- AI/Conversation Relay session callbacks if used
- Provider error callbacks where available

Webhook requirements:

- Validate Twilio signatures using the correct canonical URL and request body handling.
- Reject invalid signatures.
- Resolve tenant safely from a controlled provider-resource mapping.
- Handle duplicate delivery.
- Acknowledge quickly and queue heavy work.
- Ensure retry safety.
- Retain sufficient webhook evidence for debugging/audit, subject to retention policy.
- Protect against payload replay where applicable.
- Use provider-specific webhooks only as ingress events; do not make the UI wait for webhook completion to respond.

### 7.3 TwiML and call-control responses

Where Twilio is used:

- Generate TwiML only after resolving the trusted tenant/number/call-flow context.
- Validate published flow configuration before runtime use.
- Implement a safe default route when a flow is invalid or unavailable:
  - Play a generic service interruption message appropriate to tenant configuration
  - Route to a controlled fallback voicemail or verified fallback destination
  - Log an urgent operational event
- Never reflect arbitrary caller-provided URLs or destination numbers into TwiML.
- Validate all transfer/forward destination numbers and policy eligibility.
- Use approved caller identity rules.
- Make call-control responses deterministic and observable.

---

## 8. Security, privacy, and compliance

Build to a high financial-data and communications-security standard. This module may process customer contacts, call recordings, messages, business operations, payment-related inquiries, and AI-derived summaries.

### 8.1 Security controls

Implement:

- Auth integration with `insighthunter-auth`
- Role-based and permission-based access control
- Tenant isolation enforcement
- Short-lived signed tokens
- Secret management through Cloudflare secrets
- Webhook signature validation
- Encryption in transit
- At-rest security through provider/platform controls
- Strict CORS
- CSRF strategy appropriate to the auth model
- Content security policy
- Secure headers
- Input schema validation
- Output encoding
- SSRF controls for any URL ingestion
- Malware/content safety handling for uploaded media where relevant
- File type and size validation
- Rate limits
- Abuse detection
- Account takeover/fraud protections where compatible with the broader platform
- Audit logging
- Sensitive-operation re-authentication if the platform supports it
- Admin approval for number purchasing, porting, emergency-address changes, external forwarding, billing rule changes, and destructive retention actions where appropriate
- Least-privilege Cloudflare bindings and provider credentials
- Separate production/staging/test provider credentials and resources
- No sensitive message/call content in application logs

### 8.2 Communications compliance

Implement configurable controls and warnings; do not represent the software as legal advice or automatic compliance certification.

Address at minimum:

- A2P 10DLC / messaging registration workflow and status visibility for applicable U.S. traffic
- Toll-free verification workflow/status where applicable
- SMS/MMS opt-in evidence and opt-out enforcement
- STOP/START/HELP behavior
- Quiet hours and time-zone-aware send restrictions
- Transactional vs marketing classification
- Call recording consent notices and configuration
- Recording/transcription retention configuration
- Emergency calling / E911 address requirements and disclaimers where provider service requires them
- Caller ID anti-spoofing controls
- CAN-SPAM boundary if email integrations are introduced
- TCPA-related consent controls and marketing safeguards
- Data-subject requests and deletion/export hooks consistent with the platform privacy architecture
- Country/region feature gating until local telecom/legal requirements are supported
- Prohibited-content and suspicious-activity handling
- Customer-facing compliance notices and admin checklist

### 8.3 AI safety and disclosure

- Make AI receptionist behavior configurable but bounded.
- Record the active policy/prompt version for each AI interaction.
- Make human escalation easy.
- Do not fabricate account status, prices, availability, legal conclusions, medical advice, tax advice, or facts.
- Separate approved tenant knowledge from model generalization.
- Add a feedback/control surface for incorrect AI answers.
- Do not use one tenant’s interaction data to train or retrieve for another tenant.
- Define a default retention and deletion policy.
- Ensure AI calls/actions are traceable to specific tenant configuration and authority.

---

## 9. User experience requirements

Build a clean, responsive, accessible experience that fits the Insight Hunter “Business Financial Command Center” style.

The PBX app should expose a communications command center with these major areas:

1. Overview
   - Today’s calls, missed calls, unread messages, voicemail, queue activity, AI resolutions, open callbacks, active video meetings, estimated usage, and compliance warnings.

2. Inbox
   - Shared and personal conversations
   - Voice/message/video interaction history
   - Assignments, tags, notes, customer context, follow-up actions

3. Phone
   - Softphone dialer
   - Active call controls
   - Call history
   - Presence
   - Contact/customer lookup

4. Voicemail
   - Mailboxes
   - Audio and transcription
   - Assign/return/reply/follow-up

5. Automations
   - Missed-call text back
   - Appointment reminders
   - Invoice reminders
   - Templates
   - Consent-safe campaigns
   - Approval and test workflow

6. AI Receptionist
   - Agent configuration
   - Knowledge sources
   - Departments and routing
   - Prompt/policy versions
   - Test console
   - Conversation review
   - Escalation and kill-switch controls

7. Call Flows
   - Number routing
   - Business hours
   - IVR menus
   - Queues
   - Fallbacks
   - Draft/publish/version history/simulation

8. Numbers & Extensions
   - Number inventory
   - Purchases
   - Assignments
   - Porting
   - Compliance status
   - Emergency address status
   - Extensions

9. Team & Departments
   - Users
   - Roles
   - Presence
   - Departments
   - Queues
   - Hours

10. Video
   - Meetings
   - Rooms
   - Scheduling
   - Recordings
   - Usage

11. Analytics
   - Call volume
   - Answer rate
   - Missed-call rate
   - Queue wait time
   - AI containment/escalation rate
   - Message response rate
   - Agent activity
   - Quality/technical metrics when available
   - Usage and estimated costs

12. Billing & Usage
   - Entitlements
   - Allowances
   - Usage ledger summaries
   - Overage estimates
   - Downloadable usage
   - Add-ons
   - Pricing notices

13. Settings & Compliance
   - Business profile
   - Consent
   - Recording
   - Retention
   - Security
   - Provider status
   - Registration checklists
   - Audit log
   - Data export/deletion requests

Every screen must have:
- Loading state
- Empty state
- Error state
- Permission-denied state
- Mobile-responsiveness
- Keyboard accessibility
- Sensible default behavior
- Clear distinction between live/provider state and locally saved/pending state

---

## 10. Integrations with Insight Hunter modules

Integrate through explicit contracts; do not create circular dependencies or directly reach into another app’s private database.

### 10.1 Auth

Use `insighthunter-auth` as the exclusive source for:

- Authentication
- Session validation
- User identity
- Organization/tenant membership
- Role claims or permission resolution
- Sign-out/session invalidation behavior

### 10.2 Dashboard

Expose a PBX summary widget/API for `app.insighthunter.app`:

- Missed calls
- Unread conversations
- Urgent voicemail
- Pending callbacks
- Active AI escalations
- Usage threshold alerts
- Quick actions: call, message, open inbox, join meeting

### 10.3 Bookkeeping and reports

When user permissions and explicit tenant configuration allow, support safe links between communications and financial operations:

- Customer contact profile
- Invoice payment reminder automation
- Overdue invoice notification
- Appointment/service reminder
- Call/message activity displayed in customer timeline
- PBX costs and usage reporting for business expense analytics
- Revenue attribution from leads/calls only if the data model supports it and attribution is transparently labeled
- No automated collection, payment promises, tax advice, or financial decisions by AI without separately approved workflows

### 10.4 BizForma

Potential integrations:

- Business legal name
- DBA/trade name
- Operating locations
- Business phone numbers
- Address-service requests
- Entity formation contact setup
- Compliance checklists

Do not treat a virtual mailbox as a valid legal address, registered-agent service, or tax nexus solution unless a verified partner and jurisdictional rules explicitly permit it.

### 10.5 Insights

Potential integrations:

- Call/message trend signals
- Customer FAQ gaps
- Competitor messaging changes only from compliant/public sources
- Demand patterns derived from tenant communications only with tenant authorization and privacy restrictions
- Aggregated anonymized product analytics only under a documented privacy policy and never as cross-tenant content exposure

---

## 11. Operational resilience

Define failure modes and implement safe degradation.

Required scenarios:

- Twilio API unavailable
- Provider webhook delayed or duplicated
- AI provider latency/failure
- Database/Durable Object issue
- Queue backlog
- Recording/transcription failure
- Invalid or unpublished call flow
- Token expiration
- Browser audio permission failure
- Number compliance registration pending/rejected
- Over-usage or exhausted allowance
- Tenant subscription cancellation
- Phone number release/port-out
- SMS opt-out
- Suspected fraud or spam
- Emergency routing issue
- Video room creation failure
- Storage failure
- Worker deployment rollback

For each, define:
- User-facing behavior
- Fallback route
- Logging/alerting
- Retry/idempotency behavior
- Whether customer messaging/calling is blocked
- Whether usage is provisional
- Operator remediation path

Use:
- Idempotent provider action requests
- Dead-letter queues
- Bounded retries with exponential backoff
- Alerts for failed provisioning, failed call-flow activation, billing mismatches, compliance registration failures, and abnormal usage spikes
- Health endpoints appropriate to the deployment
- Feature flags/kill switches
- Safe default deny for sensitive features

---

## 12. Testing requirements

Do not consider the work complete without tests.

Implement the test strategy appropriate to the repository. At minimum include:

### 12.1 Unit tests

- Entitlement checks
- Tenant authorization
- Role/permission rules
- Call-flow validation
- Routing decisions
- Business-hour behavior
- Consent/suppression enforcement
- Usage calculation
- Pricing/markup application
- Idempotency behavior
- Webhook signature verification wrapper
- Provider error normalization
- AI action policy validation
- Retention/access rules

### 12.2 Integration tests

- Twilio webhook ingestion with signed fixture requests
- Inbound call routing to a configured flow
- Inbound message into the correct tenant conversation
- Message send request with usage ledger record
- Opt-out suppresses further sends
- Provisioning action records audit event and provider mapping
- Recording event creates permitted storage metadata
- Softphone token requires valid user/tenant/entitlement
- Video token issuance requires proper room authorization
- Queue/event retry behavior
- Tenant A cannot access Tenant B resources
- Reconciliation avoids duplicate billing
- AI receptionist tool calls cannot execute disallowed actions

### 12.3 End-to-end tests

- Admin provisions a number, assigns it, publishes a call flow, and receives a test call.
- Customer texts a number; an employee responds from the shared inbox.
- Missed call triggers a compliant message only if consent/configuration permits.
- Caller reaches AI receptionist, requests a human, and gets routed to the correct queue with a summary.
- User joins a video meeting with a short-lived token.
- Tenant views usage, allowance, and estimated charges.
- Unauthorized user cannot access recordings or configuration.
- Opted-out recipient is never sent an automation.
- Subscription/entitlement removal disables restricted actions safely while preserving legally required data and configured retention.

Use test doubles for Twilio in automated tests. Do not make live paid provider calls in default CI.

---

## 13. Deliverables

Deliver the complete module, not merely a plan.

At a minimum provide:

1. Production-ready TypeScript implementation.
2. Cloudflare Worker entrypoints and route structure.
3. `wrangler.jsonc` configuration using the repository’s current standards and a current compatibility date.
4. Explicit Cloudflare bindings only for services actually used.
5. Durable Object classes and migration configuration if used.
6. D1 migrations/schema or tenant-isolated schema artifacts if used.
7. R2 key conventions and retention implementation if used.
8. Queue and dead-letter queue configuration if used.
9. Workflow definitions if used.
10. Provider abstraction interfaces and the Twilio provider implementation.
11. Secure Twilio webhook endpoints.
12. PBX dashboard/user interface components matching existing design conventions.
13. Softphone token endpoint and client integration where feasible.
14. SMS/MMS inbox and automation capability.
15. Voicemail and transcription handling.
16. Call-flow runtime and admin editor/configuration UI.
17. AI receptionist foundation with controlled tool layer, safe defaults, prompt/version controls, and human escalation.
18. Video conferencing integration behind entitlement/feature flags.
19. Usage ledger, reconciliation jobs, pricing hooks, and tenant-visible usage dashboard.
20. Audit logging.
21. Role/permission enforcement.
22. Documentation:
    - README
    - Architecture document
    - Data model document
    - Twilio setup document
    - Security and compliance document
    - Usage/billing document
    - Physical services feasibility document
    - Operations runbook
    - API documentation
23. Tests and test fixtures.
24. Sample `.dev.vars.example` or equivalent secret variable documentation without real values.
25. Local development instructions.
26. Deployment instructions.
27. Rollback instructions.
28. A launch-readiness checklist.

---

## 14. Environment and configuration

Define all configuration explicitly. Use Cloudflare secrets for sensitive values.

Expected categories include, only if actually used:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`
- `TWILIO_MESSAGING_SERVICE_SID`
- `TWILIO_TWIML_APP_SID`
- `TWILIO_CONVERSATIONS_SERVICE_SID`
- `TWILIO_VIDEO_API_KEY_SID`
- `TWILIO_VIDEO_API_KEY_SECRET`
- `TWILIO_VERIFY_SERVICE_SID`
- `AI_PROVIDER_API_KEY`
- `AI_PROVIDER_MODEL`
- `PBX_PUBLIC_BASE_URL`
- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`
- `ALLOWED_ORIGINS`
- `USAGE_RECONCILIATION_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `BILLING_WEBHOOK_SECRET`
- `R2_BUCKET` binding names
- D1, KV, Queue, Durable Object, Workflow, Analytics Engine, Vectorize, and Browser Rendering bindings only if used

Never put secrets in:
- Source code
- Client bundles
- `wrangler.jsonc`
- Example files
- Test snapshots
- Logs
- Git history

---

## 15. Cloudflare agent setup

Before making Cloudflare infrastructure decisions, follow current Cloudflare AI agent setup guidance.

For non-Claude coding agents, the documented setup includes:

```bash
npx -y skills add cloudflare/skills --skill '*' --yes --global
Then configure the appropriate Cloudflare MCP servers for the coding agent/environment:
•	Cloudflare API MCP
•	Cloudflare Docs MCP
•	Cloudflare Bindings MCP
•	Cloudflare Builds MCP
•	Cloudflare Observability MCP
Use the Cloudflare documentation MCP server to verify current API/binding behavior rather than relying on outdated memory. Use the Cloudflare API MCP server only after appropriate OAuth/account authorization is available.
If the repository has a Wrangler configuration file, use Wrangler according to repository conventions. Otherwise, prefer the Cloudflare CLI guidance after account authorization.
Do not ask the customer to expose secrets in chat or paste secrets into source files.
---
16. Implementation order
Execute in this order unless repository reality requires a documented adjustment:
Phase 0 — Discovery and safety baseline
•	Inspect repository and docs
•	Identify auth/tenant/billing conventions
•	Write architecture decision record
•	Define provider abstraction
•	Define tenant isolation model
•	Define security/compliance baseline
•	Create module skeleton and developer documentation
Phase 1 — Foundation
•	Auth integration
•	Permission enforcement
•	Tenant-safe data layer
•	Audit log
•	Entitlement adapter
•	Provider configuration abstraction
•	Secure webhook framework
•	Usage ledger foundation
•	Admin PBX overview
Phase 2 — Core telephony
•	Number inventory/assignment
•	Extensions/departments
•	Call flow model and runtime
•	TwiML generation
•	Inbound call handling
•	Outbound calling foundation
•	Voicemail
•	Call events/history
•	Call recording policy and metadata
•	Basic softphone token issuance
Phase 3 — Messaging
•	Two-way SMS/MMS
•	Shared inbox
•	Contact and consent model
•	STOP/START/HELP and suppression handling
•	Templates
•	Basic transactional automations
•	Delivery callbacks
•	Usage tracking
Phase 4 — Contact center and AI receptionist
•	Queues and agent presence
•	Queue routing
•	Human transfer
•	AI receptionist controlled pilot
•	Prompt/version management
•	AI safety controls
•	Call summaries and tasks
•	AI usage metering
Phase 5 — Video and advanced analytics
•	Entitled video rooms
•	Secure token issuance
•	Meeting records
•	Optional recording
•	Advanced dashboards
•	Quality and operational metrics
Phase 6 — Billing reconciliation and hardening
•	Scheduled provider reconciliation
•	Pricing rule integration
•	Tenant billing reports
•	Alerting
•	Abuse/fraud controls
•	Load/performance testing
•	Disaster/recovery validation
•	Launch readiness review
Phase 7 — Physical-service add-on framework
•	Feasibility documentation
•	Capability flagging
•	Partner-backed request workflow
•	No fulfillment claims until actual partner operation is approved
---
17. Definition of done
Do not report “complete” until all applicable items below are verifiably true:
•	The module compiles and passes lint/type checks.
•	Tests pass.
•	Tenant isolation tests pass.
•	Provider webhooks are signature-validated and idempotent.
•	Calls/messages are mapped to the correct tenant safely.
•	Entitlements restrict access correctly.
•	Usage records are persisted and reconcilable.
•	No provider secrets reach the client.
•	Call recordings/transcripts/media have tenant-scoped authorization and retention handling.
•	SMS opt-out is enforced.
•	AI cannot execute disallowed actions.
•	A failing AI/provider flow falls back safely.
•	The PBX dashboard has meaningful empty/loading/error/permission states.
•	Documentation is complete.
•	Configuration is explicit.
•	Deployment configuration is valid.
•	No hard-coded secrets/tenant IDs/phone numbers/prices exist.
•	Physical mail/address/freight functions are accurately feature-gated and do not overpromise service delivery.
•	The product can be deployed incrementally without breaking existing Insight Hunter apps.
•	The product has a clear rollback strategy.
At the end, provide:
1.	A concise implementation summary.
2.	Exact files created/changed.
3.	Database migration summary.
4.	Cloudflare resources/bindings required.
5.	Twilio console configuration steps.
6.	Required secrets and where to set them.
7.	Test commands and results.
8.	Local-run commands.
9.	Deploy commands.
10.	Known limitations and gated features.
11.	The next highest-value implementation tasks, ordered by risk reduction and customer value.
Do not stop at an architectural outline. Build the deployable system incrementally, preserve security and tenant isolation throughout, and verify each phase with tests.

## Design stance

Use **Twilio first**, but keep it behind a provider interface. It already covers the foundational needs: programmable voice for calling, IVR, recording, conferencing, and SIP; programmable messaging for SMS/MMS plus other supported channels; Conversations for cross-channel threads; and Video for browser/mobile video rooms, recordings, and related capabilities.[1][2][3][4]

For the AI receptionist, the safest initial product is a controlled conversational layer with explicit routing, approved knowledge, tool allow-lists, mandatory escalation paths, transcript/audit capture, and a hard failover to IVR or voicemail. Twilio’s current AI/IVR stack supports conversational voice integrations and routing to human agents, but Insight Hunter must own the tenant policy, authorization, audit trail, customer-data permissions, and billing ledger.[5][6]

## Important implementation guardrails

- Do **not** let PBX vendor records become Insight Hunter’s authoritative billing ledger. Twilio events and usage are inputs to an append-only, tenant-scoped Insight Hunter usage ledger with reconciliation.
- Do **not** build physical mailbox, address, registered-agent, delivery, or freight services as if they are merely APIs. Ship a partner-backed add-on framework and request flow first; only activate fulfillment after operational, legal, and vendor due diligence.
- Do **not** enable marketing automation by default. Build consent capture, opt-out enforcement, quiet hours, registration status, and transactional-versus-marketing controls before campaigns.
- Do **not** treat “AI receptionist” as a free-form chatbot. Treat it as a policy-governed communications agent whose capabilities are explicitly authorized by the tenant and Insight Hunter.
- Do **not** create a separate login/tenant identity model. `insighthunter-auth` must remain the platform authority.
- Keep video as an entitlement-gated service so the core PBX launch—voice, voicemail, SMS/MMS, routing, softphone, shared inbox, and basic AI receptionist—is not delayed by conferencing complexity.

Cloudflare’s current agent setup guidance calls for installing Cloudflare skills and registering the Cloudflare MCP endpoints, including Docs, Bindings, Builds, Observability, and the authenticated Cloudflare API MCP server. The coding agent should use those sources to validate current Workers/Durable Objects/Queues/Workflows mechanics before implementation.[7]

## Recommended first release

Launch the PBX add-on in this sequence:

| Release | Customer-facing scope | Why it comes first |
|---|---|---|
| **PBX Foundation** | One or more business numbers, extensions, schedules, IVR, ring groups, voicemail, call routing, basic call history, secure web softphone | Establishes the phone system customers expect immediately |
| **Messaging Operations** | Two-way SMS/MMS, shared inbox, assigned conversations, templates, missed-call text-back, consent/STOP handling | Converts missed calls into revenue opportunities and centralizes customer contact |
| **AI Receptionist** | Tenant-configurable AI answering, FAQ handling, intent routing, human handoff, after-hours intake, summaries | Provides differentiated automation while remaining safely constrained |
| **Contact Center + Billing** | Queues, presence, analytics, granular usage ledger, allowance/overage controls, reconciliation | Makes it commercially viable and scalable across teams |
| **Video** | Secure meeting rooms, links, tokenized joining, screen share, optional recording | Valuable but should not block core communications launch |
| **Physical Services** | Partner-backed address/mail/package request workflow only | Avoids operational and legal overreach until fulfillment is real |
