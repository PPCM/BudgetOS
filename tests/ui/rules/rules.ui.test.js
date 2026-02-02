/**
 * UI Test: Rules (List, Create, Edit, Delete, Toggle, Conditions)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least one category exists for rule actions
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
 *   [ ] Navigate to /rules
 *   [ ] Page title: "Règles de catégorisation" (h1)
 *   [ ] Subtitle: "Automatisez la catégorisation de vos transactions"
 *   [ ] "Nouvelle règle" button present with Plus icon
 *
 * 1.2 Rule list (with existing rules from seed)
 *   [ ] Each rule displayed as a card with:
 *       - Wand2 icon (purple if active, gray if inactive)
 *       - Rule name (bold)
 *       - Condition count: "X condition(s)"
 *       - Arrow and assigned category name
 *       - Toggle button (ToggleRight if active, ToggleLeft if inactive)
 *       - Delete button (Trash2 icon)
 *
 * 1.3 Empty state (if no rules)
 *   [ ] Wand2 icon (gray, large)
 *   [ ] Message: "Aucune règle configurée"
 *   [ ] Description: "Les règles permettent de catégoriser automatiquement les transactions importées"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — CREATE RULE
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Open create modal
 *   [ ] Click "Nouvelle règle" button
 *   [ ] Modal opens with title "Nouvelle règle"
 *   [ ] Close button (X) in top-right corner
 *
 * 2.2 Form fields
 *   [ ] "Nom de la règle": text input, placeholder "Ex: Courses Carrefour", required
 *   [ ] "Conditions" label with logic selector (AND/OR dropdown)
 *   [ ] Condition logic options: "Toutes (ET)", "Au moins une (OU)"
 *   [ ] Default condition row: field=Description, operator=Contient, value=""
 *   [ ] GripVertical icon on each condition row
 *   [ ] "+ Ajouter une condition" link below conditions
 *   [ ] "Action: Assigner la catégorie": category dropdown, required
 *   [ ] Category options show: "CategoryName (type)"
 *   [ ] "Règle active" checkbox (checked by default)
 *   [ ] "Annuler" and "Créer" buttons at bottom
 *
 * 2.3 Condition fields
 *   [ ] Field dropdown options: "Description", "Montant"
 *   [ ] Operator dropdown options: "Contient", "Ne contient pas", "Égal à",
 *       "Différent de", "Commence par", "Termine par", "Supérieur à", "Inférieur à"
 *   [ ] Value input: text for description, number for amount
 *   [ ] When field is "Montant", value input type changes to number
 *
 * 2.4 Add/remove conditions
 *   [ ] Click "+ Ajouter une condition" — new condition row added
 *   [ ] Each additional condition has a Trash2 delete button
 *   [ ] First condition does not have delete button when only 1 condition exists
 *   [ ] Remove a condition — row disappears
 *
 * 2.5 Create rule (success)
 *   [ ] Enter name: "Test Rule"
 *   [ ] Set condition: Description contains "CARREFOUR"
 *   [ ] Select a category from dropdown
 *   [ ] Click "Créer"
 *   [ ] Modal closes
 *   [ ] New rule appears in the rule list
 *
 * 2.6 Cancel modal
 *   [ ] Open modal, fill some fields
 *   [ ] Click "Annuler" — modal closes, no rule created
 *   [ ] Open modal, click X — modal closes
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EDIT RULE (TOGGLE ACTIVE/INACTIVE)
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Toggle rule active/inactive
 *   [ ] Find an active rule (ToggleRight icon, purple Wand2)
 *   [ ] Click the toggle button
 *   [ ] Icon changes to ToggleLeft, Wand2 becomes gray
 *   [ ] Rule is now inactive
 *   [ ] Click toggle again — rule becomes active again
 *
 * 3.2 No inline edit modal
 *   [ ] Note: Current implementation only supports toggle and delete from the list
 *   [ ] There is no edit button to open a pre-filled modal for existing rules
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — DELETE RULE
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Delete rule
 *   [ ] Click Trash2 (delete) icon on a rule
 *   [ ] Rule is deleted (no confirmation dialog in current implementation)
 *   [ ] Rule disappears from the list
 *
 * 4.2 Delete last rule
 *   [ ] Delete all rules one by one
 *   [ ] Empty state appears: "Aucune règle configurée"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — RULE CONDITIONS
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Description contains
 *   [ ] Create rule: field=Description, operator=Contient, value="BOULANGERIE"
 *   [ ] Select category
 *   [ ] Save — rule created, condition count shows "1 condition(s)"
 *
 * 5.2 Amount greater than
 *   [ ] Create rule: field=Montant, operator=Supérieur à, value="100"
 *   [ ] Value input is type=number
 *   [ ] Select category, save
 *
 * 5.3 Multiple conditions (AND)
 *   [ ] Create rule with 2 conditions:
 *       - Description contient "CARTE"
 *       - Montant supérieur à 50
 *   [ ] Logic set to "Toutes (ET)"
 *   [ ] Save — condition count shows "2 condition(s)"
 *
 * 5.4 Multiple conditions (OR)
 *   [ ] Create rule with 2 conditions, logic set to "Au moins une (OU)"
 *   [ ] Save — rule created
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — RULE ACTIONS
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Assign category
 *   [ ] In rule modal, category dropdown lists all categories
 *   [ ] Each option shows "CategoryName (type)" — e.g., "Alimentation (expense)"
 *   [ ] Select a category — value updates
 *   [ ] After save, rule card shows "→ CategoryName" in subtitle
 *
 * 6.2 Category required
 *   [ ] Leave category on "Sélectionner une catégorie" (empty value)
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — APPLY RULE MANUALLY
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 Manual apply
 *   [ ] Note: No manual "Apply rules" button is present on the Rules page
 *   [ ] Rules are applied automatically during bank import
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Empty rule name
 *   [ ] Open create modal
 *   [ ] Leave name empty, fill conditions and category
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * 8.2 Empty condition value
 *   [ ] Open create modal
 *   [ ] Fill name and category but leave condition value empty
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * 8.3 No category selected
 *   [ ] Open create modal
 *   [ ] Fill name and conditions but leave category empty
 *   [ ] Click "Créer" — HTML5 validation prevents submission (required)
 *
 * 8.4 Backend validation
 *   [ ] If "At least one condition required" error — displayed appropriately
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 French (default)
 *   [ ] Page title: "Règles de catégorisation"
 *   [ ] Subtitle: "Automatisez la catégorisation de vos transactions"
 *   [ ] Button: "Nouvelle règle"
 *   [ ] Modal title: "Nouvelle règle"
 *   [ ] Labels: "Nom de la règle", "Conditions", "Action: Assigner la catégorie"
 *   [ ] Logic: "Toutes (ET)", "Au moins une (OU)"
 *   [ ] Fields: "Description", "Montant"
 *   [ ] Operators: "Contient", "Ne contient pas", "Égal à", "Différent de",
 *       "Commence par", "Termine par", "Supérieur à", "Inférieur à"
 *   [ ] Checkbox: "Règle active"
 *   [ ] Buttons: "Annuler", "Créer"
 *   [ ] Empty state: "Aucune règle configurée"
 *
 * 9.2 English
 *   [ ] Switch locale to English in settings
 *   [ ] Page title: "Categorization Rules"
 *   [ ] Subtitle: "Automate the categorization of your transactions"
 *   [ ] Button: "New rule"
 *   [ ] Modal title: "New rule"
 *   [ ] Labels: "Rule name", "Conditions", "Action: Assign category"
 *   [ ] Logic: "All (AND)", "At least one (OR)"
 *   [ ] Fields: "Description", "Amount"
 *   [ ] Operators: "Contains", "Does not contain", "Equals", "Not equal to",
 *       "Starts with", "Ends with", "Greater than", "Less than"
 *   [ ] Checkbox: "Active rule"
 *   [ ] Buttons: "Cancel", "Create"
 *   [ ] Empty state: "No rules configured"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 10 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 10.1 Page loading
 *   [ ] On initial load, spinning loader displayed (animate-spin)
 *   [ ] Loader disappears once rules data is loaded
 *
 * 10.2 Create mutation
 *   [ ] After clicking "Créer", modal closes (no explicit spinner on button)
 *   [ ] Rule list refreshes with new rule
 *
 * 10.3 Toggle mutation
 *   [ ] Click toggle — state updates (no visible spinner, near-instant)
 *
 * 10.4 Delete mutation
 *   [ ] Click delete — rule removed (no visible spinner, near-instant)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 11 — EMPTY STATE
 * ═══════════════════════════════════════════════════════════
 *
 * 11.1 No rules
 *   [ ] Delete all rules or use fresh database
 *   [ ] Large Wand2 icon (gray) displayed centered
 *   [ ] Text: "Aucune règle configurée"
 *   [ ] Subtext: "Les règles permettent de catégoriser automatiquement les transactions importées"
 *   [ ] "Nouvelle règle" button still accessible in header
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Règles de catégorisation", subtitle "Automatisez la catégorisation de vos transactions"
 *   ✅ 1.2 "Nouvelle règle" button present
 *   ✅ 1.3 Empty state: "Aucune règle configurée" +
 *          "Les règles permettent de catégoriser automatiquement les transactions importées"
 *
 * STEP 2-11 — CRUD/conditions/i18n: ⬜ Not tested in detail
 * FR labels confirmed ✅
 *
 */
