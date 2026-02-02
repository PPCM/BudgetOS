/**
 * UI Test: Credit Cards (CRUD, Filtering, Sorting, Cycle display)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least one checking account exists for card linking
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
 *   [ ] Navigate to /credit-cards
 *   [ ] Page title: "Cartes de credit" (FR) / "Credit Cards" (EN)
 *   [ ] Subtitle: "Gerez vos cartes et cycles de facturation"
 *   [ ] "Nouvelle carte" button present with Plus icon
 *
 * 1.2 Filter bar
 *   [ ] Status filter label: "Statut :"
 *   [ ] Filter buttons: "Toutes" (default active), "Actives", "Expirees"
 *   [ ] "Toutes" has primary-100 bg when active
 *   [ ] "Actives" has green-100 bg when active
 *   [ ] "Expirees" has red-100 bg when active
 *
 * 1.3 Sort bar
 *   [ ] Sort label: "Trier par :"
 *   [ ] Sort dropdown: "Nom", "Date d'expiration"
 *   [ ] Sort order toggle button (ArrowUpDown icon)
 *   [ ] Default sort: by name, ascending
 *
 * 1.4 Card list display
 *   [ ] Cards displayed in 2-column grid (lg:grid-cols-2)
 *   [ ] Each card shows: colored icon, name, debit type, last 4 digits, expiration
 *   [ ] Edit (Pencil) and Delete (Trash2) buttons appear on hover
 *   [ ] Linked account name displayed below card name
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE CREDIT CARD
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open creation modal
 *   [ ] Click "Nouvelle carte" button
 *   [ ] Modal opens with title "Nouvelle carte de credit" (FR)
 *   [ ] Close (X) button in header
 *
 * 2.2 Modal form fields
 *   [ ] "Nom de la carte" — text input, required, placeholder "Ex: Visa Premier"
 *   [ ] "Compte associe" — select dropdown (only checking accounts), required
 *       Description: "Compte sur lequel sera debite la carte"
 *   [ ] "4 derniers chiffres" — text input, maxLength=4, digits only, placeholder "1234"
 *   [ ] "Expiration *" — text input, auto-formatted MM/AA, maxLength=5, required
 *   [ ] "Plafond" — number input, placeholder "3000"
 *   [ ] "Type de debit" — two toggle buttons: "Differe" (default) / "Immediat"
 *       "Differe" has primary border when selected
 *       "Immediat" has primary border when selected
 *   [ ] "Couleur" — color picker, default #EF4444
 *   [ ] Buttons: "Annuler", "Creer"
 *
 * 2.3 Deferred-only fields
 *   [ ] When "Differe" is selected:
 *       "Debut du cycle" — select dropdown (days 1-28)
 *       "Jour de prelevement" — select dropdown (days 1-28)
 *   [ ] When "Immediat" is selected:
 *       Cycle start and debit day fields are hidden
 *
 * 2.4 Create deferred card — success
 *   [ ] Fill all required fields:
 *       Name: "Visa Test", Expiration: "12/28", Account: select a checking account
 *   [ ] Leave debit type as "Differe"
 *   [ ] Set cycle start day: 1, debit day: 5
 *   [ ] Click "Creer"
 *   [ ] Modal closes
 *   [ ] New card appears in the list
 *   [ ] Card shows "Debit differe" label
 *
 * 2.5 Create immediate card — success
 *   [ ] Open modal, fill required fields
 *   [ ] Select "Immediat" debit type
 *   [ ] Cycle fields disappear
 *   [ ] Click "Creer"
 *   [ ] Card shows "Debit immediat" label
 *   [ ] Card displays message: "Les operations sont debitees immediatement"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT CREDIT CARD
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Open edit modal
 *   [ ] Hover over a card — Edit (Pencil) button appears
 *   [ ] Click Edit button
 *   [ ] Modal opens with title "Modifier la carte" (FR) / "Edit card" (EN)
 *   [ ] All fields pre-filled with current card data
 *   [ ] Debit type toggle reflects current type
 *   [ ] Buttons: "Annuler", "Modifier"
 *
 * 3.2 Edit card — success
 *   [ ] Change card name
 *   [ ] Change expiration date
 *   [ ] Toggle debit type from deferred to immediate (or vice versa)
 *   [ ] Click "Modifier"
 *   [ ] Modal closes
 *   [ ] Card list refreshes with updated data
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE CREDIT CARD
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete card
 *   [ ] Hover over a card — Delete (Trash2) button appears
 *   [ ] Click Delete button
 *   [ ] Browser confirm dialog: "Supprimer la carte \"<name>\" ?"
 *   [ ] Click OK — card removed from list
 *
 * 4.2 Cancel delete
 *   [ ] Click Delete button
 *   [ ] Browser confirm dialog appears
 *   [ ] Click Cancel — card remains in list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — DEFERRED VS IMMEDIATE DEBIT CARD DIFFERENCES
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Deferred debit card display
 *   [ ] Card shows "Debit differe" type label
 *   [ ] "Cycle en cours" section displayed with:
 *       Cycle status badge: "Ouvert" or "En attente"
 *       Cycle date range: "Du <start> au <end>"
 *       "Total cycle" with formatted currency amount
 *   [ ] "Prochain prelevement" section displayed with:
 *       Next debit date
 *       Debit amount
 *   [ ] "Dernieres operations" section if transactions exist (up to 5)
 *
 * 5.2 Immediate debit card display
 *   [ ] Card shows "Debit immediat" type label
 *   [ ] No cycle information displayed
 *   [ ] Message: "Les operations sont debitees immediatement"
 *   [ ] No "Prochain prelevement" section
 *
 * 5.3 Expired card display
 *   [ ] Expired card has gray background (bg-gray-200)
 *   [ ] "Expiree" badge displayed next to name
 *   [ ] All text and icons muted (text-gray-400)
 *   [ ] No cycle or debit information shown
 *   [ ] Card icon background is gray (bg-gray-300)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Empty card name
 *   [ ] Open creation modal
 *   [ ] Leave "Nom de la carte" empty
 *   [ ] Click "Creer" — HTML5 required validation prevents submission
 *
 * 6.2 Invalid expiration format
 *   [ ] Enter non-numeric characters — input strips them (auto-format)
 *   [ ] Enter incomplete expiration (e.g., "1") — maxLength 5 allows partial
 *   [ ] Leave expiration empty — required validation prevents submission
 *
 * 6.3 Missing linked account
 *   [ ] Open creation modal with no checking accounts in DB
 *   [ ] Account dropdown shows only placeholder "Selectionner un compte"
 *   [ ] Cannot submit without selecting an account (required)
 *
 * 6.4 Last 4 digits — non-numeric
 *   [ ] Type letters in "4 derniers chiffres" field
 *   [ ] Input auto-strips non-digit characters (.replace(/\D/g, ''))
 *   [ ] Only digits remain, maxLength 4
 *
 * 6.5 Duplicate card name
 *   [ ] Create a card with a name that already exists
 *   [ ] Error alert via translateError if backend rejects duplicates
 *
 * 6.6 Server error
 *   [ ] Simulate server error (e.g., stop backend)
 *   [ ] Click "Creer" — error alert displayed
 *   [ ] Modal stays open
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — I18N VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 French (default locale)
 *   [ ] Page title: "Cartes de credit"
 *   [ ] Subtitle: "Gerez vos cartes et cycles de facturation"
 *   [ ] Button: "Nouvelle carte"
 *   [ ] Modal title (create): "Nouvelle carte de credit"
 *   [ ] Modal title (edit): "Modifier la carte"
 *   [ ] Labels: "Nom de la carte", "Compte associe", "4 derniers chiffres",
 *       "Expiration *", "Plafond", "Type de debit", "Couleur"
 *   [ ] Debit types: "Differe", "Immediat"
 *   [ ] Deferred fields: "Debut du cycle", "Jour de prelevement"
 *   [ ] Filter: "Statut :", "Toutes", "Actives", "Expirees"
 *   [ ] Sort: "Trier par :", "Nom", "Date d'expiration"
 *   [ ] Buttons: "Annuler", "Creer", "Modifier", "Supprimer"
 *   [ ] Expired badge: "Expiree"
 *   [ ] Cycle: "Cycle en cours", "Total cycle", "Prochain prelevement"
 *   [ ] Empty state: "Aucune carte de credit configuree"
 *
 * 7.2 English
 *   [ ] Switch to English locale
 *   [ ] Page title: "Credit Cards"
 *   [ ] Subtitle: "Manage your cards and billing cycles"
 *   [ ] Button: "New card"
 *   [ ] Modal title (create): "New credit card"
 *   [ ] Modal title (edit): "Edit card"
 *   [ ] Labels: "Card name", "Linked account", "Last 4 digits",
 *       "Expiration *", "Limit", "Debit type", "Color"
 *   [ ] Debit types: "Deferred", "Immediate"
 *   [ ] Deferred fields: "Cycle start", "Debit day"
 *   [ ] Filter: "Status:", "All", "Active", "Expired"
 *   [ ] Sort: "Sort by:", "Name", "Expiration date"
 *   [ ] Buttons: "Cancel", "Create", "Edit", "Delete"
 *   [ ] Expired badge: "Expired"
 *   [ ] Cycle: "Current cycle", "Cycle total", "Next debit"
 *   [ ] Empty state: "No credit cards configured"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Page loading
 *   [ ] Navigate to /credit-cards — full-page spinner displayed
 *   [ ] Spinner: animate-spin circle (h-8 w-8 border-b-2 border-primary-600)
 *   [ ] Once loaded, spinner replaced by card grid or empty state
 *
 * 8.2 Save loading
 *   [ ] Click "Creer" or "Modifier" — observe brief loading
 *   [ ] No double-submission on rapid clicks (mutation pending state)
 *
 * 8.3 Delete loading
 *   [ ] After confirming delete — card removed, query invalidated
 *   [ ] List refreshes automatically
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — EMPTY STATE
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 No credit cards (filter: all)
 *   [ ] Delete all cards (or use empty database)
 *   [ ] Navigate to /credit-cards
 *   [ ] CreditCard icon (w-12 h-12 text-gray-300) displayed centered
 *   [ ] Text: "Aucune carte de credit configuree"
 *   [ ] "Ajouter une carte" button present
 *   [ ] Click "Ajouter une carte" — creation modal opens
 *
 * 9.2 No active cards (filter: active)
 *   [ ] Click "Actives" filter when all cards are expired
 *   [ ] Text: "Aucune carte active"
 *   [ ] "Voir toutes les cartes" button present
 *   [ ] Click button — resets filter to "Toutes"
 *
 * 9.3 No expired cards (filter: expired)
 *   [ ] Click "Expirees" filter when all cards are active
 *   [ ] Text: "Aucune carte expiree"
 *   [ ] "Voir toutes les cartes" button present
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 10 — CREDIT CARD BALANCE & CYCLE INFORMATION
 * ═══════════════════════════════════════════════════════════
 *
 * 10.1 Credit limit display
 *   [ ] Card with creditLimit set shows limit section
 *   [ ] Formatted as currency (e.g., "3 000,00 EUR")
 *   [ ] Label: "Plafond"
 *   [ ] Section has gray background (bg-gray-50)
 *
 * 10.2 Current cycle information (deferred cards only)
 *   [ ] "Cycle en cours" section with Calendar icon
 *   [ ] Cycle status badge: "Ouvert" (green) or "En attente"
 *   [ ] Date range: "Du <start> au <end>"
 *   [ ] "Total cycle" amount displayed in bold (text-xl)
 *   [ ] formatCurrency used for amount display
 *
 * 10.3 Next debit information
 *   [ ] "Prochain prelevement" section with Clock icon
 *   [ ] Amber background (bg-amber-50)
 *   [ ] Shows debit date and amount
 *   [ ] Amount formatted as currency
 *
 * 10.4 Recent operations
 *   [ ] "Dernieres operations" section shown if cycle has transactions
 *   [ ] Up to 5 most recent transactions displayed
 *   [ ] Each shows: description (truncated) and amount
 *   [ ] Section separated by border-t
 *
 * 10.5 Expired card — no cycle data
 *   [ ] Expired card does not show cycle section
 *   [ ] Expired card does not show next debit section
 *   [ ] Credit limit section has muted style (bg-gray-300, text-gray-400)
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Cartes de crédit", subtitle "Gérez vos cartes et cycles de facturation"
 *   ✅ 1.2 "Nouvelle carte" button
 *   ✅ 1.3 Filter bar: Statut (Toutes/Actives/Expirées), Trier par (Nom/Date d'expiration), Croissant
 *   ✅ 1.4 Visa Premier card: Débit différé, linked to Visa Card, Plafond 3 000,00 €
 *   ⚠️ BUG i18n: "Associée à : {{name}}" shows raw interpolation placeholder instead of value
 *
 * STEP 2-4 — CRUD: ⬜ Not tested (create/edit/delete)
 * STEP 5 — Deferred vs immediate: ✅ "Débit différé" visible on card
 * STEP 6 — Error cases: ⬜ Not tested
 * STEP 7 — i18n: ✅ FR labels correct; ⬜ EN not tested
 * STEP 8 — Loading states: ⬜ Not tested
 * STEP 9 — Empty states: ⬜ Not tested
 * STEP 10 — Balance/cycle: ✅ Plafond 3 000,00 € displayed
 *
 */
