-- BudgetOS Database Schema
-- SQLite version

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    locale TEXT DEFAULT 'fr',
    currency TEXT DEFAULT 'EUR',
    timezone TEXT DEFAULT 'Europe/Paris',
    is_active INTEGER DEFAULT 1,
    email_verified INTEGER DEFAULT 0,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- ACCOUNTS
-- ============================================

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'cash', 'investment', 'external', 'credit_card')),
    institution TEXT,
    account_number TEXT,
    initial_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'EUR',
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'wallet',
    is_active INTEGER DEFAULT 1,
    is_included_in_total INTEGER DEFAULT 1,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(type);

-- ============================================
-- CREDIT CARDS
-- ============================================

CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    linked_account_id TEXT, -- Compte courant lié pour le débit
    name TEXT NOT NULL,
    card_number_last4 TEXT,
    debit_type TEXT NOT NULL CHECK (debit_type IN ('immediate', 'deferred')),
    -- Configuration débit différé
    cycle_start_day INTEGER DEFAULT 1 CHECK (cycle_start_day BETWEEN 1 AND 28),
    debit_day INTEGER CHECK (debit_day BETWEEN 1 AND 28),
    debit_days_before_end INTEGER CHECK (debit_days_before_end BETWEEN 0 AND 10),
    -- Limites
    credit_limit REAL,
    -- Paramètres
    has_dedicated_account INTEGER DEFAULT 0,
    auto_generate_debit INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    color TEXT DEFAULT '#EF4444',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX idx_credit_cards_account_id ON credit_cards(account_id);

-- ============================================
-- CREDIT CARD CYCLES
-- ============================================

CREATE TABLE IF NOT EXISTS credit_card_cycles (
    id TEXT PRIMARY KEY,
    credit_card_id TEXT NOT NULL,
    cycle_start_date TEXT NOT NULL,
    cycle_end_date TEXT NOT NULL,
    debit_date TEXT NOT NULL,
    total_amount REAL DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'debited')),
    debit_transaction_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (debit_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_credit_card_cycles_card_id ON credit_card_cycles(credit_card_id);
CREATE INDEX idx_credit_card_cycles_dates ON credit_card_cycles(cycle_start_date, cycle_end_date);

-- ============================================
-- CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- NULL pour les catégories système
    parent_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    icon TEXT DEFAULT 'tag',
    color TEXT DEFAULT '#6B7280',
    is_system INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    budget_monthly REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_type ON categories(type);

-- ============================================
-- PAYEES (Tiers)
-- ============================================

CREATE TABLE IF NOT EXISTS payees (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_payees_user_id ON payees(user_id);
CREATE INDEX idx_payees_name ON payees(name);

-- ============================================
-- TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    payee_id TEXT,
    credit_card_id TEXT,
    credit_card_cycle_id TEXT,
    -- Montant et description
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    -- Dates
    date TEXT NOT NULL,
    value_date TEXT, -- Date de valeur bancaire
    purchase_date TEXT, -- Date d'achat (pour cartes)
    accounting_date TEXT, -- Date de comptabilisation
    -- Statut
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'cleared', 'reconciled', 'void')),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    -- Récurrence
    is_recurring INTEGER DEFAULT 0,
    recurring_id TEXT,
    -- Import
    import_id TEXT,
    import_hash TEXT, -- Hash pour détecter les doublons
    external_id TEXT, -- ID de la banque
    -- Rapprochement
    is_reconciled INTEGER DEFAULT 0,
    reconciled_at TEXT,
    -- Split (transaction ventilée)
    is_split INTEGER DEFAULT 0,
    parent_transaction_id TEXT,
    -- Pièces jointes
    has_attachments INTEGER DEFAULT 0,
    -- Métadonnées
    tags TEXT, -- JSON array
    metadata TEXT, -- JSON object
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (payee_id) REFERENCES payees(id) ON DELETE SET NULL,
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (credit_card_cycle_id) REFERENCES credit_card_cycles(id) ON DELETE SET NULL,
    FOREIGN KEY (recurring_id) REFERENCES planned_transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_payee_id ON transactions(payee_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_credit_card_id ON transactions(credit_card_id);
CREATE INDEX idx_transactions_import_hash ON transactions(import_hash);

-- ============================================
-- TRANSACTION SPLITS (Ventilation)
-- ============================================

CREATE TABLE IF NOT EXISTS transaction_splits (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    category_id TEXT,
    amount REAL NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);

-- ============================================
-- PLANNED TRANSACTIONS (Récurrences)
-- ============================================

CREATE TABLE IF NOT EXISTS planned_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    category_id TEXT,
    credit_card_id TEXT,
    -- Montant et description
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
    -- Destination pour les virements
    to_account_id TEXT,
    -- Planification
    frequency TEXT NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    next_occurrence TEXT,
    day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    -- Options
    auto_create INTEGER DEFAULT 0,
    execute_before_holiday INTEGER DEFAULT 0,
    days_before_create INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    last_created_at TEXT,
    occurrences_created INTEGER DEFAULT 0,
    max_occurrences INTEGER,
    -- Métadonnées
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_planned_transactions_user_id ON planned_transactions(user_id);
CREATE INDEX idx_planned_transactions_next_occurrence ON planned_transactions(next_occurrence);
CREATE INDEX idx_planned_transactions_account_id ON planned_transactions(account_id);

-- ============================================
-- IMPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS imports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'excel', 'qif', 'qfx', 'ofx')),
    file_size INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    -- Statistiques
    total_rows INTEGER DEFAULT 0,
    imported_count INTEGER DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    -- Configuration utilisée
    config TEXT, -- JSON avec les mappings de colonnes
    -- Résultats
    error_details TEXT, -- JSON array des erreurs
    processing_log TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_imports_user_id ON imports(user_id);
CREATE INDEX idx_imports_account_id ON imports(account_id);
CREATE INDEX idx_imports_status ON imports(status);

-- ============================================
-- RECONCILIATION MATCHES
-- ============================================

CREATE TABLE IF NOT EXISTS reconciliation_matches (
    id TEXT PRIMARY KEY,
    import_id TEXT NOT NULL,
    imported_transaction_id TEXT NOT NULL,
    matched_transaction_id TEXT,
    match_score INTEGER DEFAULT 0,
    match_type TEXT CHECK (match_type IN ('exact', 'probable', 'manual', 'none')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'new')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (import_id) REFERENCES imports(id) ON DELETE CASCADE,
    FOREIGN KEY (imported_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX idx_reconciliation_matches_import_id ON reconciliation_matches(import_id);

-- ============================================
-- RULES (Auto-catégorisation)
-- ============================================

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    -- Conditions (JSON)
    conditions TEXT NOT NULL,
    -- Actions
    action_category_id TEXT,
    action_tags TEXT, -- JSON array
    action_notes TEXT,
    -- Statistiques
    times_applied INTEGER DEFAULT 0,
    last_applied_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (action_category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_rules_user_id ON rules(user_id);
CREATE INDEX idx_rules_priority ON rules(priority);

-- ============================================
-- ATTACHMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

CREATE INDEX idx_attachments_transaction_id ON attachments(transaction_id);

-- ============================================
-- CATEGORY LEARNING (Apprentissage)
-- ============================================

CREATE TABLE IF NOT EXISTS category_learning (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern TEXT NOT NULL, -- Motif normalisé
    category_id TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    times_used INTEGER DEFAULT 1,
    last_used_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(user_id, pattern)
);

CREATE INDEX idx_category_learning_user_id ON category_learning(user_id);
CREATE INDEX idx_category_learning_pattern ON category_learning(pattern);

-- ============================================
-- USER SETTINGS
-- ============================================

CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    -- Préférences d'affichage
    date_format TEXT DEFAULT 'dd/MM/yyyy',
    number_format TEXT DEFAULT 'fr-FR',
    week_start_day INTEGER DEFAULT 1, -- 0=Dim, 1=Lun
    -- Préférences de tableau de bord
    dashboard_layout TEXT, -- JSON
    default_account_id TEXT,
    -- Notifications
    email_notifications INTEGER DEFAULT 1,
    notify_low_balance INTEGER DEFAULT 1,
    low_balance_threshold REAL DEFAULT 100,
    notify_upcoming_bills INTEGER DEFAULT 1,
    bills_reminder_days INTEGER DEFAULT 3,
    -- Import
    default_import_config TEXT, -- JSON
    -- Autres
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (default_account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

-- ============================================
-- BUDGETS
-- ============================================

CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    category_id TEXT,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'annual')),
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    rollover INTEGER DEFAULT 0, -- Reporter le solde
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_category_id ON budgets(category_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Mise à jour automatique de updated_at
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_accounts_timestamp 
    AFTER UPDATE ON accounts
    BEGIN
        UPDATE accounts SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_transactions_timestamp 
    AFTER UPDATE ON transactions
    BEGIN
        UPDATE transactions SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_credit_cards_timestamp 
    AFTER UPDATE ON credit_cards
    BEGIN
        UPDATE credit_cards SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_categories_timestamp 
    AFTER UPDATE ON categories
    BEGIN
        UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_planned_transactions_timestamp 
    AFTER UPDATE ON planned_transactions
    BEGIN
        UPDATE planned_transactions SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_imports_timestamp 
    AFTER UPDATE ON imports
    BEGIN
        UPDATE imports SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_rules_timestamp 
    AFTER UPDATE ON rules
    BEGIN
        UPDATE rules SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_budgets_timestamp 
    AFTER UPDATE ON budgets
    BEGIN
        UPDATE budgets SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_user_settings_timestamp 
    AFTER UPDATE ON user_settings
    BEGIN
        UPDATE user_settings SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
