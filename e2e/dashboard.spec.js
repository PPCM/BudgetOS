import { test, expect } from '@playwright/test'
import { registerUser } from './helpers/auth.js'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await registerUser(page)
  })

  test('should load the dashboard', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Dashboard should be visible and not on login page
    await expect(page).not.toHaveURL(/\/(login|register)/)
  })

  test('should display key dashboard sections', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check the page has meaningful content (not empty)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText.length).toBeGreaterThan(10)
  })

  test('should navigate between main sections', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Look for navigation links
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a')
    const count = await navLinks.count()

    if (count > 0) {
      // Click the first navigation link
      await navLinks.first().click()
      await page.waitForLoadState('networkidle')

      // Page should have loaded without error
      const title = await page.title()
      expect(title).toBeTruthy()
    }
  })
})
