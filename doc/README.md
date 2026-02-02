# BudgetOS Documentation

## Overview

BudgetOS is a personal finance management web application. It provides a complete solution for managing bank accounts, credit cards, transactions, and financial reports.

## Tech Stack

### Backend
- **Runtime**: Node.js >= 18.0.0
- **Framework**: Express.js 4.18.2
- **Database**: SQLite (dev), PostgreSQL or MariaDB/MySQL (production) — via Knex.js
- **Authentication**: Express sessions + bcryptjs
- **Validation**: Zod
- **Security**: Helmet, CSRF protection, rate limiting

### Frontend
- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.10
- **Routing**: React Router 6.21.0
- **State Management**: TanStack React Query 5.17.0
- **Styling**: TailwindCSS 3.4.0
- **Charts**: Recharts 2.10.3

## Project Structure

```
BudgetOS/
├── src/                    # Backend (Node.js/Express)
│   ├── config/             # Configuration files
│   ├── controllers/        # API controllers
│   ├── models/             # Data models
│   ├── services/           # Business logic services
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── database/           # Database schema and migrations
│   ├── validators/         # Zod validation schemas
│   └── utils/              # Utility functions
├── client/                 # Frontend (React/Vite)
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable components
│       ├── contexts/       # React contexts
│       └── lib/            # Utilities and API client
├── data/                   # SQLite database files
├── docker/                 # Docker Compose files (dev DBs, E2E)
├── e2e/                    # E2E browser tests (Playwright)
├── tests/                  # Unit and integration tests
│   ├── integration/        # API integration tests (Supertest)
│   └── ...                 # Unit tests (mirrors src/)
├── uploads/                # Uploaded files
├── logs/                   # Application logs
└── doc/                    # Documentation
    └── changelog/          # Daily changelogs
```

## Features

### Accounts
- Multiple account types: checking, savings, investment, external, cash
- Multi-currency support (EUR, USD, GBP, CHF, CAD)
- Custom colors and icons
- Balance tracking

### Credit Cards
- Immediate or deferred debit modes
- Customizable billing cycles
- Credit limit management
- Automatic debit transaction generation
- Filter by status (active/expired) and sort by expiration date

### Transactions
- Income, expense, and transfer types
- Multiple statuses: pending, cleared, reconciled, cancelled
- Automatic categorization
- Split transactions
- Recurring transactions

### Import
- Supported formats: CSV, Excel, QIF, QFX/OFX
- Duplicate detection
- Smart reconciliation

### Reports
- Dashboard with account overview
- Expense analysis by category
- Cash flow forecasting (30/60/90 days)
- Monthly/annual reports

## API Endpoints

Base URL: `/api/v1`

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user

### Accounts
- `GET /accounts` - List accounts
- `POST /accounts` - Create account
- `GET /accounts/:id` - Get account details
- `PUT /accounts/:id` - Update account
- `DELETE /accounts/:id` - Delete account

### Credit Cards
- `GET /credit-cards` - List credit cards (supports `status`, `sortBy`, `sortOrder` params)
- `POST /credit-cards` - Create credit card
- `GET /credit-cards/:id` - Get credit card details
- `PUT /credit-cards/:id` - Update credit card
- `DELETE /credit-cards/:id` - Delete credit card
- `GET /credit-cards/:id/cycles` - Get billing cycles
- `GET /credit-cards/:id/cycles/current` - Get current cycle

### Transactions
- `GET /transactions` - List transactions (with filters)
- `POST /transactions` - Create transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

### Categories
- `GET /categories` - List categories
- `POST /categories` - Create category
- `PUT /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category

### Payees
- `GET /payees` - List payees
- `POST /payees` - Create payee
- `PUT /payees/:id` - Update payee
- `DELETE /payees/:id` - Delete payee

## Getting Started

### Installation

```bash
# Install dependencies
npm install

# Initialize database
npm run db:migrate
npm run db:seed

# Install client dependencies
cd client && npm install
```

### Development

```bash
# Start backend (with nodemon)
npm run dev

# Start frontend (in another terminal)
cd client && npm run dev
```

### Production

```bash
# Build frontend
cd client && npm run build

# Start server
npm start
```

## Environment Variables

Create a `.env` file at the project root:

```env
NODE_ENV=development
PORT=3000
SESSION_SECRET=your-secret-key
BCRYPT_ROUNDS=12
DEFAULT_CURRENCY=EUR
LOG_LEVEL=info

# Database — choose one: sqlite (default), postgres, mysql
DB_TYPE=sqlite
DB_PATH=./data/budgetos.db

# PostgreSQL (when DB_TYPE=postgres)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=budgetos
POSTGRES_USER=budgetos
POSTGRES_PASSWORD=budgetos

# MariaDB/MySQL (when DB_TYPE=mysql)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=budgetos
MYSQL_USER=budgetos
MYSQL_PASSWORD=budgetos
```

## Testing

### Unit tests (Vitest)

```bash
npm test                    # Run all unit tests
npm run test:coverage       # With coverage report
```

### Integration tests (Supertest)

```bash
npm run test:integration    # API integration tests
npm run test:all            # Unit + integration
```

### E2E browser tests (Playwright)

Requires the built frontend (`cd client && npm run build`).

```bash
npm run test:e2e            # Default (SQLite)
npm run test:e2e:headed     # With visible browser
npm run test:e2e:ui         # Playwright UI mode
```

### Multi-database E2E

Run the full E2E suite against SQLite, PostgreSQL, and MariaDB:

```bash
# Start database containers
docker compose -f docker-db/docker-compose.e2e.yml up -d --wait

# Run per database
npm run test:e2e:sqlite
npm run test:e2e:postgres
npm run test:e2e:mysql

# Run all 3 sequentially
npm run test:e2e:all-dbs

# Stop containers
docker compose -f docker-db/docker-compose.e2e.yml down
```

The `E2E_DB_TYPE` environment variable controls which database the E2E tests target. Each database uses a dedicated `budgetos_e2e_test` database that is cleaned before every run.

### Multi-database unit tests

```bash
npm run test:sqlite         # Unit tests on SQLite
npm run test:postgres       # Unit tests on PostgreSQL
npm run test:mysql          # Unit tests on MariaDB/MySQL
npm run test:all-dbs        # All 3 sequentially
```

## Security

- Password hashing with bcrypt (12 rounds)
- Session-based authentication with httpOnly cookies
- CSRF protection on all state-changing requests
- Rate limiting per IP
- Input sanitization and validation
- Helmet.js security headers
