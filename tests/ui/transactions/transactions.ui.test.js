/**
 * UI Test: Transactions (List, Create, Edit, Delete, Filters, Pagination)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least one account, category, and payee exist
 *   - Seed users:
 *     - admin@budgetos.local / Admin123! (super_admin)
 *     - manager@budgetos.local / Demo1234! (admin)
 *     - user@budgetos.local / Demo1234! (user)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 1 — PAGE DISPLAY
 * ═══════════════════════════════════════════════════════════
 *
 * 1.1 Initial page state
 *   [ ] Navigate to /transactions
 *   [ ] Page title: "Transactions" (h1)
 *   [ ] Subtitle shows operation count or "Historique de vos opérations"
 *   [ ] "Nouvelle transaction" button present with Plus icon
 *   [ ] "Rapprochement bancaire" button present with Scale icon
 *
 * 1.2 Filter bar
 *   [ ] Search input with placeholder "Rechercher" and Search icon
 *   [ ] Account dropdown: "Tous les comptes" (default)
 *   [ ] Category dropdown: "Toutes catégories" (default)
 *   [ ] Type dropdown: "Tous types" (options: Revenus, Dépenses, Virements)
 *   [ ] Status dropdown: "Tous statuts" (options: Rapprochées, Non rapprochées)
 *
 * 1.3 Date filters
 *   [ ] "Période :" label with Calendar icon
 *   [ ] Start date input and end date input with arrow separator
 *   [ ] Quick period dropdown: "Toutes les dates" (default)
 *   [ ] Quick period options: Semaine en cours, 7 derniers jours,
 *       Mois en cours, 30 derniers jours, Année en cours, 365 derniers jours
 *
 * 1.4 Transaction table
 *   [ ] Table present with sortable column headers
 *   [ ] Column headers: (type icon), Date, Description, Tiers, Catégorie, Compte, Montant, (actions)
 *   [ ] Each column header (Date, Description, Tiers, Catégorie, Compte, Montant)
 *       has sort icon (ArrowUpDown) and is clickable
 *   [ ] Transactions displayed with correct data from seed
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE TRANSACTION
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open create modal
 *   [ ] Click "Nouvelle transaction" button
 *   [ ] Modal opens with title "Nouvelle transaction"
 *   [ ] Close button (X) in top-right corner
 *
 * 2.2 Transaction type selection
 *   [ ] Three type buttons: Dépense (red, default), Revenu (green), Virement (blue)
 *   [ ] "Dépense" is selected by default with red border/bg
 *   [ ] Click "Revenu" — green border/bg, type switches
 *   [ ] Click "Virement" — blue border/bg, type switches
 *
 * 2.3 Form fields — Expense
 *   [ ] Montant: number input, step=0.01, placeholder "0.00", required
 *   [ ] Description: text input, required
 *   [ ] Date: date input, defaults to today, required
 *   [ ] Moyen de paiement (optionnel): "Carte" and "Chèque" buttons
 *   [ ] Compte: dropdown with "Veuillez sélectionner un compte", required
 *   [ ] Catégorie: SearchableSelect with "Rechercher une catégorie..."
 *   [ ] Tiers (optionnel): SearchableSelect with "Rechercher un tiers..."
 *
 * 2.4 Form fields — Transfer
 *   [ ] Switch type to "Virement"
 *   [ ] Blue background section appears with source/destination accounts
 *   [ ] "Compte source (débit) - optionnel" dropdown
 *   [ ] ArrowLeftRight icon between dropdowns
 *   [ ] "Compte destination (crédit) - optionnel" dropdown
 *   [ ] Same account cannot be selected for both source and destination (option disabled)
 *   [ ] Payment method section (Carte/Chèque) is hidden for transfers
 *
 * 2.5 Payment method — Card
 *   [ ] Set type to "Dépense"
 *   [ ] Click "Carte" button
 *   [ ] Card dropdown appears with "Sélectionner une carte"
 *   [ ] X button to clear card selection
 *   [ ] Select a card — value updates
 *
 * 2.6 Payment method — Check
 *   [ ] Click "Chèque" button
 *   [ ] Check number text input appears with placeholder "Ex: 0001234"
 *   [ ] X button to clear check number
 *   [ ] maxLength=50
 *
 * 2.7 Create expense transaction (success)
 *   [ ] Select type "Dépense"
 *   [ ] Enter amount: 42.50
 *   [ ] Enter description: "Test transaction"
 *   [ ] Date: today
 *   [ ] Select an account
 *   [ ] Select a category
 *   [ ] Click "Créer" button
 *   [ ] Modal closes
 *   [ ] Toast success: "Transaction créée avec succès"
 *   [ ] Transaction appears in the table
 *
 * 2.8 Create income transaction (success)
 *   [ ] Open modal, select "Revenu"
 *   [ ] Enter amount: 1500
 *   [ ] Enter description: "Salaire test"
 *   [ ] Select account, select income category
 *   [ ] Click "Créer"
 *   [ ] Toast success, transaction appears with green amount (+1 500,00)
 *
 * 2.9 Create transfer (success)
 *   [ ] Open modal, select "Virement"
 *   [ ] Enter amount: 200
 *   [ ] Enter description: "Virement test"
 *   [ ] Select source account
 *   [ ] Select destination account (different from source)
 *   [ ] Click "Créer"
 *   [ ] Toast success, transfer appears in table
 *
 * 2.10 Inline payee creation
 *   [ ] In modal, type a new payee name in Tiers field
 *   [ ] "Créer « ... »" option appears
 *   [ ] Click it — payee is created and selected
 *
 * 2.11 Inline category creation
 *   [ ] In modal, type a new category name in Catégorie field
 *   [ ] "Créer « ... »" option appears
 *   [ ] Click it — category is created and selected
 *
 * 2.12 Cancel modal
 *   [ ] Open modal, fill in some fields
 *   [ ] Click "Annuler" button — modal closes, no transaction created
 *   [ ] Open modal, click X button — modal closes
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT TRANSACTION
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Open edit modal
 *   [ ] Hover over a transaction row — edit (Pencil) and delete (Trash2) icons appear
 *   [ ] Click Pencil icon on a transaction
 *   [ ] Modal opens with title "Modifier la transaction"
 *   [ ] Form pre-filled with transaction data (amount, description, date, account, category, payee)
 *   [ ] Type selection reflects current transaction type
 *
 * 3.2 Edit and save
 *   [ ] Change the description to "Modified transaction"
 *   [ ] Change the amount
 *   [ ] Click "Modifier" button
 *   [ ] Modal closes
 *   [ ] Toast success: "Transaction modifiée avec succès"
 *   [ ] Updated data visible in table
 *
 * 3.3 Edit transfer accounts
 *   [ ] Edit a transfer transaction
 *   [ ] Verify source and destination accounts are correctly pre-filled
 *   [ ] Change destination account
 *   [ ] Save — toast success
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE TRANSACTION
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete with confirmation
 *   [ ] Hover over a transaction row
 *   [ ] Click Trash2 (delete) icon
 *   [ ] Browser confirm dialog appears: "Supprimer la transaction \"...\" ?"
 *   [ ] Click OK/Accept
 *   [ ] Toast success: "Transaction supprimée"
 *   [ ] Transaction removed from table
 *
 * 4.2 Cancel delete
 *   [ ] Click Trash2 icon on another transaction
 *   [ ] Click Cancel/Dismiss on the confirm dialog
 *   [ ] Transaction still present in table
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — FILTERS
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Search text
 *   [ ] Type a description keyword in search input
 *   [ ] Table filters in real-time (deferred/debounced)
 *   [ ] Clear button (X) appears in search input
 *   [ ] Click clear — search resets, all transactions show
 *
 * 5.2 Account filter
 *   [ ] Select a specific account in dropdown
 *   [ ] Only transactions for that account shown
 *   [ ] Switch back to "Tous les comptes" — all shown
 *
 * 5.3 Category filter
 *   [ ] Select a specific category
 *   [ ] Only transactions with that category shown
 *   [ ] Switch back to "Toutes catégories" — all shown
 *
 * 5.4 Type filter
 *   [ ] Select "Revenus" — only income transactions shown (green amounts)
 *   [ ] Select "Dépenses" — only expense transactions shown (red amounts)
 *   [ ] Select "Virements" — only transfer transactions shown
 *   [ ] Switch back to "Tous types" — all shown
 *
 * 5.5 Status filter
 *   [ ] Select "Rapprochées" — only reconciled transactions shown (green background)
 *   [ ] Select "Non rapprochées" — only unreconciled transactions shown
 *   [ ] Switch back to "Tous statuts" — all shown
 *
 * 5.6 Date range filter
 *   [ ] Set start date — only transactions on or after that date shown
 *   [ ] Set end date — only transactions on or before that date shown
 *   [ ] "Effacer" link appears when dates are set
 *   [ ] Click "Effacer" — dates reset
 *
 * 5.7 Quick period filter
 *   [ ] Select "Mois en cours" — start/end dates auto-fill to current month
 *   [ ] Select "7 derniers jours" — dates adjust accordingly
 *   [ ] Select "Année en cours" — dates adjust to current year
 *   [ ] Select "Toutes les dates" — dates cleared
 *
 * 5.8 Combined filters
 *   [ ] Apply search + account filter + type filter simultaneously
 *   [ ] Results correctly match all active filters
 *   [ ] "Réinitialiser" button appears when any filter is active
 *   [ ] Click "Réinitialiser" — all filters and search reset
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — PAGINATION (INFINITE SCROLL)
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Infinite scroll loading
 *   [ ] With many transactions (>10), scroll to bottom of table
 *   [ ] Loader2 spinner appears below the table
 *   [ ] More transactions load automatically
 *   [ ] Continue scrolling — additional pages load
 *
 * 6.2 All data loaded
 *   [ ] Scroll until all transactions are loaded
 *   [ ] No more spinner appears (hasNextPage is false)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — TRANSACTION TYPES DISPLAY
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 Income display
 *   [ ] Income transactions show TrendingUp icon in green circle
 *   [ ] Amount shown in green with "+" prefix (e.g., +1 500,00)
 *
 * 7.2 Expense display
 *   [ ] Expense transactions show TrendingDown icon in red circle
 *   [ ] Amount shown in red with "-" prefix (e.g., -45,90)
 *
 * 7.3 Transfer display
 *   [ ] Transfer transactions show ArrowLeftRight icon
 *   [ ] Incoming transfer (amount >= 0): green circle, green text
 *   [ ] Outgoing transfer (amount < 0): red circle, red text
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — EXPANDABLE ROWS & DETAILS
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Expandable rows
 *   [ ] Transactions with extra details show ChevronRight icon
 *   [ ] Click on expandable row — ChevronDown icon, expanded details shown below
 *   [ ] TransactionExpandedRow component renders (check number, credit card, linked account, etc.)
 *   [ ] Click again — row collapses back
 *
 * 8.2 Non-expandable rows
 *   [ ] Simple transactions (no extra details) show no chevron
 *   [ ] Clicking the row does not expand anything
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 Empty description
 *   [ ] Open create modal
 *   [ ] Leave description empty, fill other fields
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * 9.2 Zero/empty amount
 *   [ ] Open create modal
 *   [ ] Leave amount empty or set to 0
 *   [ ] Click "Créer" — HTML5 validation or backend error "Le montant ne peut pas être zéro"
 *
 * 9.3 Invalid date
 *   [ ] Open create modal
 *   [ ] Clear the date field
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * 9.4 Missing account (expense/income)
 *   [ ] Open create modal for expense
 *   [ ] Leave account on "Veuillez sélectionner un compte"
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * 9.5 Transfer — no account selected
 *   [ ] Open create modal, select "Virement"
 *   [ ] Leave both source and destination accounts empty
 *   [ ] Click "Créer" — toast error: "Veuillez sélectionner un compte"
 *
 * 9.6 Transfer — same source and destination
 *   [ ] Open modal, select "Virement"
 *   [ ] Try to select same account for source and destination
 *   [ ] Same account option should be disabled in the other dropdown
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 10 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 10.1 French (default)
 *   [ ] Page title: "Transactions"
 *   [ ] Button: "Nouvelle transaction"
 *   [ ] Table headers: "Date", "Description", "Tiers", "Catégorie", "Compte", "Montant"
 *   [ ] Filter labels: "Tous les comptes", "Toutes catégories", "Tous types", "Tous statuts"
 *   [ ] Date filter: "Période :", "Toutes les dates"
 *   [ ] Type options: "Revenus", "Dépenses", "Virements"
 *   [ ] Status options: "Rapprochées", "Non rapprochées"
 *   [ ] Modal: "Dépense", "Revenu", "Virement", "Montant", "Description",
 *       "Date", "Catégorie", "Tiers (optionnel)", "Annuler", "Créer"/"Modifier"
 *   [ ] Reconciliation: "Rapprochement bancaire"
 *
 * 10.2 English
 *   [ ] Switch locale to English in settings
 *   [ ] Page title: "Transactions"
 *   [ ] Button: "New transaction"
 *   [ ] Table headers: "Date", "Description", "Payee", "Category", "Account", "Amount"
 *   [ ] Filter labels: "All accounts", "All categories", "All types", "All statuses"
 *   [ ] Date filter: "Period:", "All dates"
 *   [ ] Type options: "Income", "Expenses", "Transfers"
 *   [ ] Status options: "Reconciled", "Not reconciled"
 *   [ ] Modal: "Expense", "Income", "Transfer", "Amount", "Description",
 *       "Date", "Category", "Payee (optional)", "Cancel", "Create"/"Edit"
 *   [ ] Reconciliation: "Bank reconciliation"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 11 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 11.1 Table loading
 *   [ ] On initial page load, spinning loader displayed in table area
 *   [ ] Loader disappears once data is loaded
 *
 * 11.2 Infinite scroll loading
 *   [ ] When scrolling to load more, Loader2 spinner below the table
 *   [ ] Spinner disappears after new page is loaded
 *
 * 11.3 Reconciliation mode
 *   [ ] Click "Rapprochement bancaire" — button text changes to "Quitter rapprochement"
 *   [ ] "Nouvelle transaction" button hidden during reconciliation mode
 *   [ ] Transaction rows show CheckCircle2 icon instead of edit/delete
 *   [ ] Click CheckCircle2 — transaction toggles reconciled (optimistic update)
 *   [ ] Reconciled rows have green background (bg-green-50)
 *   [ ] Click "Quitter rapprochement" — returns to normal mode
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 12 — EMPTY STATE
 * ═══════════════════════════════════════════════════════════
 *
 * 12.1 No transactions matching filters
 *   [ ] Apply filters that match no transactions (e.g., future date range)
 *   [ ] Table body is empty (no rows)
 *   [ ] No crash or error
 *
 * 12.2 Column sorting
 *   [ ] Click "Date" header — sort descending (default), arrow down icon
 *   [ ] Click again — sort ascending, arrow up icon
 *   [ ] Click again — reset to default (date desc)
 *   [ ] Click "Montant" header — sort by amount descending
 *   [ ] Click "Description" header — sort alphabetically
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Transactions", count "9 opération"
 *   ✅ 1.2 Buttons: "Rapprochement bancaire", "Nouvelle transaction"
 *   ✅ 1.3 Filter bar: search, account (3), category (4), type (3), status (2), date range, quick period (6 options)
 *   ✅ 1.4 Table headers: DATE, DESCRIPTION, TIERS, CATÉGORIE, COMPTE, MONTANT
 *   ✅ 1.5 9 rows displayed: dates, descriptions, categories, accounts, amounts correct
 *          Income (Salary) with "+" prefix ✅, expenses negative ✅
 *   ✅ 1.6 Each row has edit/delete buttons
 *
 * STEP 2-12 — CRUD/filters/i18n: ⬜ Not tested in detail
 * FR labels confirmed ✅
 *
 */
