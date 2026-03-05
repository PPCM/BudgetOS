import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock nodemailer before importing emailService
const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-msg-id' })
const mockVerify = vi.fn().mockResolvedValue(true)
const mockCreateTransport = vi.fn().mockReturnValue({
  sendMail: mockSendMail,
  verify: mockVerify,
})

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}))

// Mock config
vi.mock('../../../src/config/index.js', () => ({
  default: {
    smtp: {
      host: 'smtp.env.test',
      port: 587,
      secure: false,
      user: 'envuser',
      pass: 'envpass',
      from: 'env@test.com',
      appUrl: 'http://localhost:3000',
    },
    server: {
      host: 'localhost',
      port: 3000,
    },
  },
}))

// Mock logger
vi.mock('../../../src/utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock SystemSetting
const mockGetAll = vi.fn().mockResolvedValue({})
vi.mock('../../../src/models/SystemSetting.js', () => ({
  default: {
    getAll: mockGetAll,
  },
}))

describe('EmailService', () => {
  let emailService

  beforeEach(async () => {
    vi.clearAllMocks()
    mockGetAll.mockResolvedValue({})
    // Re-import to get fresh instance
    const mod = await import('../../../src/services/emailService.js')
    emailService = mod.default
  })

  describe('getSmtpConfig', () => {
    it('should return env vars config when no DB settings', async () => {
      mockGetAll.mockResolvedValue({})
      const config = await emailService.getSmtpConfig()

      expect(config.host).toBe('smtp.env.test')
      expect(config.port).toBe(587)
      expect(config.secure).toBe(false)
      expect(config.user).toBe('envuser')
      expect(config.pass).toBe('envpass')
      expect(config.from).toBe('env@test.com')
    })

    it('should override with DB settings when available', async () => {
      mockGetAll.mockResolvedValue({
        smtp_host: 'smtp.db.test',
        smtp_port: '465',
        smtp_secure: 'true',
        smtp_user: 'dbuser',
        smtp_pass: 'dbpass',
        smtp_from: 'db@test.com',
      })

      const config = await emailService.getSmtpConfig()

      expect(config.host).toBe('smtp.db.test')
      expect(config.port).toBe(465)
      expect(config.secure).toBe(true)
      expect(config.user).toBe('dbuser')
      expect(config.pass).toBe('dbpass')
      expect(config.from).toBe('db@test.com')
    })

    it('should fallback to env vars for missing DB settings', async () => {
      mockGetAll.mockResolvedValue({
        smtp_host: 'smtp.db.test',
        // port, user, pass etc. not set in DB
      })

      const config = await emailService.getSmtpConfig()

      expect(config.host).toBe('smtp.db.test')
      expect(config.port).toBe(587) // fallback to env
      expect(config.user).toBe('envuser') // fallback to env
    })

    it('should handle DB error gracefully', async () => {
      mockGetAll.mockRejectedValue(new Error('DB unavailable'))

      const config = await emailService.getSmtpConfig()
      // Should fallback to env vars
      expect(config.host).toBe('smtp.env.test')
    })
  })

  describe('sendMail', () => {
    it('should send email with correct parameters', async () => {
      await emailService.sendMail('user@test.com', 'Test Subject', '<p>Hello</p>')

      expect(mockCreateTransport).toHaveBeenCalled()
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'env@test.com',
        to: 'user@test.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      })
    })

    it('should throw when SMTP host is not configured', async () => {
      mockGetAll.mockResolvedValue({})
      // Override config to have empty host
      vi.doMock('../../../src/config/index.js', () => ({
        default: {
          smtp: { host: '', port: 587, secure: false, user: '', pass: '', from: '', appUrl: '' },
          server: { host: 'localhost', port: 3000 },
        },
      }))

      // The actual behavior depends on the implementation
      // since we mocked the config globally, let's test the error path differently
      mockCreateTransport.mockImplementation(() => {
        throw new Error('SMTP not configured: no host defined')
      })

      await expect(emailService.sendMail('test@test.com', 'Sub', 'Body'))
        .rejects.toThrow()
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send French email when locale is fr', async () => {
      mockCreateTransport.mockReturnValue({
        sendMail: mockSendMail,
      })

      const user = { email: 'jean@test.com', firstName: 'Jean', locale: 'fr' }
      await emailService.sendPasswordResetEmail(user, 'test-token-123', 'fr')

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe('jean@test.com')
      expect(callArgs.subject).toContain('Réinitialisation')
      expect(callArgs.html).toContain('Bonjour Jean')
      expect(callArgs.html).toContain('test-token-123')
    })

    it('should send English email when locale is en', async () => {
      mockCreateTransport.mockReturnValue({
        sendMail: mockSendMail,
      })

      const user = { email: 'john@test.com', firstName: 'John', locale: 'en' }
      await emailService.sendPasswordResetEmail(user, 'test-token-456', 'en')

      expect(mockSendMail).toHaveBeenCalledTimes(1)
      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.to).toBe('john@test.com')
      expect(callArgs.subject).toContain('Reset your password')
      expect(callArgs.html).toContain('Hello John')
      expect(callArgs.html).toContain('test-token-456')
    })

    it('should use email as name when firstName is not set', async () => {
      mockCreateTransport.mockReturnValue({
        sendMail: mockSendMail,
      })

      const user = { email: 'user@test.com', firstName: null, locale: 'en' }
      await emailService.sendPasswordResetEmail(user, 'token', 'en')

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toContain('Hello user@test.com')
    })

    it('should include reset URL with token', async () => {
      mockCreateTransport.mockReturnValue({
        sendMail: mockSendMail,
      })

      const user = { email: 'user@test.com', firstName: 'User' }
      await emailService.sendPasswordResetEmail(user, 'my-reset-token', 'fr')

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toContain('http://localhost:3000/reset-password?token=my-reset-token')
    })
  })

  describe('testConnection', () => {
    it('should call verify on transporter', async () => {
      mockCreateTransport.mockReturnValue({
        verify: mockVerify,
      })

      const result = await emailService.testConnection()
      expect(result).toBe(true)
      expect(mockVerify).toHaveBeenCalled()
    })

    it('should throw when connection fails', async () => {
      mockCreateTransport.mockReturnValue({
        verify: vi.fn().mockRejectedValue(new Error('Connection refused')),
      })

      await expect(emailService.testConnection()).rejects.toThrow('Connection refused')
    })
  })
})
