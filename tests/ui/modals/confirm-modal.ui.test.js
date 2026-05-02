/**
 * UI Test: ConfirmModal harmonization across the app
 *
 * Verifies that every destructive / lifecycle action goes through the shared
 * ConfirmModal component (instead of the native browser confirm() dialog) and
 * that BOTH the cancel and confirm paths behave correctly.
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3001
 *   - Database seeded with demo data (npm run db:seed)
 *   - Seed user: admin@budgetos.local / Admin123! (super_admin)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 0 — REGRESSION GUARD: no native confirm() left
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] grep -rn "if (confirm\|window.confirm" client/src/ | grep -v ".test." returns nothing
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 1 — VARIANT: warning (Account deactivate)
 * ═══════════════════════════════════════════════════════════
 *
 * 1.1 Open
 *   [ ] /accounts → hover an active card → click amber Power button
 *   [ ] Modal opens, header has amber AlertTriangle icon (or Power if overridden) + amber title
 *   [ ] Body text mentions the account name
 *   [ ] Footer: gray "Annuler" + amber "Désactiver"
 *
 * 1.2 Cancel path
 *   [ ] Click "Annuler" → modal closes, account still active in UI
 *   [ ] Reopen → click X (top-right) → modal closes, account still active
 *   [ ] Reopen → press Escape → modal closes, account still active
 *   [ ] Reopen → click outside modal (overlay) → modal closes, account still active
 *     (unless user has modalPersistent setting enabled)
 *
 * 1.3 Confirm path
 *   [ ] Reopen → click "Désactiver" → spinner briefly visible → modal closes
 *   [ ] Account moves to "Comptes désactivés" section, dimmed, with "Désactivé" badge
 *   [ ] No native browser dialog appears at any point
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — VARIANT: success (Account reactivate)
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] On the account just deactivated, hover → click green RotateCcw button
 *   [ ] Modal header has green CheckCircle icon (or RotateCcw if overridden) + green title
 *   [ ] Footer confirm button is green
 *   [ ] Cancel path: modal closes, account stays inactive
 *   [ ] Confirm path: account returns to top section as active
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — VARIANT: danger (Transaction delete)
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] /transactions → click trash icon on a row
 *   [ ] Modal header has red Trash2 icon + red title "Supprimer"
 *   [ ] Body text mentions the transaction description
 *   [ ] Footer confirm button is red
 *   [ ] Cancel path: modal closes, transaction still in list
 *   [ ] Confirm path: transaction removed, balance updated on the dashboard
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — VARIANT: danger on other pages (smoke)
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] /categories → delete a category → red modal opens, cancel + confirm both work
 *   [ ] /payees → delete a payee with no transactions → red modal opens (the
 *       reassignment modal still appears for payees that have transactions)
 *   [ ] /credit-cards → delete a card → red modal opens
 *   [ ] /planned-transactions → delete a recurring → red modal opens
 *   [ ] /admin/groups → delete a group → red modal opens
 *   [ ] /admin/settings → "Doublons d'opérations récurrentes" → Analyser
 *       (with duplicates present) → "Nettoyer X doublon(s)" → red modal opens
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — VARIANT: warning, custom icon (Group remove member)
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] /admin/groups → expand a group → click UserMinus next to a member
 *   [ ] Modal header has amber UserMinus icon + amber title "Retirer du groupe"
 *   [ ] Body interpolates the user's email
 *   [ ] Cancel path: modal closes, member stays in the group
 *   [ ] Confirm path: only the membership row is removed; the user account
 *       still exists in /admin/users (regression test for the old hidden
 *       hard-delete side-effect)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — TYPED-NAME PERMANENT DELETE (Account)
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] /accounts → on a deactivated card, click red Trash2 icon
 *   [ ] Modal title is "Supprimer définitivement" with red AlertTriangle
 *   [ ] Red warning box lists what will be destroyed
 *   [ ] Confirm button is disabled
 *   [ ] Type a wrong value (e.g. account name + extra char) → still disabled
 *   [ ] Type the exact account name → button enables
 *   [ ] Cancel: modal closes, account remains in inactive section
 *   [ ] Reopen and confirm: account disappears entirely; backend hard-deletes
 *       and cascades transactions
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — TYPED-NAME PERMANENT DELETE (User)
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] /admin/users → suspend a non-self user
 *   [ ] On the suspended row, click red Trash2 icon
 *   [ ] Modal title is "Supprimer définitivement"
 *   [ ] List enumerates: bank accounts, transactions, recurring, group memberships
 *   [ ] Confirm button stays disabled until the email is retyped exactly
 *       (case-insensitive)
 *   [ ] Confirm: user gone from list, all their data cascade-deleted
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — KEYBOARD & A11Y
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] Each ConfirmModal traps focus inside it (Tab cycles within)
 *   [ ] Escape always closes (cancels) the modal
 *   [ ] Confirm button shows a spinner while the mutation is in-flight
 *       and is disabled to prevent double-submit
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — EDGE CASES
 * ═══════════════════════════════════════════════════════════
 *
 *   [ ] Network error during confirm: error toast appears, modal stays open
 *       so the user can retry or cancel
 *   [ ] Permanent-delete typed input: leading/trailing spaces are tolerated
 *       (trim()), case for emails is normalized to lower
 */
