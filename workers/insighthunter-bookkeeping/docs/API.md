# API Documentation

## Endpoints

### Auth
- POST /api/auth/signup
- POST /api/auth/login

### Subscriptions  
- POST /api/subscriptions/create
- GET /api/subscriptions/:userId

### Banking
- POST /api/bank/create-link-token
- POST /api/bank/exchange-token

### Ledger
- POST /api/ledger/:companyId/transaction
- GET /api/ledger/:companyId/transactions
