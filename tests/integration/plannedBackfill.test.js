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

    // First reconcile creates transactions
    const r1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken)
      .send({})
    expect(r1.body.data.created).toBeGreaterThan(0)
    expect(r1.body.data.updated).toBe(0)

    // Second reconcile: nothing to do
    const r2 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken)
      .send({})
    expect(r2.body.data.created).toBe(0)
    expect(r2.body.data.updated).toBe(0)

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should reconcile: update dates when schedule changes', async () => {
    // Create monthly starting Mar 2 → 1 past tx
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -150, description: 'Schedule Change', type: 'expense', frequency: 'monthly', startDate: '2026-03-02' })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Reconcile → creates 1 tx at Mar 2
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})

    // Edit: move start to Feb 5 → expected [Feb 5, Mar 5]
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: '2026-02-05' })

    expect(updateRes.body.data.missingOccurrences).toBe(1) // 2 expected - 1 existing
    expect(updateRes.body.data.excessOccurrences).toBe(0)

    // Reconcile → updates Mar 2 → Feb 5, creates Mar 5
    const r = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r.body.data.updated).toBe(1) // Mar 2 → Feb 5
    expect(r.body.data.created).toBe(1) // Mar 5

    // Verify: 2 transactions total, both with correct dates
    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const txs = txRes.body.data.filter(tx => tx.recurringId === plannedId).sort((a, b) => a.date.localeCompare(b.date))
    expect(txs.length).toBe(2)
    expect(txs[0].date).toContain('2026-02-05')
    expect(txs[1].date).toContain('2026-03-05')

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should reconcile: detect and delete excess when startDate moves forward', async () => {
    // Create monthly starting Feb 1 → 2 past txs
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -100, description: 'Excess Test', type: 'expense', frequency: 'monthly', startDate: '2026-02-01' })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Reconcile → creates 2 txs (Feb 1, Mar 1)
    await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})

    // Edit: move start to Mar 15 → expected [Mar 15] only
    const updateRes = await agent.put(`/api/v1/planned-transactions/${plannedId}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ startDate: '2026-03-15' })

    expect(updateRes.body.data.excessOccurrences).toBe(1) // 2 existing - 1 expected

    // Reconcile with deleteExcess → updates 1, deletes 1
    const r = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken)
      .send({ deleteExcess: true })
    expect(r.body.data.updated).toBe(1)  // First tx → Mar 15
    expect(r.body.data.excessDeleted).toBe(1) // Second tx deleted

    // Verify: 1 transaction at Mar 15
    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const txs = txRes.body.data.filter(tx => tx.recurringId === plannedId)
    expect(txs.length).toBe(1)
    expect(txs[0].date).toContain('2026-03-15')

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })

  it('should not create duplicates even if user changed a transaction date', async () => {
    // Create monthly starting Feb 10 → 2 past txs
    const createRes = await agent.post('/api/v1/planned-transactions')
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: -300, description: 'Date Edit Test', type: 'expense', frequency: 'monthly', startDate: '2026-02-10' })
    const plannedId = createRes.body.data.plannedTransaction.id

    // Reconcile → creates 2 txs
    const r1 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r1.body.data.created).toBe(2)

    // User manually changes first tx's date
    const txRes = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const targetTx = txRes.body.data.filter(tx => tx.recurringId === plannedId).sort((a, b) => a.date.localeCompare(b.date))[0]
    await agent.put(`/api/v1/transactions/${targetTx.id}`)
      .set('X-CSRF-Token', csrfToken)
      .send({ accountId, amount: 300, description: 'Date Edit Test', type: 'expense', date: '2026-02-25' })

    // Reconcile again → should realign dates, not create new ones
    const r2 = await agent.post(`/api/v1/planned-transactions/${plannedId}/reconcile`)
      .set('X-CSRF-Token', csrfToken).send({})
    expect(r2.body.data.created).toBe(0)
    expect(r2.body.data.updated).toBe(1) // Feb 25 → Feb 10

    // Total should still be 2
    const txRes2 = await agent.get(`/api/v1/transactions?accountId=${accountId}`)
    const txs = txRes2.body.data.filter(tx => tx.recurringId === plannedId)
    expect(txs.length).toBe(2)

    await agent.delete(`/api/v1/planned-transactions/${plannedId}`).set('X-CSRF-Token', csrfToken)
  })
})
