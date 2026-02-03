# BudgetOS Developer Guide

Technical reference for developers contributing to or extending BudgetOS.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Development Setup](#development-setup)
4. [Testing](#testing)
5. [Server Management](#server-management)
6. [API Endpoints](#api-endpoints)

---

## Tech Stack

### Backend

| Component | Technology |
|-----------|------------|
| Runtime | Node.js >= 18.0.0 |
| Framework | Express.js |
| Database | Knex.js (SQLite, PostgreSQL, MariaDB) |
| Validation | Zod |
| Authentication | express-session + bcrypt |
| Security | Helmet, CSRF, rate limiting |

### Frontend

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Build Tool | Vite |
| Routing | React Router 6 |
| State | TanStack React Query |
| Styling | TailwindCSS |
| Charts | Recharts |
| Icons | lucide-react |

---

## Project Structure

```
BudgetOS/
├── src/                    # Backend (Node.js / Express)
│   ├── config/             # Configuration files
│   ├── controllers/        # API controllers
│   ├── models/             # Data models (Knex)
│   ├── services/           # Business logic
│   ├── routes/             # API routes
│   ├── middleware/         # Auth, error handling, validation
│   ├── validators/         # Zod schemas
│   ├── database/           # Migrations & seeds
│   └── utils/              # Utility functions
├── client/                 # Frontend (React / Vite)
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable components
│       ├── contexts/       # React contexts
│       └── lib/            # API client, utilities
├── tests/                  # Backend tests
│   ├── unit/               # Unit tests (mirrors src/)
│   └── integration/        # API integration tests
├── client/tests/unit/      # Frontend unit tests
├── e2e/                    # Playwright E2E tests
├── docker/                 # Application Docker image
├── docker-db/              # Docker Compose (test databases)
├── data/                   # SQLite database (gitignored)
├── uploads/                # User uploads
├── logs/                   # Application logs
└── doc/                    # Documentation
```

---

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (optional, for PostgreSQL/MariaDB)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd BudgetOS

# Install dependencies
npm install

# Copy environment config
cp .env.example .env

# Run database migrations
npm run db:migrate

# (Optional) Seed demo data
npm run db:seed
```

### Development Mode

```bash
# Start backend with hot reload
npm run dev

# Start frontend (separate terminal)
cd client && npm run dev
```

### Production Build

```bash
# Build frontend and start server
./budgetos.sh build
```

---

## Testing

### Test Commands

```bash
# Unit tests (backend)
npm test

# Integration tests (SQLite in-memory)
npm run test:integration

# Unit + integration
npm run test:all

# E2E browser tests (Playwright)
npm run test:e2e

# Full suite across all 3 databases
npm run test:global
```

### Multi-Database Testing

BudgetOS supports three database backends. To test against PostgreSQL and MariaDB:

```bash
# Start test database containers
docker compose -f docker-db/docker-compose.mariadb.yml up -d
docker compose -f docker-db/docker-compose.postgres.yml up -d

# Create test databases
docker exec budgetos-mariadb mariadb -uroot -pbudgetos_root \
  -e "CREATE DATABASE IF NOT EXISTS budgetos_test; GRANT ALL PRIVILEGES ON budgetos_test.* TO 'budgetos'@'%';"

docker exec budgetos-postgres psql -U budgetos -d postgres \
  -c "CREATE DATABASE budgetos_test OWNER budgetos;"

# Run integration tests on specific database
TEST_DB_CLIENT=mysql2 MYSQL_DB=budgetos_test npm run test:integration
TEST_DB_CLIENT=pg POSTGRES_DB=budgetos_test npm run test:integration
```

### E2E Tests

```bash
# Start test databases
docker compose -f docker-db/docker-compose.e2e.yml up -d --wait

# Run on all databases
npm run test:e2e:all-dbs

# Run on a specific database
npm run test:e2e:sqlite
npm run test:e2e:postgres
npm run test:e2e:mysql

# Stop containers
docker compose -f docker-db/docker-compose.e2e.yml down
```

### Global Test Suite

```bash
npm run test:global
```

**Warning**: The SQLite database is automatically deleted at the end, so the application starts in bootstrap mode afterward. Either:
- Run `npm run db:seed` to restore demo data
- Register a new admin account through the UI

---

## Server Management

BudgetOS includes a management script for common operations.

```bash
./budgetos.sh <command>
```

| Command | Description |
|---------|-------------|
| `start` | Start the server in background |
| `stop` | Graceful shutdown |
| `restart` | Stop then start |
| `status` | Show server status (PID, port) |
| `build` | Build frontend (Vite) and restart server |
| `reset` | Delete SQLite database and re-seed |
| `logs [n]` | Show last n lines of log (default: 50) |
| `logs:follow` | Follow logs in real-time |
| `help` | Show help |

### Files

| File | Purpose |
|------|---------|
| `data/budgetos.pid` | Server PID file |
| `data/budgetos.log` | Server log file |

For detailed CLI documentation, see [budgetos-cli.md](budgetos-cli.md).

---

## API Endpoints

Base URL: `/api/v1`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | User registration |
| POST | `/auth/login` | User login |
| POST | `/auth/logout` | User logout |
| GET | `/auth/me` | Get current user |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List accounts |
| POST | `/accounts` | Create account |
| GET | `/accounts/:id` | Get account details |
| PUT | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Delete account |

### Credit Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credit-cards` | List credit cards |
| POST | `/credit-cards` | Create credit card |
| GET | `/credit-cards/:id` | Get credit card details |
| PUT | `/credit-cards/:id` | Update credit card |
| DELETE | `/credit-cards/:id` | Delete credit card |
| GET | `/credit-cards/:id/cycles` | Get billing cycles |
| GET | `/credit-cards/:id/cycles/current` | Get current cycle |

### Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List transactions (with filters) |
| POST | `/transactions` | Create transaction |
| PUT | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |

### Payees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payees` | List payees |
| POST | `/payees` | Create payee |
| PUT | `/payees/:id` | Update payee |
| DELETE | `/payees/:id` | Delete payee |

### Planned Transactions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/planned-transactions` | List recurring transactions |
| POST | `/planned-transactions` | Create recurring transaction |
| PUT | `/planned-transactions/:id` | Update recurring transaction |
| DELETE | `/planned-transactions/:id` | Delete recurring transaction |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/trend` | Income vs expenses (12 months) |
| GET | `/reports/categories` | Expense breakdown by category |
| GET | `/reports/forecast` | Cash flow forecast |

### Administration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List users (admin only) |
| POST | `/admin/users` | Create user |
| PUT | `/admin/users/:id` | Update user |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/groups` | List groups |
| POST | `/admin/groups` | Create group |
| PUT | `/admin/groups/:id` | Update group |
| DELETE | `/admin/groups/:id` | Delete group |
| GET | `/admin/settings` | Get system settings |
| PUT | `/admin/settings` | Update system settings |

---

*For installation and user management, see the [Admin Guide](admin-guide.md).*
*For end-user documentation, see the [User Guide](user-guide.md).*
