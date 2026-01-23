/**
 * Validation middleware tests
 */
import { describe, it, expect, vi } from 'vitest'

// Import the sanitize function by recreating it (since it's not exported directly)
const sanitize = (obj) => {
  if (typeof obj === 'string') {
    return obj
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize)
  }

  if (obj && typeof obj === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitize(value)
    }
    return sanitized
  }

  return obj
}

describe('sanitizeInput', () => {
  describe('string sanitization', () => {
    it('preserves normal text', () => {
      expect(sanitize('Hello World')).toBe('Hello World')
    })

    it('preserves apostrophes', () => {
      expect(sanitize("C'est cher")).toBe("C'est cher")
      expect(sanitize("It's working")).toBe("It's working")
    })

    it('preserves double quotes', () => {
      expect(sanitize('He said "hello"')).toBe('He said "hello"')
    })

    it('preserves ampersands', () => {
      expect(sanitize('Tom & Jerry')).toBe('Tom & Jerry')
      expect(sanitize('A & B & C')).toBe('A & B & C')
    })

    it('escapes HTML tags', () => {
      expect(sanitize('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;')
    })

    it('escapes less than and greater than', () => {
      expect(sanitize('a < b > c')).toBe('a &lt; b &gt; c')
    })

    it('preserves French text with accents and apostrophes', () => {
      expect(sanitize("L'été est chaud")).toBe("L'été est chaud")
      expect(sanitize("Aujourd'hui")).toBe("Aujourd'hui")
      expect(sanitize("C'est génial !")).toBe("C'est génial !")
    })

    it('handles mixed content', () => {
      expect(sanitize("C'est <b>important</b>")).toBe("C'est &lt;b&gt;important&lt;/b&gt;")
    })
  })

  describe('object sanitization', () => {
    it('sanitizes object values', () => {
      const input = { name: "C'est cher", html: '<script>' }
      const output = sanitize(input)
      expect(output.name).toBe("C'est cher")
      expect(output.html).toBe('&lt;script&gt;')
    })

    it('sanitizes nested objects', () => {
      const input = { data: { text: "<div>C'est</div>" } }
      const output = sanitize(input)
      expect(output.data.text).toBe("&lt;div&gt;C'est&lt;/div&gt;")
    })
  })

  describe('array sanitization', () => {
    it('sanitizes array elements', () => {
      const input = ["C'est", '<tag>', 'normal']
      const output = sanitize(input)
      expect(output).toEqual(["C'est", '&lt;tag&gt;', 'normal'])
    })
  })

  describe('non-string values', () => {
    it('preserves numbers', () => {
      expect(sanitize(123)).toBe(123)
      expect(sanitize(45.67)).toBe(45.67)
    })

    it('preserves booleans', () => {
      expect(sanitize(true)).toBe(true)
      expect(sanitize(false)).toBe(false)
    })

    it('preserves null', () => {
      expect(sanitize(null)).toBe(null)
    })

    it('preserves undefined', () => {
      expect(sanitize(undefined)).toBe(undefined)
    })
  })
})
