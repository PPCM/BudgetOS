/**
 * E2E authentication helpers
 */

const DEFAULT_PASSWORD = 'TestPass1234'

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
}

/**
 * Register a user via API (faster than UI).
 * @param {import('@playwright/test').Page} page
 * @param {object} [opts]
 * @returns {Promise<{ email: string, password: string }>}
 */
export async function registerViaApi(page, opts = {}) {
  const email = opts.email || `e2e-${Date.now()}@test.com`
  const password = opts.password || DEFAULT_PASSWORD
  const baseURL = page.context()._options?.baseURL || 'http://localhost:3000'

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
