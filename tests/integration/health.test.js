/**
 * Integration tests for GET /api/v1/health
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import { createTestApp, setupTestDb, closeTestDb } from './helpers.js'

let app

beforeAll(async () => {
  await setupTestDb()
  app = await createTestApp()
})

afterAll(async () => {
  await closeTestDb()
})

describe('GET /api/v1/health', () => {
  it('should return 200 with status ok', async () => {
    const res = await supertest(app).get('/api/v1/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.timestamp).toBeDefined()
  })

  it('should not require authentication', async () => {
    const res = await supertest(app).get('/api/v1/health')
    expect(res.status).toBe(200)
  })
})
