import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestApp, createAuthenticatedAgent, seedSystemSettings } from './helpers.js'

describe('Planned Transactions - Backfill past occurrences', () => {
  let app, agent, csrfToken, accountId

  beforeAll(async () => {
    app = await createTestApp()
    await seedSystemSettings()
    const auth = await createAuthenticatedAgent(app)
    agent = auth.agent
    csrfToken = auth.csrfToken

    // Create an account
    const res = await agent.post('/api/v1/accounts')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Test Backfill Account', type: 'checking', initialBalance: 5000 })
    accountId = res.body.data.account.id
  })

  afterAll(async () => {
    await app?.close?.()
  })

  it('should return pastOccurrences count when creating with past start date', async () => {
    const res = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({
        accountId,
        amount: -100,
        description: 'Monthly Test',
        type: 'expense',
        frequency: 'monthly',
        startDate: '2026-01-15',
      })

    expect(res.status).toBe(201)
    expect(res.body.data.pastOccurrences).toBeGreaterThan(0)
    expect(res.body.data.pastDates).toBeInstanceOf(Array)
    expect(res.body.data.pastDates.length).toBe(res.body.data.pastOccurrences)
    expect(res.body.data.pastDates).toContain('2026-01-15')
    expect(res.body.data.pastDates).toContain('2026-02-15')

    // Cleanup
    await agent.delete(`/api/v1/planned-transactions/${res.body.data.plannedTransaction.id}`)
      .set('X-CSRF-Token', csrfToken)
  })

  it('should return 0 pastOccurrences when start date is today or future', async () => {
    const today = new Date().toISOString().split('T')[0]
    const res = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({
        accountId,
        amount: -50,
        description: 'Future Test',
        type: 'expense',
        frequency: 'monthly',
        startDate: today,
      })

    expect(res.status).toBe(201)
    expect(res.body.data.pastOccurrences).toBe(0)
    expect(res.body.data.pastDates).toEqual([])

    await agent.delete(`/api/v1/planned-transactions/${res.body.data.plannedTransaction.id}`)
      .set('X-CSRF-Token', csrfToken)
  })

  it('should backfill past transactions without duplicates', async () => {
    // Create planned with past start date
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({
        accountId,
        amount: -200,
        description: 'Backfill Test',
        type: 'expense',
        frequency: 'monthly',
        startDate: '2026-01-10',
      })
    const plannedId = createRes.body.data.plannedTransaction.id

    // First backfill
    const backfill1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/backfill`)
      .set('X-CSRF-Token', csrfToken)
    expect(backfill1.status).toBe(200)
    expect(backfill1.body.data.created).toBeGreaterThan(0)
    const firstCount = backfill1.body.data.created

    // Second backfill should create 0 (no duplicates)
    const backfill2 = await agent.post(`/api/v1/planned-transactions/${plannedId}/backfill`)
      .set('X-CSRF-Token', csrfToken)
    expect(backfill2.status).toBe(200)
    expect(backfill2.body.data.created).toBe(0)

    // Verify transactions were created with correct recurring_id
    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const backfilledTxs = txRes.body.data.filter(tx => tx.recurringId === plannedId)
    expect(backfilledTxs.length).toBe(firstCount)

    // All should be marked as recurring
    for (const tx of backfilledTxs) {
      expect(tx.isRecurring).toBe(true)
    }

    // Cleanup
    await agent.delete(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
  })

  it('should not create duplicates even if user changed a transaction date', async () => {
    // Create planned with past start date (Jan 10 → should have Jan, Feb, Mar = 3 past)
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({
        accountId,
        amount: -300,
        description: 'Date Change Test',
        type: 'expense',
        frequency: 'monthly',
        startDate: '2026-01-10',
      })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Backfill creates 3 transactions
    const backfill1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/backfill`)
      .set('X-CSRF-Token', csrfToken)
    expect(backfill1.body.data.created).toBeGreaterThan(0)
    const count = backfill1.body.data.created

    // User changes the date of one transaction (simulating manual edit)
    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const targetTx = txRes.body.data.find(tx => tx.recurringId === plannedId)
    expect(targetTx).toBeDefined()

    await agent.put(`/api/v1/transactions/${targetTx.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        accountId: targetTx.accountId,
        amount: Math.abs(targetTx.amount),
        description: targetTx.description,
        type: targetTx.type,
        date: '2026-01-25', // Move from Jan 10 to Jan 25
      })

    // Second backfill should still create 0 (count-based, not date-based)
    const backfill2 = await agent.post(`/api/v1/planned-transactions/${plannedId}/backfill`)
      .set('X-CSRF-Token', csrfToken)
    expect(backfill2.body.data.created).toBe(0)

    // Total transactions for this recurring should still be the same
    const txRes2 = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const recurringTxs = txRes2.body.data.filter(tx => tx.recurringId === plannedId)
    expect(recurringTxs.length).toBe(count)

    // Cleanup
    await agent.delete(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
  })
})
