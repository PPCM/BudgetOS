<div align="center">

# BudgetOS

**Self-hosted personal finance management for individuals and families**

[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-supported-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-supported-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MariaDB](https://img.shields.io/badge/MariaDB-supported-003545?logo=mariadb&logoColor=white)](https://mariadb.org/)
[![License](https://img.shields.io/badge/License-PolyForm_NC_1.0-blue)](#license)

[Quick Start](#-quick-start) | [Features](#-features) | [Screenshots](#-screenshots) | [Documentation](#-documentation)

</div>

---

## Features

### Core Finance
- **Bank Accounts** — Checking, savings, investment, and credit card accounts with color coding
- **Transactions** — Full CRUD with search, filters, sorting, date ranges, and expandable details
- **Credit Cards** — Immediate and deferred debit types with customizable billing cycles
- **Recurring Transactions** — Scheduled operations with multiple frequencies (daily, weekly, monthly, yearly)

### Import & Reconciliation
- **Bank Import** — CSV, Excel (.xlsx), QIF, OFX/QFX file support with smart column mapping
- **Auto-Reconciliation** — Duplicate detection and automatic matching of imported transactions
- **Manual Reconciliation** — Dedicated mode for reconciling transactions against bank statements

### Organization
- **Categories** — Three-column layout (Income, Expenses, Transfers) with icons, colors, and import/export
- **Payees** — Manage merchants and beneficiaries with logos and alias learning
- **Categorization Rules** — Automatic transaction classification based on customizable conditions

### Analytics
- **Dashboard** — Financial overview with balance summary, account list, category donut chart, and recent transactions
- **Trend Reports** — Income vs. expenses bar chart over 12 months
- **Category Reports** — Spending breakdown with donut chart and detailed table
- **Forecast** — Cash flow projections at 30, 60, and 90 days

### Administration
- **Multi-User** — Role-based access control (Super Admin, Admin, User)
- **User Management** — Create, edit, suspend users; role assignment
- **Group Management** — Organize users into groups
- **System Settings** — Public registration toggle, default group configuration
- **Bootstrap Flow** — Guided first-user setup when database is empty

### Security
- HTTP sessions with secure cookies
- CSRF protection
- Rate limiting
- Helmet security headers
- Strict input validation (Zod)
- bcrypt password hashing
- User data isolation

---

## Screenshots

| Dashboard | Transactions |
|:-:|:-:|
| ![Dashboard](doc/images/dashboard.png) | ![Transactions](doc/images/transactions.png) |

| Bank Import | Reports |
|:-:|:-:|
| ![Import](doc/images/import.png) | ![Reports](doc/images/reports-trend.png) |

> See all screenshots in the [User Guide](doc/user-guide.md).

---

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd BudgetOS
npm install

# Configure
cp .env.example .env

# Initialize database and seed demo data
npm run db:migrate
npm run db:seed

# Build frontend and start
./budgetos.sh build
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- **Email**: `admin@budgetos.local`
- **Password**: `Admin123!`

> For a fresh start without demo data, skip `npm run db:seed` — BudgetOS will guide you through creating your first admin account.

---

## Database Support

BudgetOS supports three database backends via [Knex.js](https://knexjs.org/):

| Database | Driver | Best for | Configuration |
|----------|--------|----------|---------------|
| **SQLite** | better-sqlite3 | Development, single-user | `DB_TYPE=sqlite` (default) |
| **PostgreSQL** | pg | Production, multi-user | `DB_TYPE=postgres` |
| **MariaDB / MySQL** | mysql2 | Production, multi-user | `DB_TYPE=mysql` |

Set `DB_TYPE` in your `.env` file. See the [Admin Guide](doc/admin-guide.md#database-setup) for detailed setup instructions.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express, Knex.js |
| **Frontend** | React 18, Vite, TailwindCSS, Recharts |
| **Validation** | Zod (backend), HTML5 (frontend) |
| **Icons** | lucide-react |
| **State** | TanStack React Query |
| **Testing** | Vitest, Supertest, Playwright |

---

## Project Structure

```
BudgetOS/
├── src/                    # Backend (Node.js / Express)
│   ├── controllers/        # API controllers
│   ├── models/             # Data models (Knex)
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── middleware/          # Auth, error handling
│   ├── validators/         # Zod schemas
│   └── database/           # Migrations & seeds
├── client/                 # Frontend (React / Vite)
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable components
│       ├── contexts/       # React contexts
│       └── lib/            # API client, utilities
├── tests/                  # Backend tests
├── e2e/                    # Playwright E2E tests
├── docker/                 # Docker Compose (test DBs)
├── doc/                    # Documentation
└── budgetos.sh             # Server management script
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Guide](doc/user-guide.md) | Complete guide for end users with screenshots |
| [Admin Guide](doc/admin-guide.md) | Installation, configuration, user management |
| [CLI Reference](doc/budgetos-cli.md) | Server management script documentation |
| [Bank Reconciliation](doc/bank-reconciliation.md) | Reconciliation workflow details |

---

## Testing

```bash
# Unit tests
npm test

# Integration tests (SQLite in-memory)
npm run test:integration

# Unit + integration
npm run test:all

# E2E browser tests (Playwright)
npm run test:e2e

# Full test suite across all 3 databases
npm run test:global
```

See the [Admin Guide](doc/admin-guide.md#testing) for multi-database test setup with Docker.

---

## Server Management

```bash
./budgetos.sh start       # Start in background
./budgetos.sh stop        # Graceful shutdown
./budgetos.sh restart     # Restart
./budgetos.sh status      # Check status
./budgetos.sh build       # Build frontend + restart
./budgetos.sh reset       # Reset SQLite + re-seed
./budgetos.sh logs        # View recent logs
./budgetos.sh logs:follow # Follow logs in real-time
```

---

## License

[PolyForm Noncommercial 1.0.0](LICENSE)
