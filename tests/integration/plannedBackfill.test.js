import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestApp, createAuthenticatedAgent, seedSystemSettings } from './helpers.js'

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
    const res = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -100, description: 'Monthly Test', type: 'expense', frequency: 'monthly', startDate: '2026-01-15' })

    expect(res.status).toBe(201)
    expect(res.body.data.pastOccurrences).toBeGreaterThan(0)
    expect(res.body.data.pastDates).toContain('2026-01-15')

    await agent.delete(`/api/v1/planned-transactions/${res.body.data.plannedTransaction.id}`)
      .set('X-CSRF-Token', csrfToken)
  })

  it('should reconcile: create missing transactions', async () => {
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -200, description: 'Reconcile Create', type: 'expense', frequency: 'monthly', startDate: '2026-01-10' })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Reconcile creates transactions
    const r1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r1.body.data.created).toBeGreaterThan(0)

    // Second reconcile: nothing to do
    const r2 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r2.body.data.created).toBe(0)
    expect(r2.body.data.updated).toBe(0)

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should auto-update transaction dates when schedule changes via edit', async () => {
    // Create monthly starting Mar 2 → 1 past tx
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -150, description: 'Auto Update', type: 'expense', frequency: 'monthly', startDate: '2026-03-02' })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Reconcile → creates 1 tx at Mar 2
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})

    // Verify tx at Mar 2
    let txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    let txs = txRes.body.data.filter(tx => tx.recurringId === plannedId)
    expect(txs.length).toBe(1)
    expect(txs[0].date).toContain('2026-03-02')

    // Edit startDate to Mar 5 → update() auto-reconciles the date
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: '2026-03-05' })

    // Same number → no missing/excess, but date should be updated automatically
    expect(updateRes.body.data.missingOccurrences).toBe(0)
    expect(updateRes.body.data.excessOccurrences).toBe(0)

    // Verify tx date was auto-updated to Mar 5
    txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    txs = txRes.body.data.filter(tx => tx.recurringId === plannedId)
    expect(txs.length).toBe(1)
    expect(txs[0].date).toContain('2026-03-05')

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should auto-update dates AND detect missing when startDate moves back', async () => {
    // Create monthly Feb 1 → 2 past txs, reconcile
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -100, description: 'Move Back', type: 'expense', frequency: 'monthly', startDate: '2026-02-01' })
    const plannedId = createRes.body.data.plannedTransaction.id
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})

    // Edit to Jan 1 → expected [Jan 1, Feb 1, Mar 1], existing 2
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: '2026-01-01' })

    // Dates updated + 1 missing for user to confirm
    expect(updateRes.body.data.missingOccurrences).toBe(1)
    expect(updateRes.body.data.excessOccurrences).toBe(0)

    // Verify existing txs dates were updated to match new schedule
    let txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    let txs = txRes.body.data.filter(tx => tx.recurringId === plannedId).sort((a, b) => a.date.localeCompare(b.date))
    expect(txs.length).toBe(2)
    expect(txs[0].date).toContain('2026-01-01')
    expect(txs[1].date).toContain('2026-02-01')

    // User confirms → reconcile creates the missing Mar 1
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})

    txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    txs = txRes.body.data.filter(tx => tx.recurringId === plannedId).sort((a, b) => a.date.localeCompare(b.date))
    expect(txs.length).toBe(3)

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should detect excess when startDate moves forward and delete on confirm', async () => {
    // Create monthly Feb 1 → 2 past txs, reconcile
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -100, description: 'Move Forward', type: 'expense', frequency: 'monthly', startDate: '2026-02-01' })
    const plannedId = createRes.body.data.plannedTransaction.id
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})

    // Edit to Mar 15 → expected [Mar 15] only
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: '2026-03-15' })

    // 1 tx auto-updated to Mar 15, 1 excess
    expect(updateRes.body.data.excessOccurrences).toBe(1)

    // User confirms delete
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken)
      .send({ deleteExcess: true })

    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const txs = txRes.body.data.filter(tx => tx.recurringId === plannedId)
    expect(txs.length).toBe(1)
    expect(txs[0].date).toContain('2026-03-15')

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })
})
