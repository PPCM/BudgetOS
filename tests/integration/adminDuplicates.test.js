/**
 * Integration tests for /api/v1/admin/duplicates/recurring endpoints.
 *
 * Covers detection and cleanup of duplicate recurring transactions caused by
 * the past hourly-scheduler bug where the same (recurring_id, date) pair
 * could end up duplicated multiple times in a single day.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import {
  createTestApp, createAuthenticatedSuperAdmin, createAuthenticatedAgent,
  setupTestDb, getTestDb, closeTestDb, resetTestDb, seedSystemSettings,
} from './helpers.js'

let app

beforeAll(async () => {
  await setupTestDb()
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestDb()
})

beforeEach(async () => {
  await resetTestDb()
  await seedSystemSettings()
})

// Helpers ---------------------------------------------------------------

async function createUserWithAccount({ role = 'user', balance = 1000 } = {}) {
  const ctx = role === 'super_admin'
    ? await createAuthenticatedSuperAdmin(app)
    : await createAuthenticatedAgent(app, { role })

  const accRes = await ctx.agent
    .post('/api/v1/accounts')
    .set('X-CSRF-Token', ctx.csrfToken)
    .send({ name: 'Checking', type: 'checking', initialBalance: balance })

  return { ...ctx, accountId: accRes.body.data.account.id }
}

async function insertPlannedTransaction(userId, accountId, overrides = {}) {
  const db = getTestDb()
  const id = uuidv4()
  await db('planned_transactions').insert({
    id,
    user_id: userId,
    account_id: accountId,
    amount: -50,
    description: 'Monthly Rent',
    type: 'expense',
    frequency: 'monthly',
    start_date: '2026-01-01',
    next_occurrence: '2026-02-01',
    is_active: true,
    ...overrides,
  })
  return id
}

// Insert raw transaction rows simulating duplicates from the bug.
async function insertDuplicateTransactions(userId, accountId, recurringId, {
  date = '2026-04-15',
  count = 3,
  amount = -50,
  description = 'Monthly Rent',
  reconciledIndex = -1,
} = {}) {
  const db = getTestDb()
  const ids = []
  const baseTime = Date.parse('2026-04-15T08:00:00Z')

  for (let i = 0; i < count; i++) {
    const id = uuidv4()
    ids.push(id)
    // Stagger created_at by 1 hour each to simulate the hourly cron
    const createdAt = new Date(baseTime + i * 3600 * 1000).toISOString()
    await db('transactions').insert({
      id,
      user_id: userId,
      account_id: accountId,
      amount,
      description,
      date,
      type: 'expense',
      status: 'pending',
      is_recurring: true,
      recurring_id: recurringId,
      is_reconciled: i === reconciledIndex,
      created_at: createdAt,
      updated_at: createdAt,
    })
  }
  return ids
}

async function getAccountBalance(accountId) {
  const db = getTestDb()
  const acc = await db('accounts').where('id', accountId).first()
  return Number(acc?.current_balance ?? 0)
}

// Tests -----------------------------------------------------------------

describe('Admin - Recurring Duplicates - Auth', () => {
  it('rejects access for regular user', async () => {
    const { agent } = await createAuthenticatedAgent(app)
    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.status).toBe(403)
  })

  it('rejects access for admin (not super_admin)', async () => {
    const { agent } = await createAuthenticatedAgent(app, { role: 'admin' })
    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.status).toBe(403)
  })

  it('rejects unauthenticated', async () => {
    const res = await (await import('supertest')).default(app).get('/api/v1/admin/duplicates/recurring')
    expect(res.status).toBe(401)
  })
})

describe('Admin - Recurring Duplicates - Preview (GET)', () => {
  it('returns empty when no duplicates exist', async () => {
    const { agent } = await createAuthenticatedSuperAdmin(app)
    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.status).toBe(200)
    expect(res.body.data.groupsFound).toBe(0)
    expect(res.body.data.totalDuplicates).toBe(0)
    expect(res.body.data.groups).toEqual([])
  })

  it('detects a single duplicate group', async () => {
    const { agent, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 3 })

    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.status).toBe(200)
    expect(res.body.data.groupsFound).toBe(1)
    expect(res.body.data.totalDuplicates).toBe(2) // 3 rows, keep 1, delete 2
    expect(res.body.data.groups[0]).toMatchObject({
      recurringId,
      date: '2026-04-15',
      count: 3,
    })
    expect(res.body.data.groups[0].deleteIds).toHaveLength(2)
  })

  it('does not flag a single transaction (count = 1)', async () => {
    const { agent, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 1 })

    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.body.data.groupsFound).toBe(0)
  })

  it('does not flag transactions on different dates', async () => {
    const { agent, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    await insertDuplicateTransactions(user.id, accountId, recurringId, { date: '2026-04-15', count: 1 })
    await insertDuplicateTransactions(user.id, accountId, recurringId, { date: '2026-05-15', count: 1 })

    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.body.data.groupsFound).toBe(0)
  })

  it('detects multiple groups across different dates and recurring ids', async () => {
    const { agent, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const r1 = await insertPlannedTransaction(user.id, accountId, { description: 'Rent' })
    const r2 = await insertPlannedTransaction(user.id, accountId, { description: 'Internet' })

    await insertDuplicateTransactions(user.id, accountId, r1, { date: '2026-04-15', count: 4 })
    await insertDuplicateTransactions(user.id, accountId, r2, { date: '2026-04-20', count: 2 })

    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.body.data.groupsFound).toBe(2)
    expect(res.body.data.totalDuplicates).toBe(3 + 1) // 4 rows -> 3 dup, 2 rows -> 1 dup
  })

  it('marks oldest by created_at as keepId when no reconciled exists', async () => {
    const { agent, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    const ids = await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 3 })

    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    // First inserted is oldest -> ids[0] should be the keepId
    expect(res.body.data.groups[0].keepId).toBe(ids[0])
    expect(res.body.data.groups[0].deleteIds).toEqual([ids[1], ids[2]])
  })

  it('marks reconciled transaction as keepId when one exists in the group', async () => {
    const { agent, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    // Reconcile the second-inserted (not the oldest) to verify reconciliation wins over age
    const ids = await insertDuplicateTransactions(user.id, accountId, recurringId, {
      count: 3,
      reconciledIndex: 1,
    })

    const res = await agent.get('/api/v1/admin/duplicates/recurring')
    expect(res.body.data.groups[0].keepId).toBe(ids[1])
    expect(res.body.data.groups[0].deleteIds).toEqual(expect.arrayContaining([ids[0], ids[2]]))
    expect(res.body.data.groups[0].deleteIds).toHaveLength(2)
  })
})

describe('Admin - Recurring Duplicates - Cleanup (POST)', () => {
  it('deletes excess transactions and keeps the right one', async () => {
    const { agent, csrfToken, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    const ids = await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 4 })

    const res = await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})

    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toBe(3) // 4 -> keep 1
    expect(res.body.data.errors).toEqual([])

    const db = getTestDb()
    const remaining = await db('transactions').where({ recurring_id: recurringId, date: '2026-04-15' })
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(ids[0])
  })

  it('recalculates the account balance after cleanup', async () => {
    // Initial balance 1000. Each duplicate tx is -50.
    // 4 rows = -200 total. After cleanup: only 1 row = -50.
    // Expected balance: 1000 - 50 = 950 (not 800).
    const { agent, csrfToken, user, accountId } = await createUserWithAccount({ role: 'super_admin', balance: 1000 })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 4, amount: -50 })

    // Trigger a balance recalculation by running cleanup. First, sanity-check
    // current balance reflects the duplicates by recalculating manually via API.
    await agent
      .post('/api/v1/accounts/recalculate')
      .set('X-CSRF-Token', csrfToken)
      .send({})
    const before = await getAccountBalance(accountId)
    expect(before).toBe(1000 - 200) // 4 x 50 expense

    await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})

    const after = await getAccountBalance(accountId)
    expect(after).toBe(1000 - 50)
  })

  it('preserves the reconciled transaction when present', async () => {
    const { agent, csrfToken, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    const ids = await insertDuplicateTransactions(user.id, accountId, recurringId, {
      count: 3,
      reconciledIndex: 2,
    })

    await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})

    const db = getTestDb()
    const remaining = await db('transactions').where('recurring_id', recurringId)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(ids[2])
    expect(Boolean(remaining[0].is_reconciled)).toBe(true)
  })

  it('is idempotent: a second run finds nothing to delete', async () => {
    const { agent, csrfToken, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 3 })

    const first = await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})
    expect(first.body.data.deleted).toBe(2)

    const second = await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})
    expect(second.body.data.deleted).toBe(0)
    expect(second.body.data.groupsFound).toBe(0)
  })

  it('does not touch non-recurring transactions', async () => {
    const { agent, csrfToken, user, accountId } = await createUserWithAccount({ role: 'super_admin' })
    const db = getTestDb()
    // Insert a normal (non-recurring) transaction
    const normalId = uuidv4()
    await db('transactions').insert({
      id: normalId,
      user_id: user.id,
      account_id: accountId,
      amount: -100,
      description: 'Manual purchase',
      date: '2026-04-15',
      type: 'expense',
      status: 'pending',
      is_recurring: false,
      recurring_id: null,
    })

    // Insert a single recurring transaction (no duplicate)
    const recurringId = await insertPlannedTransaction(user.id, accountId)
    await insertDuplicateTransactions(user.id, accountId, recurringId, { count: 1 })

    await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})

    const remaining = await db('transactions').count('* as count').first()
    expect(Number(remaining.count)).toBe(2)
  })

  it('rejects POST without CSRF token', async () => {
    const { agent } = await createAuthenticatedSuperAdmin(app)
    const res = await agent.post('/api/v1/admin/duplicates/recurring/cleanup').send({})
    expect(res.status).toBe(403)
  })

  it('rejects POST for non-super_admin', async () => {
    const { agent, csrfToken } = await createAuthenticatedAgent(app, { role: 'admin' })
    const res = await agent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', csrfToken)
      .send({})
    expect(res.status).toBe(403)
  })

  it('isolates duplicates per user', async () => {
    // User A has duplicates, User B has none. Cleanup should only delete A's rows.
    const { agent: adminAgent, csrfToken: adminCsrf } = await createAuthenticatedSuperAdmin(app)

    const userA = await createUserWithAccount({ role: 'user', balance: 500 })
    const recA = await insertPlannedTransaction(userA.user.id, userA.accountId)
    await insertDuplicateTransactions(userA.user.id, userA.accountId, recA, { count: 3 })

    const userB = await createUserWithAccount({ role: 'user', balance: 500 })
    const recB = await insertPlannedTransaction(userB.user.id, userB.accountId)
    await insertDuplicateTransactions(userB.user.id, userB.accountId, recB, { count: 1 })

    const res = await adminAgent
      .post('/api/v1/admin/duplicates/recurring/cleanup')
      .set('X-CSRF-Token', adminCsrf)
      .send({})

    expect(res.body.data.deleted).toBe(2)

    const db = getTestDb()
    const remainingA = await db('transactions').where({ user_id: userA.user.id, recurring_id: recA })
    const remainingB = await db('transactions').where({ user_id: userB.user.id, recurring_id: recB })
    expect(remainingA).toHaveLength(1)
    expect(remainingB).toHaveLength(1)
  })
})
