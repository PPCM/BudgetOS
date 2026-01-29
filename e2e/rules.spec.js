import { test, expect } from '@playwright/test'
import { registerViaApi } from './helpers/auth.js'

const BASE = 'http://localhost:3000'

test.describe('Rules — CRUD, test and apply', () => {
  let csrfToken
  let accountId
  let categoryId

  test.beforeEach(async ({ page }) => {
    await registerViaApi(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const csrfRes = await page.request.get(`${BASE}/api/v1/csrf-token`)
    csrfToken = (await csrfRes.json()).csrfToken

    // Create account
    const accRes = await page.request.post(`${BASE}/api/v1/accounts`, {
      data: { name: 'Main Account', type: 'checking', initialBalance: 5000 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    accountId = (await accRes.json()).data.account.id

    // Create category
    const catRes = await page.request.post(`${BASE}/api/v1/categories`, {
      data: { name: 'Groceries', type: 'expense' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    categoryId = (await catRes.json()).data.category.id
  })

  test('should create rule with single condition', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'Grocery Rule',
        conditions: [
          { field: 'description', operator: 'contains', value: 'grocery' },
        ],
        actionCategoryId: categoryId,
        actionTags: ['food', 'weekly'],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.rule.name).toBe('Grocery Rule')
    expect(body.data.rule.conditions.length).toBe(1)
    expect(body.data.rule.actionCategoryId).toBe(categoryId)
    expect(body.data.rule.actionTags).toEqual(['food', 'weekly'])
  })

  test('should create rule with multiple conditions', async ({ page }) => {
    const res = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'Multi Condition Rule',
        conditions: [
          { field: 'description', operator: 'contains', value: 'market' },
          { field: 'amount', operator: 'less_than', value: -10 },
        ],
        conditionLogic: 'and',
        actionCategoryId: categoryId,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.data.rule.conditions.length).toBe(2)
  })

  test('should list rules with sorting', async ({ page }) => {
    // Create 2 rules with different priorities
    await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'Low Priority',
        priority: 10,
        conditions: [{ field: 'description', operator: 'contains', value: 'a' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'High Priority',
        priority: 90,
        conditions: [{ field: 'description', operator: 'contains', value: 'b' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })

    const res = await page.request.get(`${BASE}/api/v1/rules?sortBy=priority&sortOrder=desc`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.rules.length).toBeGreaterThanOrEqual(2)
    // First rule should have higher priority
    expect(body.data.rules[0].priority).toBeGreaterThanOrEqual(body.data.rules[1].priority)
  })

  test('should get single rule with parsed conditions', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'Get Test Rule',
        conditions: [{ field: 'description', operator: 'equals', value: 'test' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const ruleId = (await createRes.json()).data.rule.id

    const res = await page.request.get(`${BASE}/api/v1/rules/${ruleId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.rule.id).toBe(ruleId)
    expect(Array.isArray(body.data.rule.conditions)).toBe(true)
    expect(body.data.rule.conditions[0].field).toBe('description')
  })

  test('should update rule', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'To Update',
        priority: 5,
        conditions: [{ field: 'description', operator: 'contains', value: 'old' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const ruleId = (await createRes.json()).data.rule.id

    const res = await page.request.put(`${BASE}/api/v1/rules/${ruleId}`, {
      data: { name: 'Updated Rule', priority: 50 },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.rule.name).toBe('Updated Rule')
    expect(body.data.rule.priority).toBe(50)
  })

  test('should delete rule', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'To Delete',
        conditions: [{ field: 'description', operator: 'contains', value: 'x' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const ruleId = (await createRes.json()).data.rule.id

    const res = await page.request.delete(`${BASE}/api/v1/rules/${ruleId}`, {
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
  })

  test('should test rule — match', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'Match Test Rule',
        conditions: [{ field: 'description', operator: 'contains', value: 'grocery' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const ruleId = (await createRes.json()).data.rule.id

    const res = await page.request.post(`${BASE}/api/v1/rules/${ruleId}/test`, {
      data: { description: 'Weekly grocery shopping' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.matches).toBe(true)
  })

  test('should test rule — no match', async ({ page }) => {
    const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'No Match Rule',
        conditions: [{ field: 'description', operator: 'contains', value: 'grocery' }],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const ruleId = (await createRes.json()).data.rule.id

    const res = await page.request.post(`${BASE}/api/v1/rules/${ruleId}/test`, {
      data: { description: 'Gas station' },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data.matches).toBe(false)
  })

  test('should apply rule to transaction', async ({ page }) => {
    // Create a rule that sets category and tags
    const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
      data: {
        name: 'Apply Rule',
        conditions: [{ field: 'description', operator: 'contains', value: 'shop' }],
        actionCategoryId: categoryId,
        actionTags: ['shopping', 'auto'],
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const ruleId = (await createRes.json()).data.rule.id

    // Create a transaction
    const txRes = await page.request.post(`${BASE}/api/v1/transactions`, {
      data: {
        accountId,
        amount: -30,
        description: 'Online shop purchase',
        date: '2026-01-15',
        type: 'expense',
      },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    const txId = (await txRes.json()).data.transaction.id

    // Apply the rule
    const applyRes = await page.request.post(`${BASE}/api/v1/rules/${ruleId}/apply`, {
      data: { transactionId: txId },
      headers: { 'X-CSRF-Token': csrfToken },
    })
    expect(applyRes.status()).toBe(200)

    // Verify transaction was updated
    const getRes = await page.request.get(`${BASE}/api/v1/transactions/${txId}`)
    const tx = (await getRes.json()).data.transaction
    expect(tx.categoryId).toBe(categoryId)
    expect(tx.tags).toEqual(expect.arrayContaining(['shopping', 'auto']))
  })

  test('should test multiple operators', async ({ page }) => {
    const operators = [
      { field: 'description', operator: 'contains', value: 'coffee', testData: { description: 'Morning coffee' }, expected: true },
      { field: 'description', operator: 'starts_with', value: 'Weekly', testData: { description: 'Weekly groceries' }, expected: true },
      { field: 'amount', operator: 'greater_than', value: -50, testData: { amount: -30 }, expected: true },
      { field: 'amount', operator: 'less_than', value: -10, testData: { amount: -30 }, expected: true },
      { field: 'amount', operator: 'between', value: [-100, -10], testData: { amount: -50 }, expected: true },
      { field: 'description', operator: 'regex', value: '^[A-Z]', testData: { description: 'Starts with capital' }, expected: true },
    ]

    for (const { field, operator, value, testData, expected } of operators) {
      const createRes = await page.request.post(`${BASE}/api/v1/rules`, {
        data: {
          name: `Test ${operator}`,
          conditions: [{ field, operator, value }],
        },
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(createRes.status()).toBe(201)
      const ruleId = (await createRes.json()).data.rule.id

      const testRes = await page.request.post(`${BASE}/api/v1/rules/${ruleId}/test`, {
        data: testData,
        headers: { 'X-CSRF-Token': csrfToken },
      })
      expect(testRes.status()).toBe(200)
      const body = await testRes.json()
      expect(body.data.matches).toBe(expected)
    }
  })
})
