/**
 * UI Test: Planned/Recurring Transactions (CRUD, Frequencies, Upcoming)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least one account and category exist
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
 *   [ ] Navigate to /planned-transactions
 *   [ ] Page title: "Transactions recurrentes" (FR) / "Recurring Transactions" (EN)
 *   [ ] Subtitle: "Gerez vos operations automatiques"
 *   [ ] "Nouvelle" button present with Plus icon
 *
 * 1.2 Page layout
 *   [ ] Two-panel layout: 1/3 left (upcoming) + 2/3 right (list)
 *   [ ] Grid: grid-cols-1 lg:grid-cols-3
 *
 * 1.3 Upcoming panel
 *   [ ] Title: "A venir (30 jours)" with Clock icon
 *   [ ] Shows upcoming transactions (next 30 days, max 10)
 *   [ ] Each item shows: type icon (colored), description, next date, payee, amount
 *   [ ] Income items: green icon (TrendingUp), green amount
 *   [ ] Expense items: red icon (TrendingDown), red amount
 *   [ ] Transfer items: blue icon (ArrowLeftRight), blue amount
 *   [ ] Payee shown with avatar or Users icon
 *   [ ] Transfer shows: "accountName -> toAccountName"
 *
 * 1.4 Planned list panel
 *   [ ] Title: "Liste des transactions recurrentes" with Repeat icon
 *   [ ] Each item shows: type icon, description, frequency label, payee, category, next occurrence, amount
 *   [ ] Edit (Pencil) and Delete (Trash2) buttons appear on hover
 *   [ ] Ended transactions have gray background (bg-gray-200) and "Terminee" badge
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE PLANNED TRANSACTION
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open creation modal
 *   [ ] Click "Nouvelle" button
 *   [ ] Modal opens with title "Nouvelle transaction recurrente" (FR)
 *   [ ] Close (X) button in header
 *   [ ] Modal scrollable (max-h-[90vh] overflow-y-auto)
 *
 * 2.2 Modal form fields — Type selection
 *   [ ] Three type buttons: "Depense" (red, default), "Revenu" (green), "Virement" (blue)
 *   [ ] Each button has icon: TrendingDown, TrendingUp, ArrowLeftRight
 *   [ ] Selected type has colored border and background
 *
 * 2.3 Modal form fields — Common fields
 *   [ ] "Montant" — number input, step=0.01, required, placeholder "0.00"
 *       Large centered text (text-xl font-bold)
 *   [ ] "Description" — text input, required, placeholder "Ex: Loyer, Salaire..."
 *   [ ] "Compte" — select dropdown with all accounts, required
 *   [ ] "Frequence" — select dropdown with options:
 *       "Une fois", "Quotidien", "Hebdomadaire", "Bi-hebdomadaire",
 *       "Mensuel", "Bimestriel", "Trimestriel", "Semestriel", "Annuel"
 *   [ ] "Date de debut" — date input, required, defaults to today
 *   [ ] "Date de fin (optionnel)" — date input, min=startDate
 *   [ ] "Categorie" — SearchableSelect with category list (filtered by type)
 *       Can create new category on-the-fly
 *   [ ] "Tiers (optionnel)" — SearchableSelect with payee list
 *       Can create new payee on-the-fly
 *   [ ] "Execution le dernier jour ouvre avant echeance" — checkbox
 *   [ ] Buttons: "Annuler", "Creer"
 *
 * 2.4 Transfer-specific fields
 *   [ ] Select "Virement" type
 *   [ ] Account section changes to blue background (bg-blue-50)
 *   [ ] "Compte source (debit)" — select dropdown
 *   [ ] ArrowLeftRight icon between source and destination
 *   [ ] "Compte destination (credit) - optionnel" — select dropdown
 *       Default option: "Aucun (virement externe)"
 *       Source and destination cannot be the same (disabled options)
 *   [ ] When destination account selected, payee field disabled
 *       Note: "(desactive car compte destination selectionne)"
 *   [ ] When payee selected, destination field disabled
 *       Note: "(desactive car tiers selectionne)"
 *   [ ] Frequency field displayed separately below accounts
 *
 * 2.5 End date options
 *   [ ] Set an end date — "Supprimer automatiquement cette recurrence a la date de fin" checkbox appears
 *   [ ] Checkbox in amber background (bg-amber-50, border-amber-200)
 *   [ ] Clear end date — checkbox disappears
 *
 * 2.6 Create expense — success
 *   [ ] Type: "Depense", Amount: 50.00, Description: "Test expense"
 *   [ ] Account: select one, Frequency: "Mensuel"
 *   [ ] Click "Creer"
 *   [ ] Modal closes
 *   [ ] New planned transaction appears in list
 *   [ ] Amount stored as negative (expense)
 *
 * 2.7 Create income — success
 *   [ ] Type: "Revenu", Amount: 2000, Description: "Test salary"
 *   [ ] Frequency: "Mensuel"
 *   [ ] Click "Creer"
 *   [ ] Amount stored as positive (income)
 *   [ ] Shows green styling in list
 *
 * 2.8 Create transfer — success
 *   [ ] Type: "Virement", Amount: 500, Description: "Savings transfer"
 *   [ ] Source account, destination account selected
 *   [ ] Click "Creer"
 *   [ ] Shows blue styling in list
 *   [ ] List item shows "accountName -> toAccountName"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT PLANNED TRANSACTION
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Open edit modal
 *   [ ] Hover over a planned transaction — Edit (Pencil) button appears
 *   [ ] Click Edit button
 *   [ ] Modal opens with title "Modifier" (FR) / "Edit" (EN)
 *   [ ] All fields pre-filled with current data
 *   [ ] Amount shown as absolute value (Math.abs)
 *   [ ] Start date formatted as YYYY-MM-DD
 *   [ ] End date formatted as YYYY-MM-DD (or empty)
 *   [ ] Buttons: "Annuler", "Modifier"
 *
 * 3.2 Edit planned transaction — success
 *   [ ] Change description and amount
 *   [ ] Change frequency
 *   [ ] Click "Modifier"
 *   [ ] Modal closes
 *   [ ] List refreshes with updated data
 *   [ ] Upcoming panel also refreshes
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE PLANNED TRANSACTION
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete planned transaction
 *   [ ] Hover over a planned transaction — Delete (Trash2) button appears
 *   [ ] Click Delete button
 *   [ ] Browser confirm dialog: "Supprimer \"<description>\" ?"
 *   [ ] Click OK — transaction removed from list
 *   [ ] Upcoming panel refreshes
 *
 * 4.2 Cancel delete
 *   [ ] Click Delete button
 *   [ ] Browser confirm dialog appears
 *   [ ] Click Cancel — transaction remains in list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — FREQUENCY OPTIONS DISPLAY
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 All frequency options in dropdown
 *   [ ] Open creation modal
 *   [ ] Click frequency dropdown — all 9 options available:
 *       "Une fois", "Quotidien", "Hebdomadaire", "Bi-hebdomadaire",
 *       "Mensuel" (default), "Bimestriel", "Trimestriel", "Semestriel", "Annuel"
 *
 * 5.2 Frequency labels in list
 *   [ ] Create transactions with different frequencies
 *   [ ] Each displays correct label: "Mensuel", "Hebdomadaire", "Annuel", etc.
 *   [ ] Label shown in gray text below description
 *
 * 5.3 Frequency affects next occurrence
 *   [ ] Monthly: next occurrence is ~1 month from start
 *   [ ] Weekly: next occurrence is ~1 week from start
 *   [ ] Annual: next occurrence is ~1 year from start
 *   [ ] Once: next occurrence is the start date itself
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — AUTO-CREATE / EXECUTE BEFORE HOLIDAY BEHAVIOR
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Execute before holiday checkbox
 *   [ ] Checkbox: "Execution le dernier jour ouvre avant echeance"
 *   [ ] Unchecked by default
 *   [ ] Check it — value toggles to true
 *   [ ] Uncheck it — value toggles to false
 *   [ ] Persisted after save (verify by editing)
 *
 * 6.2 Delete on end date checkbox
 *   [ ] Set an end date — checkbox appears:
 *       "Supprimer automatiquement cette recurrence a la date de fin"
 *   [ ] Unchecked by default
 *   [ ] Check it — value toggles to true
 *   [ ] Remove end date — checkbox disappears, value reset
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 Empty description
 *   [ ] Open creation modal
 *   [ ] Leave "Description" empty
 *   [ ] Click "Creer" — HTML5 required validation prevents submission
 *
 * 7.2 Invalid amount
 *   [ ] Leave "Montant" empty or at 0
 *   [ ] Click "Creer" — HTML5 required validation prevents submission
 *   [ ] Enter negative amount — accepted (sign handled by type logic)
 *
 * 7.3 Missing account
 *   [ ] Leave account on empty option
 *   [ ] Click "Creer" — required validation prevents submission
 *
 * 7.4 Start date after end date
 *   [ ] Set start date to 2026-12-31
 *   [ ] Set end date to 2026-01-01 (min attribute should prevent)
 *   [ ] End date input has min=startDate constraint
 *
 * 7.5 Server error
 *   [ ] Simulate server error (e.g., stop backend)
 *   [ ] Click "Creer" — error alert via translateError
 *   [ ] Modal stays open, form data preserved
 *
 * 7.6 Data loading failure
 *   [ ] If accounts or categories fail to load
 *   [ ] Modal shows loading spinner with "Chargement des donnees..."
 *   [ ] "Annuler" button available to close
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — I18N VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 French (default locale)
 *   [ ] Page title: "Transactions recurrentes"
 *   [ ] Subtitle: "Gerez vos operations automatiques"
 *   [ ] Button: "Nouvelle"
 *   [ ] Modal title (create): "Nouvelle transaction recurrente"
 *   [ ] Modal title (edit): "Modifier"
 *   [ ] Types: "Depense", "Revenu", "Virement"
 *   [ ] Labels: "Montant", "Description", "Frequence"
 *   [ ] Dates: "Date de debut", "Date de fin (optionnel)"
 *   [ ] Frequencies: "Une fois", "Quotidien", "Hebdomadaire", "Bi-hebdomadaire",
 *       "Mensuel", "Bimestriel", "Trimestriel", "Semestriel", "Annuel"
 *   [ ] Upcoming: "A venir (30 jours)"
 *   [ ] List title: "Liste des transactions recurrentes"
 *   [ ] Ended badge: "Terminee"
 *   [ ] Next: "Prochaine: <date>"
 *   [ ] Empty: "Aucune transaction recurrente"
 *   [ ] Buttons: "Annuler", "Creer", "Modifier"
 *
 * 8.2 English
 *   [ ] Switch to English locale
 *   [ ] Page title: "Recurring Transactions"
 *   [ ] Subtitle: "Manage your automatic operations"
 *   [ ] Button: "New"
 *   [ ] Modal title (create): "New recurring transaction"
 *   [ ] Modal title (edit): "Edit"
 *   [ ] Types: "Expense", "Income", "Transfer"
 *   [ ] Labels: "Amount", "Description", "Frequency"
 *   [ ] Dates: "Start date", "End date (optional)"
 *   [ ] Frequencies: "Once", "Daily", "Weekly", "Biweekly",
 *       "Monthly", "Bimonthly", "Quarterly", "Semiannual", "Annual"
 *   [ ] Upcoming: "Upcoming (30 days)"
 *   [ ] List title: "Recurring transactions list"
 *   [ ] Ended badge: "Ended"
 *   [ ] Next: "Next: <date>"
 *   [ ] Empty: "No recurring transactions"
 *   [ ] Buttons: "Cancel", "Create", "Edit"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 Page loading
 *   [ ] Navigate to /planned-transactions — full-page spinner displayed
 *   [ ] Spinner: animate-spin circle (h-8 w-8 border-b-2 border-primary-600)
 *   [ ] Once loaded, spinner replaced by two-panel layout
 *
 * 9.2 Modal data loading
 *   [ ] Click "Nouvelle" when accounts/categories are still loading
 *   [ ] Loading overlay displayed with spinner
 *   [ ] Text: "Chargement des donnees..."
 *   [ ] "Annuler" button to close overlay
 *   [ ] Once data ready, modal form appears
 *
 * 9.3 Error state
 *   [ ] If main query fails
 *   [ ] Error message displayed: "Erreur: <message>"
 *   [ ] Red text centered on page
 *
 * 9.4 Save loading
 *   [ ] Click "Creer" or "Modifier" — brief loading
 *   [ ] No double-submission on rapid clicks
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 10 — NEXT OCCURRENCE DATE DISPLAY
 * ═══════════════════════════════════════════════════════════
 *
 * 10.1 Next occurrence in list items
 *   [ ] Active planned transactions show "Prochaine: <formatted date>"
 *   [ ] Date formatted via formatDate helper
 *   [ ] Displayed inline with frequency, payee, category (dot-separated)
 *
 * 10.2 Next occurrence in upcoming panel
 *   [ ] Each upcoming item shows its next occurrence date
 *   [ ] Displayed below description in gray text
 *   [ ] Format matches locale settings
 *
 * 10.3 Ended transactions — no next occurrence
 *   [ ] Transactions with isActive=false have no next occurrence
 *   [ ] Transactions with past endDate have no next occurrence
 *   [ ] "Terminee" badge displayed instead
 *   [ ] Gray styling on entire row
 *
 * 10.4 Empty upcoming
 *   [ ] When no transactions are due in next 30 days
 *   [ ] Upcoming panel shows: "Aucune transaction a venir"
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Transactions récurrentes", subtitle "Gérez vos opérations automatiques"
 *   ✅ 1.2 "Nouvelle" button present
 *   ✅ 1.3 Two-panel layout: "À venir (30 jours)" + "Liste des transactions récurrentes"
 *   ✅ 1.4 Salary entry: Mensuel, 28/02/2026, 2 800,00 €
 *   ⚠️ BUG i18n: "Prochaine: {{date}}" shows raw interpolation placeholder
 *
 * STEP 2-4 — CRUD: ⬜ Not tested
 * STEP 5 — Frequency options: ✅ "Mensuel" visible
 * STEP 6-7 — Error/i18n: ✅ FR labels confirmed; ⬜ EN not tested
 * STEP 8-10 — Loading/states/next occurrence: ⬜ Not tested
 *
 */
