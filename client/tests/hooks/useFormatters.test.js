import { describe, it, expect } from 'vitest'
import { formatNumber, parseAmount } from '../../src/hooks/useFormatters'

describe('formatNumber', () => {
  it('formats with comma decimal and space grouping (French style)', () => {
    expect(formatNumber(1234567.89, ',', ' ')).toBe('1 234 567,89')
  })

  it('formats with dot decimal and comma grouping (US style)', () => {
    expect(formatNumber(1234567.89, '.', ',')).toBe('1,234,567.89')
  })

  it('formats with comma decimal and dot grouping (German style)', () => {
    expect(formatNumber(1234567.89, ',', '.')).toBe('1.234.567,89')
  })

  it('formats with no digit grouping', () => {
    expect(formatNumber(1234567.89, ',', '')).toBe('1234567,89')
  })

  it('formats negative amounts with minus sign', () => {
    expect(formatNumber(-1234.56, ',', ' ')).toBe('-1 234,56')
  })

  it('formats zero', () => {
    expect(formatNumber(0, ',', ' ')).toBe('0,00')
  })

  it('formats small amounts without grouping', () => {
    expect(formatNumber(42.5, '.', ',')).toBe('42.50')
  })

  it('uses default separators (comma decimal, space grouping)', () => {
    expect(formatNumber(1000)).toBe('1 000,00')
  })

  it('respects custom decimal places', () => {
    expect(formatNumber(3.14159, '.', '', 4)).toBe('3.1416')
  })

  it('formats with zero decimal places', () => {
    expect(formatNumber(1234.56, ',', ' ', 0)).toBe('1 235')
  })

  it('formats negative zero as positive', () => {
    expect(formatNumber(-0, ',', ' ')).toBe('0,00')
  })

  it('formats very large numbers', () => {
    expect(formatNumber(1000000000, '.', ',')).toBe('1,000,000,000.00')
  })
})

describe('parseAmount', () => {
  describe('basic parsing', () => {
    it('parses simple integer', () => {
      expect(parseAmount('42')).toBe(42)
    })

    it('parses dot as decimal separator', () => {
      expect(parseAmount('42.50')).toBe(42.5)
    })

    it('parses comma as decimal separator', () => {
      expect(parseAmount('42,50')).toBe(42.5)
    })
  })

  describe('with digit grouping', () => {
    it('parses French format (space grouping, comma decimal)', () => {
      expect(parseAmount('1 234,56')).toBe(1234.56)
    })

    it('parses US format (comma grouping, dot decimal)', () => {
      expect(parseAmount('1,234.56')).toBe(1234.56)
    })

    it('parses German format (dot grouping, comma decimal)', () => {
      expect(parseAmount('1.234,56')).toBe(1234.56)
    })

    it('parses non-breaking space grouping', () => {
      expect(parseAmount('1\u00A0234,56')).toBe(1234.56)
    })

    it('parses large numbers with multiple groupings', () => {
      expect(parseAmount('1,234,567.89')).toBe(1234567.89)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty string', () => {
      expect(parseAmount('')).toBe(0)
    })

    it('returns 0 for null', () => {
      expect(parseAmount(null)).toBe(0)
    })

    it('returns 0 for undefined', () => {
      expect(parseAmount(undefined)).toBe(0)
    })

    it('returns 0 for non-string', () => {
      expect(parseAmount(123)).toBe(0)
    })

    it('returns 0 for non-numeric string', () => {
      expect(parseAmount('abc')).toBe(0)
    })

    it('parses negative amounts', () => {
      expect(parseAmount('-42,50')).toBe(-42.5)
    })

    it('parses amount with only integer part', () => {
      expect(parseAmount('1000')).toBe(1000)
    })
  })
})
