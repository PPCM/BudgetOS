/**
 * E2E authentication helpers
 *
 * With RBAC, the first registered user becomes super_admin and public
 * registration is disabled by default.  After bootstrap the helpers
 * automatically create a default group and enable public registration
 * so that subsequent test users can register normally.
 */

const DEFAULT_PASSWORD = 'TestPass1234'
const BOOTSTRAP_EMAIL = 'e2e-superadmin@test.com'

// Module-level flag — tracks whether bootstrap was done in THIS module load.
// Since Playwright re-imports modules per spec file, this resets each time.
let _bootstrappedInThisFile = false

/**
 * Enable public registration after the bootstrap user (super_admin)
 * has been created.  Creates a default group and updates system settings.
 * Must be called while the page session belongs to a super_admin.
 * @param {import('@playwright/test').Page} page
 * @param {string} baseURL
 */
async function enablePublicRegistration(page, baseURL) {
  // Fresh CSRF token (session changed after registration)
  const csrfRes = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken } = await csrfRes.json()

  // Create a default group for E2E test users
  const groupRes = await page.request.post(`${baseURL}/api/v1/groups`, {
    data: { name: 'E2E Default', description: 'Default group for E2E test users' },
    headers: { 'X-CSRF-Token': csrfToken },
  })
  const groupBody = await groupRes.json()
  const groupId = groupBody.data?.group?.id

  if (!groupId) {
    console.warn('[E2E] Failed to create default group:', groupBody)
    return
  }

  // Enable public registration with the default group
  await page.request.put(`${baseURL}/api/v1/admin/settings`, {
    data: {
      allowPublicRegistration: true,
      defaultRegistrationGroupId: groupId,
    },
    headers: { 'X-CSRF-Token': csrfToken },
  })
}

/**
 * Register a new user via the UI form.
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @param {string} [opts.email]
 * @param {string} [opts.password]
 * @param {string} [opts.firstName]
 * @param {string} [opts.lastName]
 */
export async function registerUser(page, opts = {}) {
  const email = opts.email || `e2e-${Date.now()}@test.com`
  const password = opts.password || DEFAULT_PASSWORD
  const firstName = opts.firstName || 'E2E'
  const lastName = opts.lastName || 'User'

  await page.goto('/register')
  await page.waitForLoadState('networkidle')

  await page.fill('input[name="email"], input[type="email"]', email)
  await page.fill('input[name="password"]:not([name*="Confirm"]):not([name*="confirm"])', password)
  await page.fill('input[name="passwordConfirm"], input[name="password_confirm"], input[name="confirmPassword"]', password)

  // Fill optional fields if they exist
  const firstNameInput = page.locator('input[name="firstName"], input[name="first_name"]')
  if (await firstNameInput.count() > 0) {
    await firstNameInput.fill(firstName)
  }
  const lastNameInput = page.locator('input[name="lastName"], input[name="last_name"]')
  if (await lastNameInput.count() > 0) {
    await lastNameInput.fill(lastName)
  }

  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')

  // If this is the first user (bootstrap → super_admin), enable public registration
  const baseURL = 'http://localhost:3000'
  const meRes = await page.request.get(`${baseURL}/api/v1/auth/me`)
  if (meRes.ok()) {
    const meBody = await meRes.json()
    if (meBody.data?.user?.role === 'super_admin') {
      _bootstrappedInThisFile = true
      await enablePublicRegistration(page, baseURL)
    }
  }

  return { email, password }
}

/**
 * Login an existing user via the UI form.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} [password]
 */
export async function loginUser(page, email, password = DEFAULT_PASSWORD) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Login form uses type attributes (no name attributes)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)

  await page.click('button[type="submit"]')
  await page.waitForLoadState('networkidle')
}

/**
 * Login via API for faster setup in non-auth tests.
 * Sets the session cookie directly.
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 * @param {string} [password]
 * @returns {Promise<string>} CSRF token for the session
 */
export async function loginViaApi(page, email, password = DEFAULT_PASSWORD) {
  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'

  // Get CSRF token
  const csrfRes = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken } = await csrfRes.json()

  // Login
  await page.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email, password },
    headers: { 'X-CSRF-Token': csrfToken },
  })

  // Navigate to trigger cookie storage
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  return csrfToken
}

/**
 * Ensure the bootstrap super_admin exists.
 * On the very first spec file, this registers the user.
 * On subsequent spec files, the user already exists in the DB — this is a no-op.
 * @param {import('@playwright/test').Page} page
 */
async function ensureBootstrap(page) {
  if (_bootstrappedInThisFile) return

  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'

  // Try to login as bootstrap user first (cheaper than register/bcrypt).
  // If user already exists, login succeeds and we're done.
  const csrfRes = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken } = await csrfRes.json()

  const loginRes = await page.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email: BOOTSTRAP_EMAIL, password: DEFAULT_PASSWORD },
    headers: { 'X-CSRF-Token': csrfToken },
  })

  if (loginRes.ok()) {
    // Bootstrap user exists — public registration is already set up
    _bootstrappedInThisFile = true
    return
  }

  // User doesn't exist yet — register (first spec file only)
  const csrfRes2 = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken: csrf2 } = await csrfRes2.json()

  const registerRes = await page.request.post(`${baseURL}/api/v1/auth/register`, {
    data: {
      email: BOOTSTRAP_EMAIL,
      password: DEFAULT_PASSWORD,
      passwordConfirm: DEFAULT_PASSWORD,
      firstName: 'E2E',
      lastName: 'SuperAdmin',
    },
    headers: { 'X-CSRF-Token': csrf2 },
  })

  const body = await registerRes.json()
  if (body.data?.user?.role === 'super_admin') {
    // First user — need to enable public registration
    await enablePublicRegistration(page, baseURL)
  }

  _bootstrappedInThisFile = true
}

/**
 * Register a user via API (faster than UI).
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @returns {Promise<{ email: string, password: string }>}
 */
export async function registerViaApi(page, opts = {}) {
  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'

  // Ensure bootstrap super_admin exists before registering any user
  await ensureBootstrap(page)

  const email = opts.email || `e2e-${Date.now()}@test.com`
  const password = opts.password || DEFAULT_PASSWORD

  // Get CSRF token
  const csrfRes = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken } = await csrfRes.json()

  // Register
  await page.request.post(`${baseURL}/api/v1/auth/register`, {
    data: {
      email,
      password,
      passwordConfirm: password,
      firstName: opts.firstName || 'E2E',
      lastName: opts.lastName || 'User',
    },
    headers: { 'X-CSRF-Token': csrfToken },
  })

  return { email, password }
}

/**
 * Login as the bootstrap super_admin via API.
 * Always uses the fixed BOOTSTRAP_EMAIL. Ensures bootstrap if needed.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ email: string, password: string, csrfToken: string }>}
 */
export async function loginAsSuperAdmin(page) {
  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'

  // Ensure bootstrap exists
  await ensureBootstrap(page)

  // Get a fresh CSRF token
  const csrfRes = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken: loginCsrf } = await csrfRes.json()

  // Login with the fixed bootstrap credentials
  await page.request.post(`${baseURL}/api/v1/auth/login`, {
    data: { email: BOOTSTRAP_EMAIL, password: DEFAULT_PASSWORD },
    headers: { 'X-CSRF-Token': loginCsrf },
  })

  // Get a fresh CSRF token for authenticated session
  const csrfRes2 = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken } = await csrfRes2.json()

  return { email: BOOTSTRAP_EMAIL, password: DEFAULT_PASSWORD, csrfToken }
}

/**
 * Create a user via the admin API.
 * Caller must already be logged in as super_admin.
 * @param {import('@playwright/test').Page} page
 * @param {string} csrfToken
 * @param {object} [opts]
 * @returns {Promise<{ user: object, email: string, password: string, status: number }>}
 */
export async function createUserViaAdmin(page, csrfToken, opts = {}) {
  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'
  const email = opts.email || `e2e-admin-${Date.now()}@test.com`
  const password = opts.password || DEFAULT_PASSWORD

  const res = await page.request.post(`${baseURL}/api/v1/admin/users`, {
    data: {
      email,
      password,
      firstName: opts.firstName || 'E2E',
      lastName: opts.lastName || 'User',
      role: opts.role || 'user',
      groupId: opts.groupId,
      locale: opts.locale || 'fr',
      currency: opts.currency || 'EUR',
    },
    headers: { 'X-CSRF-Token': csrfToken },
  })

  const body = await res.json()
  return { user: body.data?.user, email, password, status: res.status() }
}

/**
 * Get CSRF token for an already-authenticated page session.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
export async function getCsrfToken(page) {
  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'
  const res = await page.request.get(`${baseURL}/api/v1/csrf-token`)
  const { csrfToken } = await res.json()
  return csrfToken
}
