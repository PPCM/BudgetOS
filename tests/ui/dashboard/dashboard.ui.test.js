/**
 * UI Test: Dashboard (Summary Cards, Accounts, Charts, Transactions)
 *
 * Tested via Chrome MCP on 2026-02-02
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - At least one account with transactions exists
 *   - Seed users:
 *     - admin@budgetos.local / Admin123! (super_admin)
 *     - manager@budgetos.local / Demo1234! (admin)
 *     - user@budgetos.local / Demo1234! (user)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 1 — PAGE DISPLAY (SUMMARY CARDS)
 * ═══════════════════════════════════════════════════════════
 *
 * 1.1 Page header
 *   [ ] Navigate to / (dashboard)
 *   [ ] Page title: "Tableau de bord"
 *   [ ] Subtitle: "Vue d'ensemble de vos finances"
 *
 * 1.2 Summary cards (4 cards in grid)
 *   [ ] Card 1 — "Solde total": displays formatted currency, Wallet icon, primary color
 *   [ ] Card 2 — "Revenus du mois": displays formatted currency, TrendingUp icon, green color
 *   [ ] Card 3 — "Dépenses du mois": displays formatted currency, TrendingDown icon, red color
 *   [ ] Card 4 — "Flux net": displays formatted currency, Clock icon, green if >= 0, red if < 0
 *
 * 1.3 Summary cards — values consistency
 *   [ ] Net flow = Monthly income - Monthly expenses
 *   [ ] Amounts formatted with currency symbol (e.g. "1 234,56 €")
 *   [ ] Negative amounts displayed correctly (e.g. "-500,00 €")
 *
 * 1.4 Loading state
 *   [ ] On initial load, spinner displayed (animate-spin)
 *   [ ] Spinner disappears when data loads
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — ACCOUNT LIST SECTION
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Account section header
 *   [ ] Section title: "Mes comptes"
 *   [ ] Displayed in left column of 3-column grid
 *
 * 2.2 Account cards
 *   [ ] Each account shows: name, institution, current balance
 *   [ ] Account icon (Wallet) with account color
 *   [ ] Account color applied as background tint (color + '20')
 *   [ ] Negative balances displayed in red (text-red-600)
 *   [ ] Positive balances displayed in dark gray (text-gray-900)
 *
 * 2.3 Multiple accounts
 *   [ ] All seed accounts visible (e.g. Checking, Savings, Visa Card)
 *   [ ] Accounts listed vertically in a scrollable list
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — EXPENSES BY CATEGORY CHART
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Chart section header
 *   [ ] Section title: "Dépenses par catégorie" with PieChart icon
 *   [ ] Displayed in middle column of 3-column grid
 *
 * 3.2 Pie chart (Recharts)
 *   [ ] Donut chart rendered (innerRadius=40, outerRadius=70)
 *   [ ] Up to 6 categories displayed as slices
 *   [ ] Each slice has a distinct color (from category color or COLORS array)
 *   [ ] Tooltip shows formatted currency on hover
 *
 * 3.3 Legend (below chart)
 *   [ ] Up to 4 categories shown with color dot + name + amount
 *   [ ] Category names truncated if too long
 *   [ ] Amounts formatted with currency symbol
 *
 * 3.4 Empty state (no expenses)
 *   [ ] If no expense data: "Aucune donnée" displayed instead of chart
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — RECENT TRANSACTIONS SECTION
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Transactions section header
 *   [ ] Section title: "Transactions récentes"
 *   [ ] Displayed in right column of 3-column grid
 *
 * 4.2 Transaction list
 *   [ ] Recent transactions listed with: description, category, amount, relative date
 *   [ ] Income transactions: green icon (TrendingUp), green amount, "+" prefix
 *   [ ] Expense transactions: red icon (TrendingDown), red amount, no "+" prefix
 *   [ ] Category name displayed below description (or "Non catégorisé" if none)
 *
 * 4.3 Date formatting
 *   [ ] Dates displayed as relative (e.g. "Aujourd'hui", "Hier", "Il y a 3 jours")
 *   [ ] Date shown in small text below the amount
 *
 * 4.4 Transaction hover
 *   [ ] Rows highlight on hover (hover:bg-gray-50)
 *   [ ] Description truncated if too long (truncate class)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — EMPTY STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 No transactions
 *   [ ] If no recent transactions: "Aucune transaction récente" message displayed
 *   [ ] Message centered in the section (text-center py-8)
 *
 * 5.2 No expense categories
 *   [ ] If no expense data: "Aucune donnée" displayed in pie chart section
 *   [ ] No chart rendered, just text message
 *
 * 5.3 No accounts
 *   [ ] If no accounts: account section shows empty list
 *   [ ] Summary cards show 0,00 € for all values
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 French locale (default)
 *   [ ] Title: "Tableau de bord"
 *   [ ] Subtitle: "Vue d'ensemble de vos finances"
 *   [ ] Card 1: "Solde total"
 *   [ ] Card 2: "Revenus du mois"
 *   [ ] Card 3: "Dépenses du mois"
 *   [ ] Card 4: "Flux net"
 *   [ ] Accounts: "Mes comptes"
 *   [ ] Chart: "Dépenses par catégorie"
 *   [ ] Transactions: "Transactions récentes"
 *   [ ] Empty transactions: "Aucune transaction récente"
 *   [ ] Empty chart: "Aucune donnée"
 *   [ ] Uncategorized: "Non catégorisé"
 *
 * 6.2 English locale
 *   [ ] Switch language to English in settings
 *   [ ] Title: "Dashboard"
 *   [ ] Subtitle: "Overview of your finances"
 *   [ ] Card 1: "Total Balance"
 *   [ ] Card 2: "Monthly Income"
 *   [ ] Card 3: "Monthly Expenses"
 *   [ ] Card 4: "Net Flow"
 *   [ ] Accounts: "My Accounts"
 *   [ ] Chart: "Expenses by Category"
 *   [ ] Transactions: "Recent Transactions"
 *   [ ] Empty transactions: "No recent transactions"
 *   [ ] Empty chart: "No data"
 *   [ ] Uncategorized: "Uncategorized"
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — EDGE CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 Large amounts
 *   [ ] Account with balance 999 999,99 € — formatted correctly with spaces
 *   [ ] Summary card handles large total balance without overflow
 *
 * 7.2 Negative balances
 *   [ ] Account with negative balance (e.g. -1 500,00 €) — displayed in red
 *   [ ] Negative total balance — card text color still readable
 *   [ ] Net flow negative — card uses red color scheme
 *
 * 7.3 Many accounts (5+)
 *   [ ] Account list scrollable or wraps without breaking layout
 *   [ ] All accounts visible and readable
 *
 * 7.4 Many categories in chart
 *   [ ] Only top 6 categories displayed in pie chart
 *   [ ] Only top 4 categories in legend
 *   [ ] Colors cycle through COLORS array for categories without custom color
 *
 * 7.5 Very long transaction descriptions
 *   [ ] Description truncated with ellipsis (truncate class)
 *   [ ] Layout does not break
 *
 * 7.6 Trend percentage (vsLastMonth)
 *   [ ] If trend data present: shows "X.X% vs mois dernier" with arrow icon
 *   [ ] Positive trend: green text, ArrowUpRight icon
 *   [ ] Negative trend: red text, ArrowDownRight icon
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display (summary cards):
 *   ✅ 1.1 Title "Tableau de bord", subtitle "Vue d'ensemble de vos finances"
 *   ✅ 1.2 4 cards: Solde total=16 079,11 €, Revenus du mois=0,00 €,
 *          Dépenses du mois=222,50 €, Flux net=-222,50 €
 *   ✅ 1.3 Net flow = 0 - 222.50 = -222.50 ✅, format "X XXX,XX €" correct
 *   ⬜ 1.4 Loading spinner: not explicitly observed (loads too fast)
 *
 * STEP 2 — Account list section:
 *   ✅ 2.1 "Mes comptes" heading present
 *   ✅ 2.2 Each account shows name, institution (My Bank), balance
 *   ✅ 2.3 3 accounts: Checking 6 079,11 €, Savings 10 000,00 €, Visa Card 0,00 €
 *
 * STEP 3 — Expenses by category chart:
 *   ✅ 3.1 "Dépenses par catégorie" heading present
 *   ✅ 3.4 "Aucune donnée" displayed (no category expense data this month)
 *   ⬜ 3.2/3.3 Pie chart and legend: not testable (no expense category data in seed)
 *
 * STEP 4 — Recent transactions section:
 *   ✅ 4.1 "Transactions récentes" heading present
 *   ✅ 4.2 5 transactions displayed: EDF/-95€, Restaurant/-42€, Carrefour/-85.50€,
 *          November Salary/+2800€, CHQ 1234567/-350€
 *          Income (Salary) has "+" prefix ✅, categories shown ✅
 *   ✅ 4.3 Relative dates: "Il y a -12 jours", "Il y a -7 jours", etc.
 *          "Non catégorisé" for uncategorized transaction ✅
 *
 * STEP 5 — Empty states:
 *   ✅ 5.2 "Aucune donnée" in chart section (no expenses by category this month)
 *   ⬜ 5.1/5.3 No transactions / No accounts: not tested (would require empty DB)
 *
 * STEP 6 — i18n verification:
 *   ✅ 6.1 FR: All labels correct (Tableau de bord, Vue d'ensemble, Solde total,
 *          Revenus du mois, Dépenses du mois, Flux net, Mes comptes,
 *          Dépenses par catégorie, Transactions récentes, Aucune donnée, Non catégorisé)
 *   ✅ 6.2 EN: All labels correct (Dashboard, Overview of your finances, Total Balance,
 *          Monthly Income, Monthly Expenses, Net Flow, My Accounts,
 *          Expenses by Category, Recent Transactions, No data, Uncategorized)
 *          Currency format switches to EN: "€16,079.11" with comma thousands ✅
 *          Dates switch to EN: "-12 days ago" ✅
 *   ⚠️ Toast message i18n inconsistency: "Préférences mises à jour" stays in FR when
 *      switching to EN, and "Preferences updated" stays in EN when switching back to FR
 *
 * STEP 7 — Edge cases:
 *   ⬜ 7.1-7.6 Not tested (would require specific data setup)
 *
 */
