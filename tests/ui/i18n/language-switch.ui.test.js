/**
 * UI Test: Language Switch (i18n)
 *
 * Tested via Chrome MCP on 2026-02-01
 *
 * Pre-conditions:
 *   - Fresh database (npm run db:reset && ./budgetos.sh restart)
 *   - Server running on http://localhost:3000
 *
 * Test results:
 *
 * 1. SETUP FLOW (French default)
 *    ✅ Registration page displays in French:
 *       - Title: "Bienvenue sur BudgetOS"
 *       - Subtitle: "Créez votre compte administrateur pour commencer"
 *       - Fields: Prénom, Nom, Email, Mot de passe, Confirmer
 *       - Button: "Créer mon compte"
 *    ✅ After registration, redirects to Dashboard in French
 *
 * 2. DASHBOARD (French)
 *    ✅ Navigation: Tableau de bord, Comptes, Transactions, Récurrentes,
 *       Cartes de crédit, Catégories, Tiers, Import, Règles, Rapports, Paramètres
 *    ✅ Admin nav: ADMINISTRATION, Utilisateurs, Groupes, Paramètres système
 *    ✅ Content: "Solde total", "Revenus du mois", "Dépenses du mois", "Flux net"
 *    ✅ Sections: "Mes comptes", "Dépenses par catégorie", "Transactions récentes"
 *    ✅ Empty states: "Aucune donnée", "Aucune transaction récente"
 *    ✅ Currency format: "0,00 €" (French locale)
 *    ✅ Sign out button: "Déconnexion"
 *
 * 3. SETTINGS - PREFERENCES TAB
 *    ✅ Language selector visible with options: Français, English
 *    ✅ Currency selector: Euro (€), Dollar ($), Livre Sterling (£), Franc Suisse (CHF)
 *    ✅ Week start: Lundi, Dimanche, Samedi
 *    ✅ Save button: "Enregistrer"
 *
 * 4. SWITCH TO ENGLISH
 *    ✅ Select "English" in language dropdown and save
 *    ✅ Entire interface switches to English instantly:
 *       - Navigation: Dashboard, Accounts, Transactions, Recurring,
 *         Credit Cards, Categories, Payees, Import, Rules, Reports, Settings
 *       - Admin: Users, Groups, System Settings
 *       - Page: "Settings", "Manage your account and preferences"
 *       - Tabs: Profile, Security, Preferences
 *       - Labels: Language, Currency, First day of week
 *       - Options: British Pound (£), Swiss Franc (CHF), Monday, Sunday, Saturday
 *       - Button: "Save"
 *       - Sign out button: "Sign out"
 *
 * 5. DASHBOARD IN ENGLISH
 *    ✅ Navigate to dashboard, all content in English:
 *       "Overview of your finances", "Total Balance", "Monthly Income",
 *       "Monthly Expenses", "Net Flow", "My Accounts",
 *       "Expenses by Category", "No data", "Recent Transactions",
 *       "No recent transactions"
 *    ✅ Currency format: "€0.00" (English locale)
 *
 * 6. SWITCH BACK TO FRENCH
 *    ✅ Select "Français" in preferences and save
 *    ✅ Entire interface switches back to French instantly
 *
 * 7. PERSISTENCE AFTER RELOAD
 *    ✅ Full page reload (F5) preserves the selected language (French)
 *    ✅ Language is restored from user profile stored server-side
 *
 * Known minor issue:
 *   - Toast message shows in the previous language (generated before changeLanguage)
 *     e.g. "Preferences updated" appears when switching FROM English TO French
 */
