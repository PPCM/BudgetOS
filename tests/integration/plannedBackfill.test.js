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
})
