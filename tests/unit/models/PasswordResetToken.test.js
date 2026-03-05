import { describe, it, expect, vi, beforeEach } from 'vitest'
import crypto from 'crypto'

// Mock knex
const mockInsert = vi.fn().mockResolvedValue(undefined)
const mockUpdate = vi.fn().mockResolvedValue(undefined)
const mockFirst = vi.fn()
const mockDel = vi.fn().mockResolvedValue(0)
const mockWhere = vi.fn()
const mockWhereNull = vi.fn()

const createChain = () => {
  const chain = {
    where: vi.fn().mockReturnThis(),
    whereNull: vi.fn().mockReturnThis(),
    update: vi.fn().mockResolvedValue(undefined),
    insert: vi.fn().mockResolvedValue(undefined),
    first: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(0),
  }
  return chain
}

let mockChain = createChain()
const mockKnex = vi.fn(() => mockChain)
mockKnex.fn = { now: vi.fn().mockReturnValue('2026-03-05T12:00:00.000Z') }

vi.mock('../../../src/database/connection.js', () => ({
  default: mockKnex,
}))

vi.mock('../../../src/utils/helpers.js', () => ({
  generateId: vi.fn().mockReturnValue('test-uuid-123'),
}))

describe('PasswordResetToken', () => {
  let PasswordResetToken

  beforeEach(async () => {
    vi.clearAllMocks()
    mockChain = createChain()
    mockKnex.mockReturnValue(mockChain)
    const mod = await import('../../../src/models/PasswordResetToken.js')
    PasswordResetToken = mod.default
  })

  describe('generateToken', () => {
    it('should return a token and its SHA-256 hash', () => {
      const { token, hash } = PasswordResetToken.generateToken()

      expect(token).toBeDefined()
      expect(hash).toBeDefined()
      expect(token.length).toBe(64) // 32 bytes hex
      expect(hash.length).toBe(64) // SHA-256 hex

      // Verify hash matches
      const expectedHash = crypto.createHash('sha256').update(token).digest('hex')
      expect(hash).toBe(expectedHash)
    })

    it('should generate unique tokens each time', () => {
      const { token: t1 } = PasswordResetToken.generateToken()
      const { token: t2 } = PasswordResetToken.generateToken()
      expect(t1).not.toBe(t2)
    })
  })

  describe('hashToken', () => {
    it('should produce consistent SHA-256 hash', () => {
      const token = 'test-token-string'
      const hash1 = PasswordResetToken.hashToken(token)
      const hash2 = PasswordResetToken.hashToken(token)
      expect(hash1).toBe(hash2)

      const expected = crypto.createHash('sha256').update(token).digest('hex')
      expect(hash1).toBe(expected)
    })
  })

  describe('create', () => {
    it('should invalidate previous tokens and create new one', async () => {
      const expiresAt = new Date(Date.now() + 3600000)

      await PasswordResetToken.create('user-1', 'hash-abc', expiresAt)

      // First call should be to invalidate previous tokens
      expect(mockKnex).toHaveBeenCalledWith('password_reset_tokens')
      // Should have called where, whereNull, update to invalidate
      expect(mockChain.where).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockChain.whereNull).toHaveBeenCalledWith('used_at')
    })
  })

  describe('format', () => {
    it('should format raw DB row to camelCase', () => {
      const raw = {
        id: 'token-1',
        user_id: 'user-1',
        token_hash: 'hash123',
        expires_at: '2026-03-05T13:00:00Z',
        used_at: null,
        created_at: '2026-03-05T12:00:00Z',
      }

      const formatted = PasswordResetToken.format(raw)

      expect(formatted.id).toBe('token-1')
      expect(formatted.userId).toBe('user-1')
      expect(formatted.tokenHash).toBe('hash123')
      expect(formatted.expiresAt).toBe('2026-03-05T13:00:00Z')
      expect(formatted.usedAt).toBeNull()
      expect(formatted.createdAt).toBe('2026-03-05T12:00:00Z')
    })
  })
})
