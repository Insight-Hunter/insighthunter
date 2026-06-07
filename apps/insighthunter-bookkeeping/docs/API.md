# API Documentation

## Endpoints

### Auth
- POST /https://auth.insighthunter.app/auth/signup
- POST /https://auth.insighthunter.app/auth/login

### Subscriptions  
- POST /api/subscriptions/create
- GET /api/subscriptions/:userId

### Banking
- POST /api/bank/create-link-token
- POST /api/bank/exchange-token

### Ledger
- POST /api/ledger/:companyId/transaction
- GET /api/ledger/:companyId/transactions
