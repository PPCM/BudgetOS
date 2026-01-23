/**
 * Helper utilities tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateId,
  formatCurrency,
  roundAmount,
  formatDateISO,
  formatDateFR,
  normalizeDescription,
  calculateMatchScore,
  paginate,
  findPotentialDuplicates,
} from '../../src/utils/helpers.js'

describe('generateId', () => {
  it('generates a valid UUID v4', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('generates unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateId())
    }
    expect(ids.size).toBe(100)
  })
})

describe('formatCurrency', () => {
  it('formats EUR by default', () => {
    const result = formatCurrency(1234.56)
    expect(result).toMatch(/1[\s\u202f]234,56/)
    expect(result).toMatch(/€/)
  })

  it('formats USD', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toMatch(/\$/)
  })

  it('handles negative amounts', () => {
    const result = formatCurrency(-500)
    expect(result).toMatch(/-500/)
  })

  it('handles zero', () => {
    const result = formatCurrency(0)
    expect(result).toMatch(/0/)
  })
})

describe('roundAmount', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundAmount(10.125)).toBe(10.13)
    expect(roundAmount(10.124)).toBe(10.12)
  })

  it('handles negative amounts', () => {
    expect(roundAmount(-10.125)).toBe(-10.12)
    expect(roundAmount(-10.126)).toBe(-10.13)
  })

  it('preserves amounts with 2 or fewer decimals', () => {
    expect(roundAmount(10.5)).toBe(10.5)
    expect(roundAmount(10)).toBe(10)
  })

  it('handles floating point precision issues', () => {
    expect(roundAmount(0.1 + 0.2)).toBe(0.3)
  })
})

describe('formatDateISO', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(formatDateISO(new Date(2026, 0, 15))).toBe('2026-01-15')
  })

  it('handles string input', () => {
    expect(formatDateISO('2026-03-20')).toBe('2026-03-20')
  })

  it('pads single digit month and day', () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatDateFR', () => {
  it('formats date as DD/MM/YYYY', () => {
    expect(formatDateFR(new Date(2026, 0, 15))).toBe('15/01/2026')
  })

  it('handles string input', () => {
    expect(formatDateFR('2026-03-20')).toBe('20/03/2026')
  })
})

describe('normalizeDescription', () => {
  it('converts to lowercase', () => {
    expect(normalizeDescription('HELLO WORLD')).toBe('hello world')
  })

  it('removes accents', () => {
    expect(normalizeDescription('Café résumé')).toBe('cafe resume')
  })

  it('removes special characters', () => {
    expect(normalizeDescription('Hello, World!')).toBe('hello world')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeDescription('hello   world')).toBe('hello world')
  })

  it('trims whitespace', () => {
    expect(normalizeDescription('  hello  ')).toBe('hello')
  })

  it('handles null/undefined', () => {
    expect(normalizeDescription(null)).toBe('')
    expect(normalizeDescription(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(normalizeDescription('')).toBe('')
  })
})

describe('calculateMatchScore', () => {
  it('gives max score for exact match', () => {
    const tx1 = { amount: -100, date: '2026-01-15', description: 'Groceries' }
    const tx2 = { amount: -100, date: '2026-01-15', description: 'Groceries' }
    expect(calculateMatchScore(tx1, tx2)).toBe(100) // 50 + 30 + 20
  })

  it('gives 50 points for exact amount match', () => {
    const tx1 = { amount: -100, date: '2026-01-15', description: '' }
    const tx2 = { amount: -100, date: '2026-02-20', description: '' }
    expect(calculateMatchScore(tx1, tx2)).toBeGreaterThanOrEqual(50)
  })

  it('gives 30 points for close amount match (1%)', () => {
    const tx1 = { amount: -100, date: '2026-02-15', description: '' }
    const tx2 = { amount: -100.50, date: '2026-01-15', description: '' }
    const score = calculateMatchScore(tx1, tx2)
    expect(score).toBeGreaterThanOrEqual(30)
    expect(score).toBeLessThan(50)
  })

  it('gives 30 points for exact date match', () => {
    const tx1 = { amount: -50, date: '2026-01-15', description: '' }
    const tx2 = { amount: -100, date: '2026-01-15', description: '' }
    // amount doesn't match exactly or closely, so we get date points
    const score = calculateMatchScore(tx1, tx2)
    expect(score).toBe(30) // Only date match
  })

  it('gives 15 points for close date (within 2 days)', () => {
    const tx1 = { amount: -50, date: '2026-01-15', description: '' }
    const tx2 = { amount: -100, date: '2026-01-17', description: '' }
    expect(calculateMatchScore(tx1, tx2)).toBe(15)
  })

  it('gives 20 points for exact description match', () => {
    const tx1 = { amount: -50, date: '2026-02-15', description: 'Test' }
    const tx2 = { amount: -100, date: '2026-01-15', description: 'Test' }
    expect(calculateMatchScore(tx1, tx2)).toBe(20)
  })

  it('gives 10 points for partial description match', () => {
    const tx1 = { amount: -50, date: '2026-02-15', description: 'Test Payment' }
    const tx2 = { amount: -100, date: '2026-01-15', description: 'Test' }
    expect(calculateMatchScore(tx1, tx2)).toBe(10)
  })
})

describe('paginate', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('returns correct page data', () => {
    const result = paginate(items, 1, 3)
    expect(result.data).toEqual([1, 2, 3])
  })

  it('returns correct pagination info', () => {
    const result = paginate(items, 1, 3)
    expect(result.pagination).toEqual({
      page: 1,
      limit: 3,
      total: 10,
      totalPages: 4,
      hasNext: true,
      hasPrev: false,
    })
  })

  it('handles middle page', () => {
    const result = paginate(items, 2, 3)
    expect(result.data).toEqual([4, 5, 6])
    expect(result.pagination.hasNext).toBe(true)
    expect(result.pagination.hasPrev).toBe(true)
  })

  it('handles last page', () => {
    const result = paginate(items, 4, 3)
    expect(result.data).toEqual([10])
    expect(result.pagination.hasNext).toBe(false)
    expect(result.pagination.hasPrev).toBe(true)
  })

  it('handles empty array', () => {
    const result = paginate([], 1, 10)
    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('uses default values', () => {
    const result = paginate(items)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(20)
  })
})

describe('findPotentialDuplicates', () => {
  const existingTxs = [
    { id: '1', amount: -100, date: '2026-01-15', description: 'Groceries' },
    { id: '2', amount: -50, date: '2026-01-10', description: 'Gas' },
    { id: '3', amount: -100, date: '2026-01-20', description: 'Shopping' },
  ]

  it('finds exact duplicate', () => {
    const importedTx = { amount: -100, date: '2026-01-15', description: 'Groceries' }
    const duplicates = findPotentialDuplicates(importedTx, existingTxs)
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].id).toBe('1')
  })

  it('finds duplicate within date tolerance', () => {
    const importedTx = { amount: -100, date: '2026-01-16', description: 'Groceries' }
    const duplicates = findPotentialDuplicates(importedTx, existingTxs, 2)
    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].id).toBe('1')
  })

  it('finds duplicate within amount tolerance', () => {
    const importedTx = { amount: -100.50, date: '2026-01-15', description: 'Groceries' }
    const duplicates = findPotentialDuplicates(importedTx, existingTxs, 2, 0.01)
    expect(duplicates).toHaveLength(1)
  })

  it('returns empty array when no duplicates', () => {
    const importedTx = { amount: -200, date: '2026-02-01', description: 'New' }
    const duplicates = findPotentialDuplicates(importedTx, existingTxs)
    expect(duplicates).toHaveLength(0)
  })

  it('ignores transactions outside tolerance', () => {
    const importedTx = { amount: -100, date: '2026-01-25', description: 'Groceries' }
    const duplicates = findPotentialDuplicates(importedTx, existingTxs, 2)
    expect(duplicates).toHaveLength(0)
  })
})
