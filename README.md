# BudgetOS

Personal finance management web application.

## Features

- **Multi-user**: Secure authentication with sessions
- **Bank accounts**: Checking, savings, investment accounts
- **Credit cards**: Immediate and deferred debit with customizable billing cycles
- **Transactions**: Sortable columns, quick date filters, infinite scroll
- **Bank import**: CSV, Excel, QIF, QFX with automatic reconciliation
- **Manual reconciliation**: Dedicated mode for reconciling transactions with bank statements
- **Forecasting**: Cash flow projections at 30/60/90 days
- **Reports**: Dashboards and charts

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation (Development)

```bash
# Clone the project
git clone <repo-url>
cd budgetos

# Install dependencies
npm install

# Copy configuration
cp .env.example .env

# Create the database
npm run db:migrate

# (Optional) Insert test data
npm run db:seed

# Start the server
npm run dev
```

## Project Structure

```
budgetos/
├── src/
│   ├── config/           # Configuration
│   ├── controllers/      # API controllers
│   ├── database/         # Migrations and seeds
│   ├── middleware/       # Express middleware
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   ├── validators/       # Zod validation schemas
│   └── server.js         # Entry point
├── client/               # React frontend
├── data/                 # SQLite database (dev)
├── uploads/              # Uploaded files
└── tests/                # Tests
```

## API

The REST API is available at `/api/v1/`.

### Authentication

- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - User profile

### Accounts

- `GET /api/v1/accounts` - List accounts
- `POST /api/v1/accounts` - Create account
- `GET /api/v1/accounts/:id` - Account details
- `PUT /api/v1/accounts/:id` - Update account
- `DELETE /api/v1/accounts/:id` - Delete account

### Transactions

- `GET /api/v1/transactions` - List transactions
- `POST /api/v1/transactions` - Create transaction
- `PUT /api/v1/transactions/:id` - Update transaction
- `DELETE /api/v1/transactions/:id` - Delete transaction
- `PATCH /api/v1/transactions/:id/reconcile` - Toggle reconciliation status

### Credit Cards

- `GET /api/v1/credit-cards` - List cards
- `POST /api/v1/credit-cards` - Create card
- `GET /api/v1/credit-cards/:id/cycles` - Billing cycles

### Import

- `POST /api/v1/import/upload` - Upload file
- `POST /api/v1/import/process` - Process import
- `GET /api/v1/import/reconcile` - Reconciliation interface

## Security

- HTTP sessions with secure cookies
- CSRF protection
- Rate limiting
- Helmet (security headers)
- Strict input validation (Zod)
- bcrypt password hashing
- User data isolation

## License

[Polyform Noncommercial 1.0.0](LICENSE)
