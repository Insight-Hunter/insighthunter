apps/insighthunter-bizforma/
│
├── index.html                             # HTML entry point
├── App.tsx                                # Root React component
├── vite.config.ts
├── tsconfig.json
├── package.json
├── wrangler.toml                          # Cloudflare Worker config
├── schema.sql                             # Master D1 schema (all migrations combined)
│
├── src/
│   ├── main.tsx                           # React entry point
│   └── worker.ts                          # Cloudflare Worker (Hono API + all routes)
│
├── components/
│   │
│   ├── BusinessWizard.tsx                 # Main wizard controller + state machine
│   ├── GlassComponents.tsx                # Glassmorphism UI primitives
│   ├── ProgressStepper.tsx                # 11-step progress indicator
│   │
│   ├── steps/                             # ── Formation Wizard (11 steps) ──────────
│   │   ├── ConceptStep.tsx                # Step 1:  Business concept & idea
│   │   ├── NameSelectionStep.tsx          # Step 2:  Business name + AI suggestions
│   │   ├── EntityTypeStep.tsx             # Step 3:  Entity type + AI recommendation
│   │   ├── RegistrationStep.tsx           # Step 4:  State registration & reg agent
│   │   ├── EINTaxStep.tsx                 # Step 5:  EIN application + SS-4 pre-fill
│   │   ├── ComplianceStep.tsx             # Step 6:  SOS, annual report, permits
│   │   ├── AccountingStep.tsx             # Step 7:  Software, CPA, tax strategy
│   │   ├── FinancingStep.tsx              # Step 8:  Funding, banking, startup costs
│   │   ├── MarketingStep.tsx              # Step 9:  Strategy, channels, budget
│   │   ├── WebDesignStep.tsx              # Step 10: Domain, hosting, DNS, email
│   │   └── CalendarStep.tsx               # Step 11: AI compliance + tax calendar
│   │
│   ├── formation/                         # ── Post-Wizard Formation Modules ────────
│   │   ├── EntityAdvisor.tsx              # Scored entity recommendation UI
│   │   ├── EINGuide.tsx                   # EIN walkthrough + SS-4 viewer
│   │   ├── StateFilingTracker.tsx         # Per-state filing status board
│   │   ├── OperatingAgreementViewer.tsx   # Generated op agreement preview
│   │   └── FormationSummary.tsx           # Downloadable formation summary PDF
│   │
│   ├── tax/                               # ── Tax Forms ────────────────────────────
│   │   ├── TaxFormsHub.tsx                # Tax forms dashboard
│   │   ├── W9Form.tsx                     # W-9 request & fill UI
│   │   ├── TaxAccountSetup.tsx            # IRS + state tax account task list
│   │   └── SCorpElection.tsx              # Form 2553 guidance & deadline tracker
│   │
│   ├── payroll/                           # ── Payroll Area ─────────────────────────
│   │   ├── PayrollHub.tsx                 # Payroll dashboard
│   │   ├── W4Form.tsx                     # Employee W-4 collection & management
│   │   ├── Form1099.tsx                   # 1099-NEC / 1099-MISC builder
│   │   ├── ContractorTracker.tsx          # Contractor list, TIN collection, thresholds
│   │   └── PayrollSetupChecklist.tsx      # EIN for payroll, state withholding, FUTA
│   │
│   ├── forms/                             # ── Lego Forms ───────────────────────────
│   │   ├── LegoFormsHub.tsx               # Modular form builder dashboard
│   │   ├── FormBuilder.tsx                # Drag-and-drop field composer
│   │   ├── FormRenderer.tsx               # Dynamic form renderer (any schema)
│   │   ├── FormTemplateLibrary.tsx        # System + custom template browser
│   │   ├── AIFormFill.tsx                 # AI-assisted field population
│   │   └── FormSubmissionViewer.tsx       # View & export submissions
│   │
│   ├── compliance/                        # ── Compliance Calendar ──────────────────
│   │   ├── ComplianceDashboard.tsx        # Upcoming deadlines overview
│   │   ├── ComplianceCalendar.tsx         # AI-generated calendar view
│   │   ├── DeadlineCard.tsx               # Individual deadline item
│   │   ├── BOIFilingTracker.tsx           # FinCEN BOI reporting tracker
│   │   └── RenewalReminders.tsx           # Annual report, license, reg agent
│   │
│   ├── documents/                         # ── Document Storage ─────────────────────
│   │   ├── DocumentVault.tsx              # R2-backed document library
│   │   ├── DocumentUpload.tsx             # Upload formation docs to R2
│   │   └── DocumentViewer.tsx             # PDF viewer for stored docs
│   │
│   ├── ai/                                # ── AI Advisor ───────────────────────────
│   │   ├── AdvisorChat.tsx                # Streaming AI business advisor chat
│   │   ├── NameSuggestions.tsx            # AI name generation component
│   │   └── EntityRecommendationCard.tsx   # AI entity rec display w/ rationale
│   │
│   ├── figma/
│   │   └── ImageWithFallback.tsx
│   │
│   └── ui/                                # shadcn/radix component library
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── tabs.tsx
│       ├── badge.tsx
│       ├── dialog.tsx
│       ├── progress.tsx
│       ├── tooltip.tsx
│       ├── accordion.tsx
│       ├── checkbox.tsx
│       ├── textarea.tsx
│       ├── label.tsx
│       ├── separator.tsx
│       └── skeleton.tsx
│
├── api/                                   # ── API Route Handlers (Hono) ────────────
│   ├── session.ts                         # POST/PUT /api/session
│   ├── business.ts                        # POST/GET /api/business
│   ├── formation.ts                       # Formation case CRUD & status
│   ├── ein.ts                             # EIN guidance & SS-4 pre-fill
│   ├── stateRegistration.ts               # State filing checklists & status
│   ├── tax/
│   │   ├── w9.ts                          # W-9 CRUD & PDF generation
│   │   ├── taxAccounts.ts                 # IRS/state tax account task builder
│   │   └── sCorpElection.ts               # 2553 deadline & tracking
│   ├── payroll/
│   │   ├── w4.ts                          # W-4 collection & storage
│   │   ├── form1099.ts                    # 1099-NEC/MISC builder & PDF
│   │   └── contractors.ts                 # Contractor TIN tracking & thresholds
│   ├── forms/
│   │   ├── templates.ts                   # Lego form template CRUD
│   │   ├── submissions.ts                 # Form submission storage & retrieval
│   │   └── aiFormFill.ts                  # AI variable suggestion endpoint
│   ├── compliance.ts                      # Compliance events CRUD
│   ├── documents.ts                       # R2 upload/download
│   └── ai/
│       ├── nameSuggestions.ts             # AI name generation
│       ├── entityRecommendation.ts        # AI entity scoring & recommendation
│       ├── complianceCalendar.ts          # AI calendar generation
│       └── chat.ts                        # Streaming advisor chat
│
├── services/                              # ── Business Logic ───────────────────────
│   ├── sessionService.ts                  # Wizard session management (D1 + KV)
│   ├── formationService.ts                # Formation case state machine
│   ├── entityAdvisorService.ts            # Entity scoring engine
│   ├── einService.ts                      # SS-4 pre-population & validation
│   ├── stateService.ts                    # Per-state requirements, fees, deadlines
│   ├── taxAccountService.ts               # IRS/state tax registration tasks
│   ├── documentService.ts                 # Op agreement & bylaws rendering
│   ├── complianceService.ts               # Compliance task generation & reminders
│   ├── payrollService.ts                  # W-4/1099 management, threshold checks
│   ├── legoFormsService.ts                # Form schema CRUD & submission handling
│   ├── aiAdvisorService.ts                # Workers AI prompts & response parsing
│   └── pdfService.ts                      # HTML → PDF via Browser Rendering
│
├── agents/                                # ── Durable Objects ──────────────────────
│   ├── FormationAgent.ts                  # Formation case state machine (DO)
│   └── ComplianceAgent.ts                 # Compliance calendar & reminders (DO)
│
├── workflows/
│   ├── FormationWorkflow.ts               # Durable multi-step formation pipeline
│   └── ComplianceWorkflow.ts              # Annual compliance renewal pipeline
│
├── queues/
│   ├── documentQueue.ts                   # Async PDF generation consumer
│   └── reminderQueue.ts                   # Compliance deadline reminder consumer
│
├── db/
│   ├── migrations/
│   │   ├── 0001_init.sql                  # sessions, businesses, formation_cases
│   │   ├── 0002_tasks.sql                 # formation_tasks (EIN, state, tax)
│   │   ├── 0003_documents.sql             # formation_documents, lego_form_templates
│   │   ├── 0004_compliance.sql            # compliance_events, renewal_schedule
│   │   ├── 0005_payroll.sql               # w4_records, contractor_1099, payroll_setup
│   │   └── 0006_state_data.sql            # state_requirements reference data
│   └── queries.ts                         # Typed D1 query helpers
│
├── data/
│   ├── states.ts                          # 50 states: fees, forms, deadlines, URLs
│   ├── entityMatrix.ts                    # Scoring matrix for entity recommendation
│   └── taxAccountChecklist.ts            # IRS + state account setup steps
│
├── lib/
│   ├── templates/
│   │   ├── operatingAgreement.html.ts     # LLC operating agreement template
│   │   ├── bylaws.html.ts                 # Corporation bylaws template
│   │   ├── ss4Guide.html.ts               # EIN SS-4 completion guide PDF
│   │   ├── w9.html.ts                     # W-9 form PDF template
│   │   └── form1099.html.ts               # 1099-NEC/MISC PDF template
│   ├── renderer.ts                        # Mustache template renderer
│   ├── scorer.ts                          # Entity recommendation scoring
│   ├── cache.ts                           # KV cache helpers
│   ├── analytics.ts                       # Analytics Engine event tracking
│   └── logger.ts                          # Structured logging
│
├── types/
│   ├── env.ts                             # Cloudflare bindings + AuthContext
│   ├── formation.ts                       # FormationCase, IntakeAnswers, EntityRec
│   ├── payroll.ts                         # W4Record, Contractor1099, PayrollSetup
│   ├── forms.ts                           # LegoForm, FormTemplate, FormSubmission
│   ├── compliance.ts                      # ComplianceEvent, RenewalSchedule
│   └── index.ts                           # Re-exports
│
├── utils/
│   └── api.ts                             # Frontend API client (axios/fetch wrapper)
│
├── styles/
│   └── globals.css                        # Tailwind v4 + glassmorphism design tokens
│
├── public/
│   ├── favicon.svg
│   └── robots.txt
│
└── tests/
    ├── services/
    │   ├── entityAdvisorService.test.ts
    │   ├── stateService.test.ts
    │   ├── payrollService.test.ts
    │   ├── legoFormsService.test.ts
    │   └── complianceService.test.ts
    └── fixtures/
        ├── mockIntake.ts
        ├── mockFormationCase.ts
        ├── mockPayroll.ts
        └── mockStateTasks.ts
