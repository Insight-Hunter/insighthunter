/* contributing.md */

This document explains how developers can contribute to the InsightHunter platform.

------------------------------------------------------------
Contribution Philosophy
------------------------------------------------------------
InsightHunter is built for clarity, modularity, and long-term maintainability.
All contributions should follow these principles:
- Keep things simple
- Build for future extensibility
- Maintain consistency across the monorepo
- Document everything you add
- Prefer Cloudflare-native patterns

------------------------------------------------------------
1. Fork and Clone
------------------------------------------------------------
Developers should begin by forking the repository and cloning their fork:

git clone https://github.com/yourname/insighthunter.git

Then install dependencies:

./bootstrap.sh

------------------------------------------------------------
2. Branching Strategy
------------------------------------------------------------
main
- Production-ready code only
- Auto-deployed to Cloudflare Pages and Workers

dev
- Staging branch
- Used for integration testing

feature/*
- New features
- Example: feature/add-ledger-filters

fix/*
- Bug fixes
- Example: fix/compliance-deadline-format

docs/*
- Documentation updates

------------------------------------------------------------
3. Commit Style
------------------------------------------------------------
Use conventional commits:

feat: add new dashboard widget  
fix: correct ledger formatting  
docs: update API reference  
refactor: simplify reconciliation logic  
chore: update dependencies  

------------------------------------------------------------
4. Pull Requests
------------------------------------------------------------
All PRs must:
- Pass CI checks
- Include tests for backend changes
- Include documentation for new features
- Follow the design system
- Avoid introducing unnecessary dependencies

PR Review Checklist:
- Code is clean and readable
- No duplication
- No dead code
- No console logs
- Follows Cloudflare-native patterns
- Includes comments where needed

------------------------------------------------------------
5. Code Style
------------------------------------------------------------
JavaScript:
- ESLint enforced
- Prettier formatting
- No unused variables
- No implicit globals

TypeScript (backend):
- Strict mode enabled
- No any unless justified
- Prefer interfaces over types

HTML/CSS:
- Follow the design system
- Use existing classes when possible
- Keep HTML semantic

------------------------------------------------------------
6. Testing
------------------------------------------------------------
Backend:
- Use Miniflare for Worker testing
- Mock Durable Objects
- Mock R2 operations

Frontend:
- Static app, so minimal JS unit tests
- Focus on API wiring and error handling

------------------------------------------------------------
7. Documentation Requirements
------------------------------------------------------------
Every new feature must include:
- Description
