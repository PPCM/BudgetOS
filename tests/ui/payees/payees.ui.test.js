/**
 * UI Test: Payees (CRUD, Search, Delete with reassignment)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
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
 *   [ ] Navigate to /payees
 *   [ ] Page title: "Tiers" (FR) / "Payees" (EN)
 *   [ ] Subtitle: "Gerez vos fournisseurs, beneficiaires et contacts"
 *   [ ] "Nouveau tiers" button present with Plus icon
 *   [ ] Search input present with placeholder "Rechercher un tiers..."
 *   [ ] Payee list displayed inside a card container
 *
 * 1.2 Payee list items
 *   [ ] Each payee shows: avatar (image or User icon fallback), name, notes (if any)
 *   [ ] Edit (Pencil) and Delete (Trash2) buttons appear on hover (group-hover)
 *   [ ] Payees with imageUrl show a round image (w-12 h-12)
 *   [ ] Payees without imageUrl show gray User icon in a circle
 *
 * 1.3 Search functionality
 *   [ ] Type in search input — list filters in real time (debounced query)
 *   [ ] Clear search — full list reappears
 *   [ ] Search with no results — shows empty state
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE PAYEE
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open creation modal
 *   [ ] Click "Nouveau tiers" button
 *   [ ] Modal opens with title "Nouveau tiers" (FR) / "New payee" (EN)
 *   [ ] Form fields: image editor (centered), "Nom" input, "Notes (optionnel)" textarea
 *   [ ] "Nom" input has placeholder "Nom du tiers"
 *   [ ] "Annuler" and "Creer" buttons present
 *   [ ] Close (X) button in modal header
 *
 * 2.2 Create a payee — success
 *   [ ] Enter name: "Test Payee"
 *   [ ] Optionally enter notes: "Test notes"
 *   [ ] Click "Creer"
 *   [ ] Modal closes
 *   [ ] New payee appears in the list
 *
 * 2.3 Auto-logo detection
 *   [ ] Create a payee with a known brand name (e.g., "Amazon", "Netflix")
 *   [ ] Image editor auto-detects and displays a known logo
 *   [ ] Logo persists after save
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT PAYEE
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Open edit modal
 *   [ ] Hover over a payee — Edit (Pencil) button appears
 *   [ ] Click Edit button
 *   [ ] Modal opens with title "Modifier le tiers" (FR) / "Edit payee" (EN)
 *   [ ] "Nom" field pre-filled with current name
 *   [ ] "Notes" field pre-filled with current notes (if any)
 *   [ ] Image editor shows current image (or auto-detected logo)
 *   [ ] Buttons: "Annuler" and "Modifier"
 *
 * 3.2 Edit payee — success
 *   [ ] Change name to "Updated Payee"
 *   [ ] Click "Modifier"
 *   [ ] Modal closes
 *   [ ] List refreshes with updated name
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE PAYEE
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete payee without transactions
 *   [ ] Hover over a payee with 0 associated transactions
 *   [ ] Click Delete (Trash2) button
 *   [ ] Browser confirm dialog: "Supprimer le tiers \"<name>\" ?"
 *   [ ] Click OK — payee removed from list
 *
 * 4.2 Delete payee with transactions — dissociate
 *   [ ] Hover over a payee that has associated transactions
 *   [ ] Click Delete (Trash2) button
 *   [ ] DeletePayeeModal opens with warning icon (amber)
 *   [ ] Title: "Supprimer \"<name>\""
 *   [ ] Shows transaction count: "X transaction(s) associee(s)"
 *   [ ] Question: "Ce tiers est associe a des transactions..."
 *   [ ] Radio option 1: "Dissocier les transactions" (default selected)
 *   [ ] Radio option 2: "Reassigner a un autre tiers"
 *   [ ] Click "Supprimer" with "Dissocier" selected — payee deleted, transactions unlinked
 *
 * 4.3 Delete payee with transactions — reassign
 *   [ ] Open delete modal for a payee with transactions
 *   [ ] Select "Reassigner a un autre tiers"
 *   [ ] SearchableSelect appears for target payee
 *   [ ] "Supprimer" button disabled until a target payee is selected
 *   [ ] Select a target payee
 *   [ ] Click "Supprimer" — payee deleted, transactions reassigned
 *
 * 4.4 Delete payee with transactions — reassign to new payee
 *   [ ] Open delete modal, select "Reassigner"
 *   [ ] In SearchableSelect, type a name that doesn't exist
 *   [ ] "Creer" option appears to create a new payee on-the-fly
 *   [ ] Create the new payee — it becomes the reassignment target
 *   [ ] Click "Supprimer" — payee deleted, transactions reassigned to new payee
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — PAYEE IMAGE MANAGEMENT
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Image editor in modal
 *   [ ] Click on payee image in modal — PayeeImageEditor activates
 *   [ ] Helper text: "Cliquez pour modifier l'image"
 *   [ ] Can upload a custom image
 *   [ ] Image preview updates in modal
 *
 * 5.2 Auto-logo on name change
 *   [ ] In creation modal, type a known brand name
 *   [ ] Logo auto-detected and displayed
 *   [ ] Clear the name — auto-logo resets
 *   [ ] Type another known brand — new logo detected
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Empty name
 *   [ ] Open creation modal
 *   [ ] Leave "Nom" empty
 *   [ ] Click "Creer" — HTML5 required validation prevents submission
 *   [ ] Form does not submit
 *
 * 6.2 Duplicate name
 *   [ ] Open creation modal
 *   [ ] Enter a name that already exists (e.g., existing payee name)
 *   [ ] Click "Creer"
 *   [ ] Error alert displayed via translateError (duplicate constraint)
 *   [ ] Modal stays open
 *
 * 6.3 Very long name
 *   [ ] Enter a name with 200+ characters
 *   [ ] Click "Creer"
 *   [ ] Either: accepted and truncated in display, or validation error
 *
 * 6.4 Server error on save
 *   [ ] Simulate server error (e.g., stop backend)
 *   [ ] Click "Creer" or "Modifier"
 *   [ ] Error alert displayed
 *   [ ] Modal stays open, form data preserved
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — I18N VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 French (default locale)
 *   [ ] Page title: "Tiers"
 *   [ ] Subtitle: "Gerez vos fournisseurs, beneficiaires et contacts"
 *   [ ] Button: "Nouveau tiers"
 *   [ ] Search placeholder: "Rechercher un tiers..."
 *   [ ] Modal create title: "Nouveau tiers"
 *   [ ] Modal edit title: "Modifier le tiers"
 *   [ ] Form label: "Nom"
 *   [ ] Form label: "Notes (optionnel)"
 *   [ ] Buttons: "Annuler", "Creer", "Modifier", "Supprimer"
 *   [ ] Empty state: "Aucun tiers trouve"
 *   [ ] Empty state: "Creez votre premier tiers pour commencer"
 *
 * 7.2 English
 *   [ ] Switch to English locale
 *   [ ] Page title: "Payees"
 *   [ ] Subtitle: "Manage your vendors, recipients and contacts"
 *   [ ] Button: "New payee"
 *   [ ] Search placeholder: "Search a payee..."
 *   [ ] Modal create title: "New payee"
 *   [ ] Modal edit title: "Edit payee"
 *   [ ] Form label: "Name"
 *   [ ] Form label: "Notes (optional)"
 *   [ ] Buttons: "Cancel", "Create", "Edit", "Delete"
 *   [ ] Empty state: "No payees found"
 *   [ ] Empty state: "Create your first payee to get started"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Page loading
 *   [ ] Navigate to /payees — spinner shown while data loads
 *   [ ] Spinner: animate-spin circle (h-8 w-8 border-b-2 border-primary-600)
 *   [ ] Once loaded, spinner replaced by payee list or empty state
 *
 * 8.2 Search loading
 *   [ ] Type in search — query updates, spinner may briefly appear
 *   [ ] Results update after debounce
 *
 * 8.3 Save loading
 *   [ ] Click "Creer" or "Modifier" — observe brief loading before modal closes
 *   [ ] No double-submission on rapid clicks (mutation pending state)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — EMPTY STATE
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 No payees exist
 *   [ ] Delete all payees (or use empty database)
 *   [ ] Navigate to /payees
 *   [ ] Users icon (w-12 h-12 text-gray-300) displayed centered
 *   [ ] Text: "Aucun tiers trouve"
 *   [ ] Text: "Creez votre premier tiers pour commencer"
 *   [ ] "Nouveau tiers" button still available in header
 *
 * 9.2 Search with no results
 *   [ ] Type a search term that matches no payees (e.g., "zzzzzzz")
 *   [ ] Same empty state displayed
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Tiers", subtitle "Gérez vos fournisseurs, bénéficiaires et contacts"
 *   ✅ 1.2 "Nouveau tiers" button, search field "Rechercher un tiers..."
 *
 * STEP 2 — Create payee:
 *   ✅ 2.1 Modal "Nouveau tiers": image upload area ("Cliquez pour modifier l'image"),
 *          Nom (required, placeholder "Nom du tiers"), Notes (optional, multiline), Annuler/Créer
 *   ✅ 2.2 Created "Carrefour Market" — appeared in list with auto-detected logo (carrefour.png)
 *
 * STEP 3 — Edit payee:
 *   ⬜ Not tested
 *
 * STEP 4 — Delete payee:
 *   ✅ 4.1 Click delete → confirm dialog 'Supprimer le tiers "Carrefour Market" ?'
 *   ✅ 4.2 Accept → payee removed, back to empty state
 *
 * STEP 5 — Payee image management:
 *   ✅ 5.1 Auto-logo detection: "Carrefour Market" got carrefour.png automatically
 *
 * STEP 6 — Error cases:
 *   ⬜ Not tested
 *
 * STEP 7 — i18n verification:
 *   ✅ 7.1 FR labels confirmed (Tiers, Nouveau tiers, Rechercher, Aucun tiers trouvé, etc.)
 *   ⬜ 7.2 EN: not tested
 *
 * STEP 8 — Loading states:
 *   ⬜ Not tested
 *
 * STEP 9 — Empty state:
 *   ✅ 9.1 "Aucun tiers trouvé" + "Créez votre premier tiers pour commencer"
 *
 */
