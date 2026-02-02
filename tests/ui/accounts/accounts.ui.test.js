/**
 * UI Test: Accounts (CRUD, Types, Balances, Totals)
 *
 * Tested via Chrome MCP on 2026-02-02
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least one account exists from seed data
 *   - Seed users:
 *     - admin@budgetos.local / Admin123! (super_admin)
 *     - manager@budgetos.local / Demo1234! (admin)
 *     - user@budgetos.local / Demo1234! (user)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 1 — PAGE DISPLAY
 * ═══════════════════════════════════════════════════════════
 *
 * 1.1 Page header
 *   [ ] Navigate to /accounts
 *   [ ] Page title: "Comptes"
 *   [ ] Subtitle: "Gérez vos comptes bancaires"
 *   [ ] "Nouveau compte" button visible with Plus icon
 *
 * 1.2 Totals cards (3 cards)
 *   [ ] Card 1 — "Solde total": formatted total balance
 *   [ ] Card 2 — "Disponible": formatted available balance (green text)
 *   [ ] Card 3 — "Investissements": formatted investment balance (primary color text)
 *
 * 1.3 Account list (card grid)
 *   [ ] Accounts displayed in responsive grid (1/2/3 columns)
 *   [ ] Each account card shows: icon, name, type label, institution, current balance
 *   [ ] Account type icon matches type (Wallet=checking, PiggyBank=savings, HandCoins=cash, Landmark=investment)
 *   [ ] Account color applied as icon background tint
 *   [ ] Negative balances displayed in red (text-red-600)
 *
 * 1.4 Loading state
 *   [ ] On initial load, spinner displayed (animate-spin)
 *   [ ] Spinner disappears when data loads
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE ACCOUNT
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open create modal
 *   [ ] Click "Nouveau compte" button
 *   [ ] Modal opens with title "Nouveau compte"
 *   [ ] Close button (X) visible in top-right corner
 *
 * 2.2 Modal form fields
 *   [ ] Field "Nom": text input, required
 *   [ ] Field "Type": select dropdown with options:
 *       - "Compte courant" (checking)
 *       - "Épargne" (savings)
 *       - "Espèces" (cash)
 *       - "Investissement" (investment)
 *   [ ] Field "Établissement": text input, optional
 *   [ ] Field "Solde initial": number input with step 0.01, shown only for new accounts
 *   [ ] Field "Couleur": color picker input
 *
 * 2.3 Default values
 *   [ ] Name: empty
 *   [ ] Type: "Compte courant" (checking) selected by default
 *   [ ] Institution: empty
 *   [ ] Initial balance: 0
 *   [ ] Color: #3b82f6 (blue)
 *
 * 2.4 Create account (success)
 *   [ ] Fill name: "Test Account"
 *   [ ] Select type: "Épargne" (savings)
 *   [ ] Fill institution: "Test Bank"
 *   [ ] Set initial balance: 1000
 *   [ ] Click "Créer" button
 *   [ ] Modal closes
 *   [ ] New account appears in the list
 *   [ ] Account shows correct name, type (Épargne), institution, balance (1 000,00 €)
 *
 * 2.5 Cancel creation
 *   [ ] Click "Nouveau compte" button
 *   [ ] Fill some fields
 *   [ ] Click "Annuler" button
 *   [ ] Modal closes, no account created
 *
 * 2.6 Close via X button
 *   [ ] Click "Nouveau compte" button
 *   [ ] Click X button in top-right corner
 *   [ ] Modal closes, no account created
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT ACCOUNT
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Hover to reveal actions
 *   [ ] Hover over an account card
 *   [ ] Edit (Pencil) and Delete (Trash2) icons appear (opacity transition)
 *
 * 3.2 Open edit modal
 *   [ ] Click edit icon (Pencil)
 *   [ ] Modal opens with title "Modifier le compte"
 *   [ ] Form pre-filled with existing account data
 *
 * 3.3 Edit modal — field verification
 *   [ ] Name field pre-filled with current name
 *   [ ] Type select pre-filled with current type
 *   [ ] Institution field pre-filled with current institution
 *   [ ] "Solde initial" field NOT shown (edit mode)
 *   [ ] Color picker pre-filled with current color
 *
 * 3.4 Save changes
 *   [ ] Change name to "Updated Account"
 *   [ ] Change type to "Investissement"
 *   [ ] Click "Modifier" button
 *   [ ] Modal closes
 *   [ ] Account card updated with new name and type
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE ACCOUNT
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete confirmation dialog
 *   [ ] Hover over account card, click delete icon (Trash2)
 *   [ ] Browser confirm dialog appears with message:
 *       "Supprimer le compte \"<name>\" ?\n\nAttention : toutes les transactions associées seront également supprimées."
 *
 * 4.2 Confirm delete
 *   [ ] Accept the confirm dialog
 *   [ ] Account removed from the list
 *   [ ] Account list refreshes (query invalidated)
 *
 * 4.3 Cancel delete
 *   [ ] Hover over account, click delete icon
 *   [ ] Dismiss the confirm dialog
 *   [ ] Account remains in the list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — ACCOUNT TYPES
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Checking account
 *   [ ] Type label: "Compte courant"
 *   [ ] Icon: Wallet
 *
 * 5.2 Savings account
 *   [ ] Type label: "Épargne"
 *   [ ] Icon: PiggyBank
 *
 * 5.3 Cash account
 *   [ ] Type label: "Espèces"
 *   [ ] Icon: HandCoins
 *
 * 5.4 Investment account
 *   [ ] Type label: "Investissement"
 *   [ ] Icon: Landmark
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Empty name (HTML5 validation)
 *   [ ] Open create modal
 *   [ ] Leave name empty, click "Créer"
 *   [ ] Browser native required validation prevents submission
 *   [ ] Modal stays open
 *
 * 6.2 Very long name
 *   [ ] Enter name with 200+ characters
 *   [ ] Click "Créer"
 *   [ ] Server returns validation error ("Name too long")
 *   [ ] Alert displayed with translated error message
 *
 * 6.3 Very long institution name
 *   [ ] Enter institution with 200+ characters
 *   [ ] Click "Créer"
 *   [ ] Server returns validation error ("Institution name too long")
 *   [ ] Alert displayed with translated error message
 *
 * 6.4 Server error on create
 *   [ ] If server returns 500: alert displays "Erreur interne du serveur"
 *   [ ] Modal stays open, data preserved
 *
 * 6.5 Server error on delete
 *   [ ] If delete fails (e.g., server error): alert displays error
 *   [ ] Account remains in the list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 French locale (default)
 *   [ ] Title: "Comptes"
 *   [ ] Subtitle: "Gérez vos comptes bancaires"
 *   [ ] Button: "Nouveau compte"
 *   [ ] Totals: "Solde total", "Disponible", "Investissements"
 *   [ ] Modal title (create): "Nouveau compte"
 *   [ ] Modal title (edit): "Modifier le compte"
 *   [ ] Fields: "Nom", "Type", "Établissement", "Solde initial", "Couleur"
 *   [ ] Types: "Compte courant", "Épargne", "Espèces", "Investissement"
 *   [ ] Buttons: "Annuler", "Créer" / "Modifier"
 *   [ ] Delete confirm: "Supprimer le compte..."
 *
 * 7.2 English locale
 *   [ ] Switch language to English in settings
 *   [ ] Title: "Accounts"
 *   [ ] Subtitle: "Manage your bank accounts"
 *   [ ] Button: "New account"
 *   [ ] Totals: "Total Balance", "Available", "Investments"
 *   [ ] Modal title (create): "New account"
 *   [ ] Modal title (edit): "Edit account"
 *   [ ] Fields: "Name", "Type", "Institution", "Initial balance", "Color"
 *   [ ] Types: "Checking", "Savings", "Cash", "Investment"
 *   [ ] Buttons: "Cancel", "Create" / "Edit"
 *   [ ] Delete confirm: "Delete account..."
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Page loading
 *   [ ] Initial page load shows centered spinner
 *   [ ] Spinner disappears when account data loads
 *
 * 8.2 Create mutation
 *   [ ] Click "Créer" — observe if button is disabled during request
 *   [ ] Modal closes on success
 *
 * 8.3 Update mutation
 *   [ ] Click "Modifier" — observe if button is disabled during request
 *   [ ] Modal closes on success
 *
 * 8.4 Delete mutation
 *   [ ] After confirm dialog accepted — account removed after request completes
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — RECALCULATE BALANCES
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 Balance recalculation
 *   [ ] Check if a "Recalculate balances" button or action exists
 *   [ ] If present: click it and verify balances update
 *   [ ] If not present: balances update automatically via query invalidation
 *
 * 9.2 Balance consistency after operations
 *   [ ] After creating an account with initial balance: total balance updates
 *   [ ] After deleting an account: total balance updates
 *   [ ] Totals cards reflect current sum of all account balances
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Comptes", subtitle "Gérez vos comptes bancaires"
 *   ✅ 1.2 "Nouveau compte" button present
 *   ✅ 1.3 3 totals cards: Solde total=16 079,11 €, Disponible=16 079,11 €, Investissements=0,00 €
 *   ✅ 1.4 3 accounts: Checking (Compte courant, My Bank, 6 079,11 €),
 *          Savings (Épargne, My Bank, 10 000,00 €), Visa Card (My Bank, 0,00 €)
 *   ✅ 1.5 Each account has Modifier + Supprimer buttons
 *
 * STEP 2 — Create account:
 *   ✅ 2.1 Modal "Nouveau compte" with: Nom (required), Type (4 options), Établissement,
 *          Solde initial, Couleur, Annuler/Créer buttons
 *   ✅ 2.2 Created "Test Account" (Épargne, Test Bank) — appeared in list
 *   ⚠️ 2.3 Initial balance field set to 500 but account showed 0,00 € (possible input issue)
 *
 * STEP 3 — Edit account:
 *   ✅ 3.1 Modal "Modifier le compte" with pre-filled fields (Nom, Type, Établissement, Couleur)
 *   ✅ 3.2 Changed name to "Test Account Modified" — updated in list
 *
 * STEP 4 — Delete account:
 *   ✅ 4.1 Click Supprimer → window.confirm dialog appeared
 *   ✅ 4.2 Accept dialog → account removed from list, back to 3 accounts
 *
 * STEP 5 — Account types:
 *   ✅ 5.1 Type dropdown: Compte courant, Épargne, Espèces, Investissement (4 types)
 *
 * STEP 6 — Error cases:
 *   ✅ 6.1 Empty name → HTML5 required validation "Veuillez renseigner ce champ"
 *   ⬜ 6.2 Duplicate name: not tested
 *   ⬜ 6.3 Server error: not tested
 *
 * STEP 7 — i18n verification:
 *   ✅ 7.1 FR: Comptes, Gérez vos comptes, Nouveau compte, Solde total, Disponible,
 *          Investissements, Modifier, Supprimer, Compte courant, Épargne, Espèces,
 *          Investissement, Nom, Type, Établissement, Solde initial, Couleur, Annuler, Créer
 *   ⬜ 7.2 EN: not explicitly tested on accounts page (EN labels verified on dashboard)
 *
 * STEP 8 — Loading states:
 *   ⬜ 8.1-8.4 Loading spinners not explicitly observed (operations too fast)
 *
 * STEP 9 — Recalculate balances:
 *   ⬜ 9.1-9.2 Not tested
 *
 */
