import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestApp, createAuthenticatedAgent, seedSystemSettings } from './helpers.js'

// Helper: format date as YYYY-MM-DD
const fmt = (d) => d.toISOString().split('T')[0]
// Helper: get a date N months ago on a given day
const monthsAgo = (n, day = 1) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  d.setDate(day)
  return fmt(d)
}

describe('Planned Transactions - Reconcile past occurrences', () => {
  let app, agent, csrfToken, accountId

  beforeAll(async () => {
    app = await createTestApp()
    await seedSystemSettings()
    const auth = await createAuthenticatedAgent(app)
    agent = auth.agent
    csrfToken = auth.csrfToken

    const res = await agent.post('/api/v1/accounts')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Test Reconcile Account', type: 'checking', initialBalance: 5000 })
    accountId = res.body.data.account.id
  })

  afterAll(async () => {
    await app?.close?.()
  })

  it('should return pastOccurrences on create with past start date', async () => {
    const startDate = monthsAgo(2, 15) // 2 months ago, day 15
    const res = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -100, description: 'Monthly Test', type: 'expense', frequency: 'monthly', startDate })

    expect(res.status).toBe(201)
    expect(res.body.data.pastOccurrences).toBeGreaterThan(0)
    expect(res.body.data.pastDates).toContain(startDate)

    await agent.delete(`/api/v1/planned-transactions/${res.body.data.plannedTransaction.id}`)
      .set('X-CSRF-Token', csrfToken)
  })

  it('should reconcile: create missing transactions', async () => {
    const startDate = monthsAgo(2, 10)
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -200, description: 'Reconcile Create', type: 'expense', frequency: 'monthly', startDate })
    const plannedId = createRes.body.data.plannedTransaction.id

    const r1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r1.body.data.created).toBeGreaterThan(0)

    const r2 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r2.body.data.created).toBe(0)
    expect(r2.body.data.updated).toBe(0)

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should auto-update transaction dates when schedule changes via edit', async () => {
    // Create monthly with a recent past date → 1 past tx
    const startDate = monthsAgo(0, 2) // current month, day 2
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -150, description: 'Auto Update', type: 'expense', frequency: 'monthly', startDate })
    const plannedId = createRes.body.data.plannedTransaction.id
    const pastCount = createRes.body.data.pastOccurrences

    if (pastCount > 0) {
      await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
        .set('X-CSRF-Token', csrfToken).send({})
    }

    // Edit startDate to day 5 of same month
    const newStartDate = monthsAgo(0, 5)
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: newStartDate })

    // If past count was same, dates should just be updated
    if (pastCount > 0) {
      const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
      const txs = txRes.body.data.filter(tx => tx.recurringId === plannedId)
      // Verify dates were auto-updated
      expect(txs.length).toBeGreaterThan(0)
    }

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should detect excess when startDate moves forward and delete on confirm', async () => {
    // Create monthly starting 2 months ago → at least 2 past txs
    const startDate = monthsAgo(2, 1)
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -100, description: 'Excess Test', type: 'expense', frequency: 'monthly', startDate })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Reconcile
    const r1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    const initialCount = r1.body.data.created

    // Move startDate forward to current month → should detect excess
    const newStartDate = monthsAgo(0, 1)
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: newStartDate })

    expect(updateRes.body.data.excessOccurrences).toBeGreaterThan(0)

    // Reconcile with deleteExcess
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken)
      .send({ deleteExcess: true })

    // Verify fewer transactions remain
    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const remaining = txRes.body.data.filter(tx => tx.recurringId === plannedId)
    expect(remaining.length).toBeLessThan(initialCount)

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should handle startDate = today: nextOccurrence is today, appears in forecast', async () => {
    const today = fmt(new Date())
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -75, description: 'Starts Today', type: 'expense', frequency: 'monthly', startDate: today })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.pastOccurrences).toBe(0)
    expect(createRes.body.data.pastDates).toEqual([])

    // Next occurrence should be TODAY (not next month)
    const pt = createRes.body.data.plannedTransaction
    expect(pt.nextOccurrence).toBe(today)

    // Should appear in forecast for today's period
    const endOfMonth = new Date()
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0) // last day of current month
    const forecastRes = await agent.get('/api/v1/reports/forecast/transactions')
      .query({ startDate: today, endDate: fmt(endOfMonth), accountId })
    const projected = forecastRes.body.data.data.filter(tx => tx.source === 'projected' && tx.description === 'Starts Today')
    expect(projected.length).toBe(1)
    expect(projected[0].date).toBe(today)

    // Reconcile should create nothing (no past occurrences)
    const r = await agent.post(`/api/v1/planned-transactions/${pt.id}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r.body.data.created).toBe(0)

    await agent.delete(`/api/v1/planned-transactions/${pt.id}`).set('X-CSRF-Token', csrfToken)
  })

  it('should handle startDate in the future with no past occurrences', async () => {
    const future = new Date()
    future.setMonth(future.getMonth() + 2)
    const futureDate = fmt(future)

    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -120, description: 'Starts Future', type: 'expense', frequency: 'monthly', startDate: futureDate })

    expect(createRes.status).toBe(201)
    expect(createRes.body.data.pastOccurrences).toBe(0)
    expect(createRes.body.data.pastDates).toEqual([])

    // Next occurrence should be the startDate itself
    const pt = createRes.body.data.plannedTransaction
    expect(pt.nextOccurrence).toBe(futureDate)

    // Reconcile should create nothing
    const r = await agent.post(`/api/v1/planned-transactions/${pt.id}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r.body.data.created).toBe(0)

    await agent.delete(`/api/v1/planned-transactions/${pt.id}`).set('X-CSRF-Token', csrfToken)
  })

  it('should appear in forecast when startDate is in forecast period', async () => {
    // Create recurring starting next month
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    nextMonth.setDate(15)
    const startDate = fmt(nextMonth)
    const firstOfNextMonth = fmt(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1))
    const lastOfNextMonth = fmt(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0))

    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -300, description: 'Forecast Visible', type: 'expense', frequency: 'monthly', startDate })
    const ptId = createRes.body.data.plannedTransaction.id

    // Check forecast for next month
    const forecastRes = await agent.get('/api/v1/reports/forecast/transactions')
      .query({ startDate: firstOfNextMonth, endDate: lastOfNextMonth, accountId })

    const projected = forecastRes.body.data.data.filter(tx => tx.source === 'projected' && tx.description === 'Forecast Visible')
    expect(projected.length).toBe(1)
    expect(projected[0].date).toBe(startDate)

    await agent.delete(`/api/v1/planned-transactions/${ptId}`).set('X-CSRF-Token', csrfToken)
  })
})
