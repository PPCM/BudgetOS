/**
 * UI Test: Reports (Trend, Category Breakdown, Forecast)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - Several months of transaction data exist for meaningful charts
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
 *   [ ] Navigate to /reports
 *   [ ] Page title: "Rapports" (h1)
 *   [ ] Subtitle: "Analysez vos finances"
 *
 * 1.2 Tab navigation
 *   [ ] Three tabs present with icons:
 *       - "Évolution" (TrendingUp icon) — active by default
 *       - "Par catégorie" (PieChart icon)
 *       - "Prévisions" (Calendar icon)
 *   [ ] Active tab has primary-600 border-bottom and text color
 *   [ ] Inactive tabs have transparent border and gray text
 *   [ ] Clicking a tab switches content and updates active styling
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — PERIOD FILTERS
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Trend tab — period context
 *   [ ] "Évolution" tab active
 *   [ ] Chart title: "Revenus vs Dépenses (12 derniers mois)"
 *   [ ] Note: Period is fixed to 12 months (no custom period selector on this tab)
 *
 * 2.2 Forecast tab — period context
 *   [ ] Click "Prévisions" tab
 *   [ ] Forecast data shows 30, 60, and 90-day projections
 *   [ ] Chart title: "Prévision de trésorerie"
 *   [ ] Note: Period is fixed to 90 days (no custom period selector)
 *
 * 2.3 Category tab — period context
 *   [ ] Click "Par catégorie" tab
 *   [ ] Shows expense breakdown (no custom date range selector)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — INCOME VS EXPENSES (TREND TAB)
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Bar chart display
 *   [ ] "Évolution" tab active
 *   [ ] Card with title "Revenus vs Dépenses (12 derniers mois)"
 *   [ ] ResponsiveContainer renders a Recharts BarChart
 *   [ ] X-axis shows month labels (monthLabel)
 *   [ ] Y-axis shows values in "Xk" format (e.g., "1k", "2k")
 *   [ ] Grid lines visible (CartesianGrid)
 *
 * 3.2 Chart bars
 *   [ ] Green bars for income (fill="#10b981")
 *   [ ] Red bars for expenses (fill="#ef4444")
 *   [ ] Both bar series visible with rounded tops (radius [4,4,0,0])
 *
 * 3.3 Tooltip
 *   [ ] Hover over a bar — tooltip appears
 *   [ ] Tooltip shows formatted currency amounts (e.g., "1 500,00 €")
 *   [ ] Income labeled "Revenus", expenses labeled "Dépenses"
 *   [ ] Tooltip has rounded border (borderRadius: 8px)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — CATEGORY BREAKDOWN
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Pie chart display
 *   [ ] Click "Par catégorie" tab
 *   [ ] Left card: title "Répartition des dépenses"
 *   [ ] Donut pie chart (innerRadius=60, outerRadius=100)
 *   [ ] Up to 8 categories displayed with distinct colors
 *   [ ] Padding angle between slices (paddingAngle=2)
 *
 * 4.2 Category detail list
 *   [ ] Right card: title "Détail par catégorie"
 *   [ ] Each category shows:
 *       - Colored circle indicator (matching pie chart color)
 *       - Category name
 *       - Percentage (e.g., "35%")
 *       - Formatted currency total (e.g., "450,00 €")
 *   [ ] Up to 8 categories listed
 *   [ ] Categories ordered by total amount (descending)
 *
 * 4.3 Pie chart tooltip
 *   [ ] Hover over a pie slice — tooltip with formatted currency amount
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — FORECAST TAB
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Summary cards
 *   [ ] Click "Prévisions" tab
 *   [ ] Four cards displayed in a grid:
 *       - "Solde actuel" with current balance
 *       - "Dans 30 jours" with 30-day forecast
 *       - "Dans 60 jours" with 60-day forecast
 *       - "Dans 90 jours" with 90-day forecast
 *   [ ] All amounts formatted as currency (e.g., "12 345,67 €")
 *
 * 5.2 Line chart
 *   [ ] Card with title "Prévision de trésorerie"
 *   [ ] ResponsiveContainer renders a Recharts LineChart
 *   [ ] X-axis shows dates (dd MMM format, locale-aware)
 *   [ ] Y-axis shows values in "Xk" format
 *   [ ] Grid lines visible
 *   [ ] Blue line (stroke="#3b82f6", strokeWidth=2, no dots)
 *   [ ] Data points sampled every 7 days
 *
 * 5.3 Line chart tooltip
 *   [ ] Hover over the line — tooltip appears
 *   [ ] Tooltip shows formatted date and currency balance
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 No transaction data
 *   [ ] With empty database (no transactions)
 *   [ ] Trend chart: renders with empty/zero bars or blank chart
 *   [ ] Category breakdown: empty pie chart and empty detail list
 *   [ ] Forecast: all balance cards show 0,00 €, flat line at 0
 *   [ ] No crashes or errors
 *
 * 6.2 API error
 *   [ ] If backend returns an error (e.g., 500)
 *   [ ] Loading state eventually resolves
 *   [ ] Page does not crash (React Query handles error)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 French (default)
 *   [ ] Page title: "Rapports"
 *   [ ] Subtitle: "Analysez vos finances"
 *   [ ] Tabs: "Évolution", "Par catégorie", "Prévisions"
 *   [ ] Trend: "Revenus vs Dépenses (12 derniers mois)", "Revenus", "Dépenses"
 *   [ ] Category: "Répartition des dépenses", "Détail par catégorie"
 *   [ ] Forecast: "Solde actuel", "Dans 30 jours", "Dans 60 jours",
 *       "Dans 90 jours", "Prévision de trésorerie"
 *   [ ] Currency format: "1 500,00 €" (FR locale)
 *   [ ] Date format on X-axis: French locale (e.g., "15 janv.")
 *
 * 7.2 English
 *   [ ] Switch locale to English in settings
 *   [ ] Page title: "Reports"
 *   [ ] Subtitle: "Analyze your finances"
 *   [ ] Tabs: "Trend", "By Category", "Forecast"
 *   [ ] Trend: "Income vs Expenses (last 12 months)", "Income", "Expenses"
 *   [ ] Category: "Expense Breakdown", "Category Detail"
 *   [ ] Forecast: "Current Balance", "In 30 days", "In 60 days",
 *       "In 90 days", "Cash Flow Forecast"
 *   [ ] Currency format: "$1,500.00" or "€1,500.00" (EN locale)
 *   [ ] Date format on X-axis: English locale (e.g., "Jan 15")
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — EMPTY STATE
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 No data for trend
 *   [ ] With no transactions, trend chart area is rendered but with no bars
 *   [ ] Axes still visible
 *
 * 8.2 No data for categories
 *   [ ] With no expenses, pie chart is empty (no slices)
 *   [ ] Detail list is empty (no categories listed)
 *
 * 8.3 No data for forecast
 *   [ ] With no transactions, balance cards show 0 values
 *   [ ] Line chart rendered with flat line at 0 or empty chart
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 9 — CHART RENDERING
 * ═══════════════════════════════════════════════════════════
 *
 * 9.1 Responsive containers
 *   [ ] All charts use ResponsiveContainer (width="100%", height="100%")
 *   [ ] Charts resize when window is resized
 *   [ ] Charts render correctly on different screen widths
 *
 * 9.2 Loading state
 *   [ ] Each tab shows LoadingState component while data loads
 *   [ ] LoadingState: card with centered spinning loader (h-8 w-8, border-primary-600)
 *   [ ] Spinner disappears when data is loaded, chart appears
 *
 * 9.3 Chart legends and axes
 *   [ ] Bar chart: X-axis month labels readable (fontSize 12)
 *   [ ] Bar chart: Y-axis tick values in "Xk" format (fontSize 12)
 *   [ ] Pie chart: slices have distinct colors from COLORS array
 *   [ ] Line chart: X-axis date labels formatted based on locale
 *   [ ] Line chart: Y-axis "Xk" format with 0 decimals
 *
 * 9.4 Category breakdown layout
 *   [ ] Two-column layout on large screens (lg:grid-cols-2)
 *   [ ] Single column on small screens (grid-cols-1)
 *   [ ] Pie chart card and detail card side by side on desktop
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Rapports", subtitle "Analysez vos finances"
 *   ✅ 1.2 3 tabs: Évolution, Par catégorie, Prévisions
 *
 * STEP 2 — Bar chart (Évolution):
 *   ✅ 2.1 "Revenus vs Dépenses (12 derniers mois)" heading
 *   ✅ 2.2 12 months displayed (Mar 2025 - Feb 2026), Y-axis 0k-2.8k
 *
 * STEP 3 — Category breakdown:
 *   ⬜ Chart content not visible in a11y tree (Recharts SVG)
 *
 * STEP 4 — Forecast:
 *   ✅ 4.1 4 summary cards: Solde actuel=16 079,11 €, 30j=18 879,11 €,
 *          60j=21 679,11 €, 90j=24 479,11 €
 *   ✅ 4.2 "Prévision de trésorerie" chart with dates (02 fév - 27 avr)
 *
 * STEP 5-9 — Error/i18n/empty: ⬜ Not tested
 * FR labels confirmed ✅
 *
 */
