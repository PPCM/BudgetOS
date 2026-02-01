/**
 * UI Test: User Deletion (Admin)
 *
 * Tested via Chrome MCP on 2026-02-01
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - Seed users:
 *     - admin@budgetos.local / Admin123! (super_admin)
 *     - manager@budgetos.local / Demo1234! (admin, group admin of Default group)
 *     - user@budgetos.local / Demo1234! (user, member of Default group)
 *
 * Test results:
 *
 * ═══════════════════════════════════════════════════════════
 * 1. SUPER ADMIN - AdminUsers page (icon-only action buttons)
 * ═══════════════════════════════════════════════════════════
 *
 *   ✅ Login as admin@budgetos.local — redirects to Dashboard
 *   ✅ Navigation shows ADMINISTRATION section with:
 *      Utilisateurs, Groupes, Paramètres système
 *   ✅ Navigate to /admin/users — user list displayed
 *   ✅ Action buttons are icon-only (no text labels):
 *      - Pencil icon (edit) with title="Modifier"
 *      - Trash icon (delete) with title="Supprimer"
 *   ✅ No "Suspendre" or "Réactiver" buttons — replaced by delete
 *
 * 1a. Delete user via super admin
 *   ✅ Click Trash icon on "Martin MYSTERE" (m.mystere@land.com)
 *   ✅ Browser confirm dialog appears (auto-accepted in test)
 *   ✅ Toast shows "Utilisateur supprimé"
 *   ✅ "Martin MYSTERE" disappears from user list
 *   ✅ Remaining users: John Doe, Jane Smith, Admin BudgetOS (3 users)
 *
 * ═══════════════════════════════════════════════════════════
 * 2. GROUP ADMIN - AdminGroups page (member deletion)
 * ═══════════════════════════════════════════════════════════
 *
 *   ✅ Login as manager@budgetos.local — redirects to Dashboard
 *   ✅ Navigation shows ADMINISTRATION section with only "Groupes"
 *      (no "Utilisateurs", no "Paramètres système")
 *   ✅ Navigate to /admin/groups — group list displayed
 *
 * 2a. Group card restrictions for group admin
 *   ✅ No "Nouveau groupe" button visible
 *   ✅ No edit (Pencil) or delete (Trash) icons on group card
 *   ✅ Group "Default" displayed with member count
 *   ✅ "Voir les membres" button available
 *
 * 2b. Member management
 *   ✅ Expand members panel — shows members with roles
 *   ✅ "Ajouter" button available for adding members
 *   ✅ Each member has a Trash icon button (title="Supprimer")
 *   ✅ Role dropdown available for each member (Membre/Admin)
 *
 * 2c. Delete member (user) via group admin
 *   ✅ Click Trash icon on "John Doe" (user@budgetos.local)
 *   ✅ Browser confirm dialog appears (auto-accepted in test)
 *   ✅ Toast shows "Utilisateur supprimé"
 *   ✅ "John Doe" disappears from member list
 *   ✅ Member count updates to 1
 *   ✅ Only Jane Smith remains in the group
 *   ✅ Group "Default" still exists (not deleted)
 *
 * ═══════════════════════════════════════════════════════════
 * 3. VERIFIED BEHAVIORS
 * ═══════════════════════════════════════════════════════════
 *
 *   ✅ Deleting a user removes them entirely (not just from group)
 *   ✅ Group survives user deletion — "Default" group persists
 *   ✅ Icons are uniform between super admin and group admin (Trash2)
 *   ✅ No text labels on action buttons in super admin interface
 *   ✅ Toast messages are in the user's selected language (French)
 *   ✅ Confirm dialog prevents accidental deletion
 */
