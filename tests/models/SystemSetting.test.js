/**
 * SystemSetting model tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import {
  setupTestDb,
  closeTestDb,
  resetTestDb,
  getTestDb,
  createTestUser,
} from '../setup.js'

// Mock the database connection module
vi.mock('../../src/database/connection.js', async () => {
  const setup = await vi.importActual('../setup.js')
  const knexInstance = await setup.setupTestDb()

  return {
    default: knexInstance,
    knex: knexInstance,
    initDatabase: async () => knexInstance,
    closeDatabase: async () => {},
    transaction: async (fn) => knexInstance.transaction(fn),
  }
})

// Import after mocking
const { SystemSetting } = await import('../../src/models/SystemSetting.js')

beforeAll(async () => {
  await setupTestDb()
})

afterAll(async () => {
  await closeTestDb()
})

beforeEach(async () => {
  await resetTestDb()
  // Create test user for FK references, then insert default settings
  await createTestUser('user-1')
  const db = getTestDb()
  await db('system_settings').insert([
    { id: 'setting-1', key: 'allow_public_registration', value: 'false' },
    { id: 'setting-2', key: 'default_registration_group_id', value: null },
  ])
})

describe('SystemSetting', () => {
  describe('get', () => {
    it('should return value for existing key', async () => {
      const value = await SystemSetting.get('allow_public_registration')
      expect(value).toBe('false')
    })

    it('should return null for non-existing key', async () => {
      const value = await SystemSetting.get('non_existing_key')
      expect(value).toBeNull()
    })
  })

  describe('set', () => {
    it('should update existing setting', async () => {
      await SystemSetting.set('allow_public_registration', 'true', 'user-1')
      const value = await SystemSetting.get('allow_public_registration')
      expect(value).toBe('true')
    })

    it('should create new setting if key does not exist', async () => {
      await SystemSetting.set('new_key', 'new_value', 'user-1')
      const value = await SystemSetting.get('new_key')
      expect(value).toBe('new_value')
    })

    it('should store updated_by', async () => {
      await SystemSetting.set('allow_public_registration', 'true', 'user-1')
      const db = getTestDb()
      const row = await db('system_settings').where('key', 'allow_public_registration').first()
      expect(row.updated_by).toBe('user-1')
    })
  })

  describe('getAll', () => {
    it('should return all settings as key-value object', async () => {
      const settings = await SystemSetting.getAll()
      expect(settings).toHaveProperty('allow_public_registration')
      expect(settings).toHaveProperty('default_registration_group_id')
      expect(settings.allow_public_registration).toBe('false')
    })
  })

  describe('getAllFormatted', () => {
    it('should return formatted settings for API', async () => {
      const settings = await SystemSetting.getAllFormatted()
      expect(settings.allowPublicRegistration).toBe(false)
      expect(settings.defaultRegistrationGroupId).toBeNull()
    })

    it('should return true when registration is enabled', async () => {
      await SystemSetting.set('allow_public_registration', 'true')
      const settings = await SystemSetting.getAllFormatted()
      expect(settings.allowPublicRegistration).toBe(true)
    })
  })
})
