import { describe, it, expect } from 'vitest'
import { forgotPasswordSchema, resetPasswordSchema, validateResetTokenSchema } from '../../../src/validators/auth.js'

describe('Password reset validators', () => {
  describe('forgotPasswordSchema', () => {
    it('should accept a valid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('user@example.com')
    })

    it('should normalize email to lowercase', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'User@EXAMPLE.com' })
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('user@example.com')
    })

    it('should reject invalid email', () => {
      const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('should reject empty email', () => {
      const result = forgotPasswordSchema.safeParse({ email: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing email', () => {
      const result = forgotPasswordSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    const validData = {
      token: 'abc123def456',
      password: 'Password1',
      passwordConfirm: 'Password1',
    }

    it('should accept valid data', () => {
      const result = resetPasswordSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject when passwords do not match', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        passwordConfirm: 'DifferentPass1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject weak password (no uppercase)', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        password: 'password1',
        passwordConfirm: 'password1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject weak password (no digit)', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        password: 'Password',
        passwordConfirm: 'Password',
      })
      expect(result.success).toBe(false)
    })

    it('should reject short password', () => {
      const result = resetPasswordSchema.safeParse({
        ...validData,
        password: 'Pa1',
        passwordConfirm: 'Pa1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing token', () => {
      const result = resetPasswordSchema.safeParse({
        password: 'Password1',
        passwordConfirm: 'Password1',
      })
      expect(result.success).toBe(false)
    })

    it('should reject too long password', () => {
      const longPass = 'A1' + 'a'.repeat(127)
      const result = resetPasswordSchema.safeParse({
        token: 'token',
        password: longPass,
        passwordConfirm: longPass,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('validateResetTokenSchema', () => {
    it('should accept a valid token', () => {
      const result = validateResetTokenSchema.safeParse({ token: 'some-token-value' })
      expect(result.success).toBe(true)
    })

    it('should reject empty token', () => {
      const result = validateResetTokenSchema.safeParse({ token: '' })
      expect(result.success).toBe(false)
    })

    it('should reject missing token', () => {
      const result = validateResetTokenSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })
})
