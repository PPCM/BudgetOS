/**
 * UI Test: Categories (CRUD, Types, Import/Export, Icons, Colors)
 *
 * Tested via Chrome MCP on 2026-02-02
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least some categories exist from seed data
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
 *   [ ] Navigate to /categories
 *   [ ] Page title: "Catégories"
 *   [ ] Subtitle: "Organisez vos transactions"
 *
 * 1.2 Action buttons
 *   [ ] "Importer" button visible with Upload icon
 *   [ ] "Exporter" button visible with Download icon
 *   [ ] "Nouvelle" button visible with Plus icon (primary style)
 *
 * 1.3 Three-column layout (income / expense / transfer)
 *   [ ] Column 1 — "Revenus": green icon (TrendingUp), green background
 *   [ ] Column 2 — "Dépenses": red icon (TrendingDown), red background
 *   [ ] Column 3 — "Virements": blue icon (ArrowLeftRight), blue background
 *   [ ] Each column shows category count badge (e.g. "5")
 *
 * 1.4 Category items
 *   [ ] Each category shows: colored icon circle, name
 *   [ ] Icon circle uses category color with transparency (color + '20')
 *   [ ] Categories sorted alphabetically within each group
 *
 * 1.5 Loading state
 *   [ ] On initial load, spinner displayed (animate-spin)
 *   [ ] Spinner disappears when data loads
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE CATEGORY
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open create modal
 *   [ ] Click "Nouvelle" button
 *   [ ] Modal opens with title "Nouvelle catégorie"
 *   [ ] Close button (X) visible in top-right corner
 *
 * 2.2 Modal form fields
 *   [ ] Field "Nom": text input, required, placeholder "Ex: Alimentation, Salaire..."
 *   [ ] Field "Type": 3 toggle buttons (Revenus / Dépenses / Virements)
 *       - Revenus: green border, TrendingUp icon
 *       - Dépenses: red border, TrendingDown icon
 *       - Virements: blue border, ArrowLeftRight icon
 *   [ ] Field "Couleur": 20 color swatches in a grid
 *       - Selected color shows check mark and ring
 *   [ ] Field "Icône": scrollable icon grid (60+ icons)
 *       - Selected icon highlighted with primary background and ring
 *
 * 2.3 Default values
 *   [ ] Name: empty
 *   [ ] Type: "Dépenses" (expense) selected by default
 *   [ ] Color: #3B82F6 (blue) selected
 *   [ ] Icon: "tag" selected
 *
 * 2.4 Create category (success)
 *   [ ] Fill name: "Test Category"
 *   [ ] Select type: "Revenus" (income)
 *   [ ] Select a color (e.g. green #22C55E)
 *   [ ] Select an icon (e.g. Briefcase)
 *   [ ] Click "Créer" button
 *   [ ] Modal closes
 *   [ ] New category appears in the "Revenus" column
 *   [ ] Category count badge incremented
 *
 * 2.5 Cancel creation
 *   [ ] Click "Nouvelle" button
 *   [ ] Fill some fields
 *   [ ] Click "Annuler" button
 *   [ ] Modal closes, no category created
 *
 * 2.6 Close via X button
 *   [ ] Click "Nouvelle" button
 *   [ ] Click X button in top-right corner
 *   [ ] Modal closes, no category created
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT CATEGORY
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Hover to reveal actions
 *   [ ] Hover over a category row
 *   [ ] Edit (Pencil) and Delete (Trash2) icons appear (opacity transition)
 *
 * 3.2 Open edit modal
 *   [ ] Click edit icon (Pencil)
 *   [ ] Modal opens with title "Modifier la catégorie"
 *   [ ] Form pre-filled with existing category data
 *
 * 3.3 Edit modal — field verification
 *   [ ] Name field pre-filled with current name
 *   [ ] Type toggle shows current type selected
 *   [ ] Color swatch shows current color with check mark
 *   [ ] Icon grid shows current icon highlighted
 *
 * 3.4 Save changes
 *   [ ] Change name to "Updated Category"
 *   [ ] Change type from expense to income
 *   [ ] Select a different color
 *   [ ] Click "Modifier" button
 *   [ ] Modal closes
 *   [ ] Category moved to "Revenus" column with updated name and color
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE CATEGORY
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete confirmation dialog
 *   [ ] Hover over category, click delete icon (Trash2)
 *   [ ] Browser confirm dialog: "Supprimer la catégorie \"<name>\" ?"
 *
 * 4.2 Confirm delete
 *   [ ] Accept the confirm dialog
 *   [ ] Category removed from the list
 *   [ ] Category count badge decremented
 *   [ ] Category list refreshes (query invalidated)
 *
 * 4.3 Cancel delete
 *   [ ] Dismiss the confirm dialog
 *   [ ] Category remains in the list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — CATEGORY TYPES (INCOME / EXPENSE / TRANSFER)
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Income column
 *   [ ] Header: "Revenus" with green TrendingUp icon
 *   [ ] Contains only income-type categories
 *   [ ] Count badge matches actual number of income categories
 *
 * 5.2 Expense column
 *   [ ] Header: "Dépenses" with red TrendingDown icon
 *   [ ] Contains only expense-type categories
 *   [ ] Count badge matches actual number of expense categories
 *
 * 5.3 Transfer column
 *   [ ] Header: "Virements" with blue ArrowLeftRight icon
 *   [ ] Contains only transfer-type categories
 *   [ ] Count badge matches actual number of transfer categories
 *
 * 5.4 Empty column
 *   [ ] If a type has no categories: "Aucune catégorie" message displayed
 *   [ ] Count badge shows 0
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
 * 6.3 Server error on create
 *   [ ] If server returns 500: alert displays "Erreur interne du serveur"
 *   [ ] Modal stays open, data preserved
 *
 * 6.4 Server error on update
 *   [ ] If update fails: alert displays error message
 *   [ ] Modal stays open, data preserved
 *
 * 6.5 Server error on delete
 *   [ ] If delete fails: alert displays error message
 *   [ ] Category remains in the list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 French locale (default)
 *   [ ] Title: "Catégories"
 *   [ ] Subtitle: "Organisez vos transactions"
 *   [ ] Buttons: "Importer", "Exporter", "Nouvelle"
 *   [ ] Type columns: "Revenus", "Dépenses", "Virements"
 *   [ ] Modal title (create): "Nouvelle catégorie"
 *   [ ] Modal title (edit): "Modifier la catégorie"
 *   [ ] Fields: "Nom", "Type", "Couleur", "Icône"
 *   [ ] Type toggles: "Revenus", "Dépenses", "Virements"
 *   [ ] Buttons: "Annuler", "Créer" / "Modifier"
 *   [ ] Empty state: "Aucune catégorie"
 *   [ ] Delete confirm: "Supprimer la catégorie..."
 *   [ ] Placeholder: "Ex: Alimentation, Salaire..."
 *
 * 7.2 English locale
 *   [ ] Switch language to English in settings
 *   [ ] Title: "Categories"
 *   [ ] Subtitle: "Organize your transactions"
 *   [ ] Buttons: "Import", "Export", "New"
 *   [ ] Type columns: "Income", "Expenses", "Transfers"
 *   [ ] Modal title (create): "New category"
 *   [ ] Modal title (edit): "Edit category"
 *   [ ] Fields: "Name", "Type", "Color", "Icon"
 *   [ ] Type toggles: "Income", "Expenses", "Transfers"
 *   [ ] Buttons: "Cancel", "Create" / "Edit"
 *   [ ] Empty state: "No categories"
 *   [ ] Delete confirm: "Delete category..."
 *   [ ] Placeholder: "E.g.: Food, Salary..."
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Page loading
 *   [ ] Initial page load shows centered spinner
 *   [ ] Spinner disappears when category data loads
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
 *   [ ] After confirm dialog accepted — category removed after request completes
 *
 * 8.5 Import loading
 *   [ ] Click "Importer" and select a JSON file
 *   [ ] Categories created/updated one by one
 *   [ ] Alert shows result: "Import terminé: X créée(s), Y mise(s) à jour"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — IMPORT / EXPORT & SORT ORDER
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 Export categories
 *   [ ] Click "Exporter" button
 *   [ ] JSON file downloaded: categories-YYYY-MM-DD.json
 *   [ ] File contains array of category objects (without id, userId, createdAt, updatedAt)
 *   [ ] Each object has: name, type, color, icon
 *
 * 9.2 Import categories (valid JSON)
 *   [ ] Click "Importer" button — hidden file input triggered
 *   [ ] Select a valid .json file with category array
 *   [ ] Import creates new categories and updates existing ones (matched by name + type)
 *   [ ] Alert: "Import terminé: X créée(s), Y mise(s) à jour"
 *   [ ] Category list refreshes
 *
 * 9.3 Import categories (invalid format)
 *   [ ] Click "Importer" and select a non-array JSON file
 *   [ ] Alert: "Erreur lors de l'import: Format invalide"
 *
 * 9.4 Import categories (invalid JSON)
 *   [ ] Click "Importer" and select a non-JSON file
 *   [ ] Alert: error message about parsing failure
 *
 * 9.5 Sort order within columns
 *   [ ] Categories sorted alphabetically by name (locale-aware, French collation)
 *   [ ] After creating a new category, it appears in correct alphabetical position
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Catégories", subtitle "Organisez vos transactions"
 *   ✅ 1.2 Buttons: Importer, Exporter, Nouvelle
 *   ✅ 1.3 3-column layout: Revenus (1: Salary), Dépenses (3: Electricity, Groceries, Restaurant),
 *          Virements (0: "Aucune catégorie")
 *   ✅ 1.4 Each category has edit + delete icon buttons
 *   ✅ 1.5 Count badges on column headers (1, 3, 0)
 *
 * STEP 2 — Create category:
 *   ✅ 2.1 Modal "Nouvelle catégorie": Nom (required, placeholder "Ex: Alimentation, Salaire..."),
 *          Type (3 toggle buttons: Revenus/Dépenses/Virements), Couleur (20 color buttons),
 *          Icône (59 icon buttons), Annuler/Créer buttons
 *   ✅ 2.2 Created "Transport" (Dépenses, Car icon) — appeared in Dépenses column, count → 4
 *
 * STEP 3 — Edit category:
 *   ⬜ Not explicitly tested (modal edit)
 *
 * STEP 4 — Delete category:
 *   ✅ 4.1 Click delete icon → window.confirm dialog
 *   ✅ 4.2 Accept → "Transport" removed, Dépenses count → 3
 *
 * STEP 5 — Category types:
 *   ✅ 5.1 3 types: Revenus, Dépenses, Virements (toggle buttons in create modal)
 *
 * STEP 6 — Error cases:
 *   ⬜ 6.1 Empty name: not tested (field has required attribute)
 *   ⬜ 6.2 Duplicate name: not tested
 *
 * STEP 7 — i18n verification:
 *   ✅ 7.1 FR: Catégories, Organisez vos transactions, Importer, Exporter, Nouvelle,
 *          Revenus, Dépenses, Virements, Nouvelle catégorie, Nom, Type, Couleur, Icône,
 *          Annuler, Créer, Aucune catégorie
 *   ⬜ 7.2 EN: not explicitly tested on this page
 *
 * STEP 8 — Loading states:
 *   ⬜ 8.1-8.5 Not explicitly observed
 *
 * STEP 9 — Import / Export & sort order:
 *   ⬜ 9.1-9.5 Not tested
 *
 */
