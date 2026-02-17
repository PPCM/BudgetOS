/**
 * UI Test: Register Page (Registration, Validation, i18n)
 *
 * Tested via Chrome MCP
 *
 * Pre-conditions:
 *   - Server running on http://localhost:3000
 *   - Database seeded with demo data (npm run db:seed)
 *   - Public registration enabled in system settings (admin > Paramètres système)
 *   - Seed users:
 *     - admin@budgetos.local / Admin123! (super_admin)
 *     - manager@budgetos.local / Demo1234! (admin)
 *     - user@budgetos.local / Demo1234! (user)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 1 — PAGE DISPLAY (PUBLIC REGISTRATION ENABLED)
 * ═══════════════════════════════════════════════════════════
 *
 * 1.1 Initial page state (FR — default locale)
 *   [ ] Navigate to http://localhost:3000/register
 *   [ ] Logo: circle with "B" letter displayed
 *   [ ] Title: "Créer un compte"
 *   [ ] Subtitle: "Commencez à gérer vos finances"
 *   [ ] Language selector in top-right corner: "FR | EN" (FR is bold/active)
 *
 * 1.2 Form fields (FR labels)
 *   [ ] First row (2 columns side by side):
 *       - Left: label "Prénom", input with User icon, placeholder "Jean"
 *       - Right: label "Nom", input without icon, placeholder "Dupont"
 *   [ ] Email label: "Email"
 *   [ ] Email input with Mail icon (left), placeholder "vous@exemple.com"
 *   [ ] Email input type="email", has "required" attribute
 *   [ ] Password label: "Mot de passe"
 *   [ ] Password input with Lock icon (left), placeholder "Min. 8 car., 1 majuscule, 1 minuscule, 1 chiffre"
 *   [ ] Password input type="password", has "required" attribute
 *   [ ] Eye icon button (right side) to toggle password visibility
 *   [ ] Confirm label: "Confirmer"
 *   [ ] Confirm input with Lock icon (left), placeholder "Répéter le mot de passe"
 *   [ ] Confirm input type="password", has "required" attribute
 *   [ ] Eye icon button (right side) to toggle confirm visibility
 *
 * 1.3 Submit button and links
 *   [ ] Submit button: "Créer mon compte" with UserPlus icon
 *   [ ] Below form text: "Déjà un compte ?"
 *   [ ] Link: "Se connecter" pointing to /login
 *
 * 1.4 Password visibility toggle (independent per field)
 *   [ ] Each password field has its own Eye icon toggle button
 *   [ ] Click Eye icon on password field — only password switches to type="text"
 *   [ ] Confirm field remains type="password" (independent toggle)
 *   [ ] Icon changes to EyeOff on password field only
 *   [ ] Click EyeOff on password — password switches back to type="password"
 *   [ ] Click Eye icon on confirm field — only confirm switches to type="text"
 *   [ ] Password field remains type="password" (independent toggle)
 *   [ ] Toggle buttons have tabIndex=-1 (not reachable via Tab key)
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 2 — SUCCESSFUL REGISTRATION
 * ═══════════════════════════════════════════════════════════
 *
 * 2.1 Register a new user
 *   [ ] Enter first name: "Test"
 *   [ ] Enter last name: "User"
 *   [ ] Enter email: testuser@example.com
 *   [ ] Enter password: TestPass1!
 *   [ ] Enter confirm: TestPass1!
 *   [ ] Click "Créer mon compte"
 *   [ ] Button shows spinner during request (loading state)
 *   [ ] Redirects to / (dashboard)
 *   [ ] Dashboard displays "Tableau de bord" title
 *   [ ] User is logged in (sidebar shows user info)
 *
 * 2.2 Logout and verify new account
 *   [ ] Click "Déconnexion"
 *   [ ] Navigate to /login
 *   [ ] Login with testuser@example.com / TestPass1!
 *   [ ] Successfully redirects to dashboard
 *   [ ] Logout
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 3 — ERROR CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 3.1 Existing email
 *   [ ] Enter first name: "Admin"
 *   [ ] Enter last name: "Duplicate"
 *   [ ] Enter email: admin@budgetos.local (already exists)
 *   [ ] Enter password: ValidPass1!
 *   [ ] Enter confirm: ValidPass1!
 *   [ ] Click "Créer mon compte"
 *   [ ] Toast error: "Cette adresse email est déjà utilisée"
 *   [ ] Page stays on /register
 *   [ ] Form data is preserved (not cleared)
 *
 * 3.2 Password mismatch
 *   [ ] Enter first name: "Test"
 *   [ ] Enter last name: "Mismatch"
 *   [ ] Enter email: mismatch@example.com
 *   [ ] Enter password: ValidPass1!
 *   [ ] Enter confirm: DifferentPass2!
 *   [ ] Click "Créer mon compte"
 *   [ ] Toast error: "Les mots de passe ne correspondent pas"
 *   [ ] No API request sent (client-side check)
 *   [ ] Page stays on /register
 *
 * 3.3 Weak password (too short)
 *   [ ] Enter first name: "Test"
 *   [ ] Enter last name: "Weak"
 *   [ ] Enter email: weak@example.com
 *   [ ] Enter password: "abc" (less than 8 characters)
 *   [ ] Enter confirm: "abc"
 *   [ ] Click "Créer mon compte"
 *   [ ] Toast error with password validation message
 *   [ ] Page stays on /register
 *
 * 3.4 Weak password (no uppercase)
 *   [ ] Enter password: "password1" (no uppercase letter)
 *   [ ] Enter confirm: "password1"
 *   [ ] Click "Créer mon compte"
 *   [ ] Toast error: password must contain uppercase, lowercase, and digit
 *
 * 3.5 Weak password (no digit)
 *   [ ] Enter password: "PasswordABC" (no digit)
 *   [ ] Enter confirm: "PasswordABC"
 *   [ ] Click "Créer mon compte"
 *   [ ] Toast error: password must contain uppercase, lowercase, and digit
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 4 — VALIDATION
 * ═══════════════════════════════════════════════════════════
 *
 * 4.1 Required fields — email empty
 *   [ ] Leave email empty, fill other fields
 *   [ ] Click "Créer mon compte"
 *   [ ] Browser shows HTML5 validation tooltip on email field (required)
 *   [ ] No API request sent
 *
 * 4.2 Required fields — password empty
 *   [ ] Fill email, leave password empty
 *   [ ] Click "Créer mon compte"
 *   [ ] Browser shows HTML5 validation tooltip on password field (required)
 *
 * 4.3 Required fields — confirm empty
 *   [ ] Fill email and password, leave confirm empty
 *   [ ] Click "Créer mon compte"
 *   [ ] Browser shows HTML5 validation tooltip on confirm field (required)
 *
 * 4.4 Invalid email format
 *   [ ] Enter email: "notanemail" (no @ sign)
 *   [ ] Click "Créer mon compte"
 *   [ ] Browser shows HTML5 validation tooltip (type="email")
 *
 * 4.5 First name and last name are optional
 *   [ ] Leave first name and last name empty
 *   [ ] Fill email, password, and confirm with valid data
 *   [ ] Click "Créer mon compte"
 *   [ ] Registration succeeds (first/last name not marked required)
 *
 * 4.6 Password requirements hint
 *   [ ] Password placeholder displays: "Min. 8 car., 1 majuscule, 1 minuscule, 1 chiffre"
 *   [ ] This serves as the inline validation hint for users
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 5 — i18n VERIFICATION
 * ═══════════════════════════════════════════════════════════
 *
 * 5.1 French labels (default)
 *   [ ] Navigate to /register
 *   [ ] Title: "Créer un compte"
 *   [ ] Subtitle: "Commencez à gérer vos finances"
 *   [ ] Labels: "Prénom", "Nom", "Email", "Mot de passe", "Confirmer"
 *   [ ] Placeholders: "Jean", "Dupont", "vous@exemple.com",
 *       "Min. 8 car., 1 majuscule, 1 minuscule, 1 chiffre", "Répéter le mot de passe"
 *   [ ] Button: "Créer mon compte"
 *   [ ] Link text: "Déjà un compte ?" / "Se connecter"
 *
 * 5.2 Switch to English
 *   [ ] Click "EN" in the language selector (top-right)
 *   [ ] EN becomes bold/active
 *   [ ] Title changes to: "Create an account"
 *   [ ] Subtitle: "Start managing your finances"
 *   [ ] Labels: "First name", "Last name", "Email", "Password", "Confirm"
 *   [ ] Placeholders: "John", "Doe", "you@example.com",
 *       "Min. 8 chars, 1 uppercase, 1 lowercase, 1 digit", "Repeat password"
 *   [ ] Button: "Create my account"
 *   [ ] Link text: "Already have an account?" / "Sign in"
 *
 * 5.3 Error messages in English
 *   [ ] While in EN, submit with mismatched passwords
 *   [ ] Toast error: "Passwords do not match"
 *
 * 5.4 Switch back to French
 *   [ ] Click "FR" in the language selector
 *   [ ] All labels revert to French
 *   [ ] Verify a few: "Prénom", "Mot de passe", "Créer mon compte"
 *
 * 5.5 Language persistence
 *   [ ] Switch to EN, reload the page (F5)
 *   [ ] Page displays in English (localStorage persistence)
 *   [ ] Switch back to FR for subsequent tests
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 6 — LOADING STATES
 * ═══════════════════════════════════════════════════════════
 *
 * 6.1 Submit button loading state
 *   [ ] Fill all fields with valid data
 *   [ ] Click "Créer mon compte"
 *   [ ] Button text and UserPlus icon replaced by spinning circle
 *   [ ] Button has disabled attribute during loading
 *   [ ] Button is not clickable during loading (no double-submit)
 *   [ ] After success: redirect to dashboard
 *
 * 6.2 Loading state on error
 *   [ ] Fill form with existing email (admin@budgetos.local)
 *   [ ] Click "Créer mon compte"
 *   [ ] Button shows spinner briefly
 *   [ ] Spinner disappears, button returns to "Créer mon compte" with UserPlus icon
 *   [ ] Toast error message is displayed
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 7 — EDGE CASES
 * ═══════════════════════════════════════════════════════════
 *
 * 7.1 Special characters in first name
 *   [ ] Enter first name: "Jean-François"
 *   [ ] Enter last name: "O'Brien"
 *   [ ] Fill rest with valid data
 *   [ ] Click "Créer mon compte"
 *   [ ] Registration succeeds — names stored correctly
 *   [ ] Dashboard or settings shows "Jean-François O'Brien"
 *
 * 7.2 Very long names
 *   [ ] Enter first name: 200+ character string
 *   [ ] Enter last name: 200+ character string
 *   [ ] Fill rest with valid data
 *   [ ] Click "Créer mon compte"
 *   [ ] Server responds with validation error (e.g., "Prénom trop long")
 *   [ ] No crash or server error 500
 *
 * 7.3 Unicode characters in names
 *   [ ] Enter first name: "Émilie"
 *   [ ] Enter last name: "Müller"
 *   [ ] Fill rest with valid data
 *   [ ] Registration succeeds — no encoding issue
 *
 * 7.4 Whitespace-only names
 *   [ ] Enter first name: "   " (spaces only)
 *   [ ] Enter last name: "   " (spaces only)
 *   [ ] Fill rest with valid data
 *   [ ] Either: server trims and registers, or validation error
 *   [ ] No crash
 *
 * 7.5 Very long email
 *   [ ] Enter email: "aaaaaaaaaa...@example.com" (250+ characters)
 *   [ ] Fill rest with valid data
 *   [ ] Click "Créer mon compte"
 *   [ ] Server responds with error (e.g., "Adresse email trop longue")
 *   [ ] No crash
 *
 * ═══════════════════════════════════════════════════════════
 * STEP 8 — REGISTRATION DISABLED
 * ═══════════════════════════════════════════════════════════
 *
 * 8.1 Disable public registration
 *   [ ] Login as admin@budgetos.local / Admin123!
 *   [ ] Navigate to Administration > Paramètres système
 *   [ ] Toggle "Inscription publique" to OFF
 *   [ ] Save settings
 *   [ ] Logout
 *
 * 8.2 Attempt to register when disabled
 *   [ ] Navigate to /register
 *   [ ] Fill all fields with valid data (new unique email)
 *   [ ] Click "Créer mon compte"
 *   [ ] Toast error: "L'inscription publique est désactivée"
 *   [ ] Page stays on /register
 *   [ ] No account created
 *
 * 8.3 Direct link to /register still accessible
 *   [ ] Navigate to /register — page is rendered (not a 404)
 *   [ ] Form is displayed but submission is rejected by server
 *   [ ] "Se connecter" link still works and navigates to /login
 *
 * 8.4 Re-enable public registration (cleanup)
 *   [ ] Login as admin@budgetos.local / Admin123!
 *   [ ] Navigate to Administration > Paramètres système
 *   [ ] Toggle "Inscription publique" to ON
 *   [ ] Save settings
 *   [ ] Logout
 *
 * ═══════════════════════════════════════════════════════════
 * RESULTS LOG
 * ═══════════════════════════════════════════════════════════
 *
 * Last tested: 2026-02-17
 * Login: (no login needed - public page)
 *
 * STEP 1 — Page display:
 *   ✅ 1.1 Title "Créer un compte", subtitle "Commencez à gérer vos finances"
 *   ✅ 1.2 Language selector FR/EN
 *   ✅ 1.3 Fields: Prénom (placeholder "Jean"), Nom ("Dupont"), Email (required, "vous@exemple.com"),
 *          Mot de passe (required, hint complexité), Confirmer (required), eye toggles
 *   ✅ 1.4 Password toggles are independent: clicking Eye on password reveals only
 *          password field, confirm stays masked (and vice versa). tabIndex=-1 on buttons.
 *   ✅ 1.5 Button "Créer mon compte", link "Se connecter" → /login
 *
 * STEP 2 — Successful registration: ⬜ Not tested (would create real user)
 *
 * STEP 3 — Error cases:
 *   ✅ 3.1 Password mismatch → toast "Erreur" / "Les mots de passe ne correspondent pas"
 *   ⬜ 3.2 Existing email, weak password, server error: not tested
 *
 * STEP 4 — Validation: ✅ Email required, password required, confirm required (HTML5 attributes)
 *
 * STEP 5 — i18n:
 *   ✅ 5.1 FR: Créer un compte, Commencez à gérer vos finances, Prénom, Nom,
 *          Mot de passe, Confirmer, Créer mon compte, Déjà un compte?, Se connecter
 *   ✅ 5.2 EN: Create an account, Start managing your finances, First name (John),
 *          Last name (Doe), Password (hint EN), Confirm (Repeat password),
 *          Create my account, Already have an account?, Sign in
 *
 * STEP 6-8 — Loading/edge cases/registration disabled: ⬜ Not tested
 *
 */
