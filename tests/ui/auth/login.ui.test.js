/**
 * UI Test: Login Page (Authentication, Validation, i18n)
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
 * 1.1 Initial page state (FR — default locale)
 *   [ ] Navigate to http://localhost:3000/login
 *   [ ] Logo: circle with "B" letter displayed
 *   [ ] Title: "BudgetOS"
 *   [ ] Subtitle: "Connectez-vous à votre compte"
 *   [ ] Language selector in top-right corner: "FR | EN" (FR is bold/active)
 *
 * 1.2 Form fields
 *   [ ] Email label: "Email"
 *   [ ] Email input with Mail icon (left), placeholder "vous@exemple.com"
 *   [ ] Email input type="email"
 *   [ ] Password label: "Mot de passe"
 *   [ ] Password input with Lock icon (left), placeholder "••••••••"
 *   [ ] Password input type="password" (hidden by default)
 *   [ ] Eye icon button (right side of password field) to toggle visibility
 *
 * 1.3 Submit button and links
 *   [ ] Submit button: "Se connecter" with LogIn icon
 *   [ ] Below form text: "Pas encore de compte ?"
 *   [ ] Link: "Créer un compte" pointing to /register
 *
 * 1.4 Password visibility toggle
 *   [ ] Click Eye icon — password field switches to type="text" (visible)
 *   [ ] Icon changes to EyeOff
 *   [ ] Click EyeOff icon — password field switches back to type="password"
 *   [ ] Icon changes back to Eye
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — SUCCESSFUL LOGIN
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Login as super_admin
 *   [ ] Enter email: admin@budgetos.local
 *   [ ] Enter password: Admin123!
 *   [ ] Click "Se connecter"
 *   [ ] Button shows spinner during request (loading state)
 *   [ ] Redirects to / (dashboard)
 *   [ ] Dashboard displays "Tableau de bord" title
 *   [ ] Navigation sidebar visible with admin sections
 *
 * 2.2 Logout and return to login
 *   [ ] Click "Déconnexion" in sidebar
 *   [ ] Redirects back to /login
 *   [ ] Form is empty (email and password cleared)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — LOGIN WITH DIFFERENT ROLES
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Login as user (standard user)
 *   [ ] Enter email: user@budgetos.local
 *   [ ] Enter password: Demo1234!
 *   [ ] Click "Se connecter"
 *   [ ] Redirects to / (dashboard)
 *   [ ] Dashboard visible — no ADMINISTRATION section in sidebar
 *   [ ] Logout
 *
 * 3.2 Login as manager (admin role)
 *   [ ] Enter email: manager@budgetos.local
 *   [ ] Enter password: Demo1234!
 *   [ ] Click "Se connecter"
 *   [ ] Redirects to / (dashboard)
 *   [ ] Dashboard visible — ADMINISTRATION section visible in sidebar
 *   [ ] Logout
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Wrong password
 *   [ ] Enter email: admin@budgetos.local
 *   [ ] Enter password: WrongPass123!
 *   [ ] Click "Se connecter"
 *   [ ] Error message displayed in red alert box: "Identifiants incorrects"
 *   [ ] AlertCircle icon visible in error box
 *   [ ] Page stays on /login
 *   [ ] Password field is NOT cleared (user can retry)
 *
 * 4.2 Wrong email (non-existent user)
 *   [ ] Enter email: nonexistent@budgetos.local
 *   [ ] Enter password: Admin123!
 *   [ ] Click "Se connecter"
 *   [ ] Error message: "Identifiants incorrects"
 *   [ ] Page stays on /login
 *
 * 4.3 Empty fields (HTML5 validation)
 *   [ ] Leave both fields empty
 *   [ ] Click "Se connecter"
 *   [ ] Browser shows HTML5 validation tooltip on email field (required)
 *   [ ] No API request sent
 *
 * 4.4 Empty password only
 *   [ ] Enter email: admin@budgetos.local
 *   [ ] Leave password empty
 *   [ ] Click "Se connecter"
 *   [ ] Browser shows HTML5 validation tooltip on password field (required)
 *   [ ] No API request sent
 *
 * 4.5 Suspended account
 *   [ ] (Pre-condition: suspend a user via admin panel or API)
 *   [ ] Enter suspended user credentials
 *   [ ] Click "Se connecter"
 *   [ ] Error message: "Compte suspendu"
 *   [ ] Page stays on /login
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — VALIDATION
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 Invalid email format
 *   [ ] Enter email: "notanemail" (no @ sign)
 *   [ ] Enter password: Admin123!
 *   [ ] Click "Se connecter"
 *   [ ] Browser shows HTML5 validation tooltip on email field (type="email")
 *   [ ] No API request sent
 *
 * 5.2 Partial email (missing domain)
 *   [ ] Enter email: "user@"
 *   [ ] Enter password: Admin123!
 *   [ ] Click "Se connecter"
 *   [ ] Browser shows HTML5 validation tooltip on email field
 *
 * 5.3 Required attribute enforcement
 *   [ ] Email input has "required" attribute
 *   [ ] Password input has "required" attribute
 *   [ ] Both fields prevent empty submission via HTML5
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Switch to English on login page
 *   [ ] Navigate to /login (default FR)
 *   [ ] Click "EN" in the language selector (top-right)
 *   [ ] EN becomes bold/active, FR becomes dimmed
 *   [ ] Subtitle changes to: "Sign in to your account"
 *   [ ] Email label: "Email"
 *   [ ] Email placeholder: "you@example.com"
 *   [ ] Password label: "Password"
 *   [ ] Submit button: "Sign in"
 *   [ ] Below form: "Don't have an account?" / "Create an account"
 *
 * 6.2 Switch back to French
 *   [ ] Click "FR" in the language selector
 *   [ ] FR becomes bold/active, EN becomes dimmed
 *   [ ] All labels revert to French:
 *       - Subtitle: "Connectez-vous à votre compte"
 *       - Password label: "Mot de passe"
 *       - Submit: "Se connecter"
 *       - "Pas encore de compte ?" / "Créer un compte"
 *
 * 6.3 Error messages in English
 *   [ ] Switch to EN, then attempt login with wrong credentials
 *   [ ] Error message: "Invalid credentials" (not French)
 *
 * 6.4 Language persistence
 *   [ ] Switch to EN on login page
 *   [ ] Reload the page (F5)
 *   [ ] Page displays in English (language saved in localStorage)
 *   [ ] Switch back to FR for subsequent tests
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 Submit button loading state
 *   [ ] Enter valid credentials (admin@budgetos.local / Admin123!)
 *   [ ] Click "Se connecter"
 *   [ ] Button text and LogIn icon replaced by spinning circle
 *   [ ] Button has disabled attribute during loading
 *   [ ] Button is not clickable during loading (no double-submit)
 *   [ ] After success: redirect to dashboard
 *
 * 7.2 Loading state on error
 *   [ ] Enter wrong credentials
 *   [ ] Click "Se connecter"
 *   [ ] Button shows spinner briefly
 *   [ ] Spinner disappears, button returns to "Se connecter" with LogIn icon
 *   [ ] Error message is displayed
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — EDGE CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Very long email
 *   [ ] Enter email: "aaaaaaaaaa...@budgetos.local" (250+ characters)
 *   [ ] Enter password: Admin123!
 *   [ ] Click "Se connecter"
 *   [ ] Server responds with error (not a crash)
 *   [ ] Error message displayed gracefully
 *
 * 8.2 Special characters in password
 *   [ ] Enter email: admin@budgetos.local
 *   [ ] Enter password: "P@$$w0rd!#%&*<>éàü"
 *   [ ] Click "Se connecter"
 *   [ ] Error message: "Identifiants incorrects" (wrong password, but no crash)
 *   [ ] No encoding issue or server error
 *
 * 8.3 SQL injection attempt in email
 *   [ ] Enter email: "' OR 1=1 --@test.com"
 *   [ ] Enter password: anything
 *   [ ] Click "Se connecter"
 *   [ ] Either HTML5 validation blocks (invalid email), or server returns error
 *   [ ] No data leak or server crash
 *
 * 8.4 XSS attempt in email
 *   [ ] Enter email: "<script>alert(1)</script>@test.com"
 *   [ ] Enter password: anything
 *   [ ] Click "Se connecter"
 *   [ ] No script execution
 *   [ ] Error displayed safely (no unescaped HTML)
 *
 * 8.5 Whitespace-only inputs
 *   [ ] Enter email: "   " (spaces only)
 *   [ ] Enter password: "   " (spaces only)
 *   [ ] Click "Se connecter"
 *   [ ] Browser validation or server error — no crash
 *
 * 8.6 Navigate to /login when already authenticated
 *   [ ] Login successfully as admin@budgetos.local
 *   [ ] Manually navigate to /login
 *   [ ] Expected: either redirected to dashboard, or login page displayed
 *   [ ] No error or crash
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-02
 * Login: admin@budgetos.local / Admin123!
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Logo "B", title "BudgetOS", subtitle "Connectez-vous à votre compte",
 *          language selector "FR | EN", all present
 *   ✅ 1.2 Email (type=email, required, placeholder "vous@exemple.com"),
 *          Password (type=password, required, placeholder "••••••••"), Eye toggle button
 *   ✅ 1.3 Button "Se connecter", "Pas encore de compte ?", link "Créer un compte" → /register
 *   ✅ 1.4 Eye toggle: password → text (visible) → password (hidden), icon switches
 *
 * STEP 2 — Successful login:
 *   ✅ 2.1 admin@budgetos.local / Admin123! → spinner on button (disabled) → redirect to /
 *          Dashboard "Tableau de bord", ADMINISTRATION section visible
 *   ✅ 2.2 "Déconnexion" → /login, form empty
 *
 * STEP 3 — Login with different roles:
 *   ✅ 3.1 user@budgetos.local / Demo1234! → Dashboard, "John Doe", no ADMINISTRATION section
 *   ✅ 3.2 manager@budgetos.local / Demo1234! → Dashboard, "Jane Smith",
 *          ADMINISTRATION section with "Groupes" only (admin role, not super_admin)
 *
 * STEP 4 — Error cases:
 *   ✅ 4.1 Wrong password → "Identifiants incorrects", stays on /login, fields not cleared
 *   ✅ 4.2 Non-existent email → "Identifiants incorrects", stays on /login
 *   ✅ 4.3 Empty fields → HTML5 required validation blocks submission (confirmed via attributes)
 *   ✅ 4.4 Empty password → HTML5 required validation blocks submission
 *   ⬜ 4.5 Suspended account: not tested (requires manual suspension)
 *
 * STEP 5 — Validation:
 *   ✅ 5.1 Invalid email "notanemail" → HTML5 type=email validation blocks (confirmed via 8.3/8.4)
 *   ✅ 5.2 Partial email → HTML5 validation blocks
 *   ✅ 5.3 Both inputs have required attribute (confirmed via verbose snapshot)
 *
 * STEP 6 — i18n verification:
 *   ✅ 6.1 EN: "Sign in to your account", "Password", "Sign in",
 *          "Don't have an account?" / "Create an account", placeholder "you@example.com"
 *   ✅ 6.2 FR: "Connectez-vous à votre compte", "Mot de passe", "Se connecter",
 *          "Pas encore de compte ?" / "Créer un compte"
 *   ✅ 6.3 Error in EN: "Invalid credentials" (not French)
 *   ⬜ 6.4 Language persistence after reload: not explicitly tested
 *
 * STEP 7 — Loading states:
 *   ✅ 7.1 Submit → button disabled with spinner, then redirect (observed during 2.1)
 *   ✅ 7.2 Error → button shows spinner briefly, returns to "Se connecter" (observed during 4.1)
 *
 * STEP 8 — Edge cases:
 *   ⬜ 8.1 Very long email (250+ chars): not tested
 *   ✅ 8.2 Special chars in password "P@$$w0rd!#%&*<>éàü" → "Identifiants incorrects", no crash
 *   ✅ 8.3 SQL injection "' OR 1=1 --@test.com" → HTML5 validation blocks (invalid email)
 *   ✅ 8.4 XSS "<script>alert(1)</script>@test.com" → HTML5 validation blocks, no script exec
 *   ⬜ 8.5 Whitespace-only inputs: not tested
 *   ✅ 8.6 Navigate to /login when authenticated → redirected to / (dashboard)
 *
 */
