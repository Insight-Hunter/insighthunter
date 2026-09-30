apps/insighthunter-auth/
├── .gitignore
├── README.md
├── package.json
├── schema.sql
├── tsconfig.json
├── wrangler.toml          ← only config file
└── src/
    ├── index.ts
    ├── access.ts
    ├── vault.ts
    ├── crypto.ts
    ├── crypto.test.ts
    ├── types.ts            ← single source of truth for types
    ├── db/migrations/
    │   └── 0001_auth_init.sql
    ├── frontend/
    │   ├── index.html
    │   ├── login.html
    │   └── register.html
    ├── lib/
    │   ├── email.ts
    │   ├── jwt.ts
    │   └── rate-limiter.ts
    ├── queue/
    │   └── provisioning-consumer.ts
    └── routes/
        └── auth.ts
