apps/insighthunter-bizforma/
├── package.json
├── tsconfig.json
├── wrangler.jsonc
├── README.md
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── errors.ts
│   │   └── logger.ts
│   ├── utils/
│   │   ├── analytics.ts
│   │   ├── http.ts
│   │   ├── ids.ts
│   │   ├── security.ts
│   │   └── validators.ts
│   ├── agents/
│   │   ├── FormationAgent.ts
│   │   └── ComplianceAgent.ts
│   ├── services/
│   │   ├── audit-service.ts
│   │   ├── case-service.ts
│   │   ├── compliance-service.ts
│   │   ├── dashboard-service.ts
│   │   ├── document-service.ts
│   │   ├── ein-service.ts
│   │   ├── license-service.ts
│   │   ├── maintenance-service.ts
│   │   ├── registered-agent-service.ts
│   │   ├── signature-service.ts
│   │   ├── task-service.ts
│   │   ├── wizard-service.ts
│   │   └── ai-service.ts
│   ├── routes/
│   │   ├── ai.ts
│   │   ├── compliance.ts
│   │   ├── dashboard.ts
│   │   ├── documents.ts
│   │   ├── ein.ts
│   │   ├── formation.ts
│   │   ├── licenses.ts
│   │   ├── maintenance.ts
│   │   ├── registered-agent.ts
│   │   ├── signatures.ts
│   │   ├── tasks.ts
│   │   └── wizard.ts
│   └── db/
│       ├── schema.sql
│       └── migrations/
│           ├── 0001_core.sql
│           ├── 0002_documents.sql
│           ├── 0003_compliance.sql
│           ├── 0004_tasks_signatures.sql
│           ├── 0005_licenses_maintenance.sql
│           └── 0006_audit_ai.sql
