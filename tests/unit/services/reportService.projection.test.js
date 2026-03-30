import { describe, it, expect } from 'vitest'
import { advanceByFrequency } from '../../../src/utils/dateFrequency.js'

describe('advanceByFrequency', () => {
  // Use noon to avoid timezone issues
  const base = new Date(2026, 2, 15, 12, 0, 0) // March 15, 2026

  const toDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  it('should advance daily', () => {
    expect(toDate(advanceByFrequency(base, 'daily'))).toBe('2026-03-16')
  })

  it('should advance weekly', () => {
    expect(toDate(advanceByFrequency(base, 'weekly'))).toBe('2026-03-22')
  })

  it('should advance biweekly', () => {
    expect(toDate(advanceByFrequency(base, 'biweekly'))).toBe('2026-03-29')
  })

  it('should advance monthly', () => {
    expect(toDate(advanceByFrequency(base, 'monthly'))).toBe('2026-04-15')
  })

  it('should advance bimonthly', () => {
    expect(toDate(advanceByFrequency(base, 'bimonthly'))).toBe('2026-05-15')
  })

  it('should advance quarterly', () => {
    expect(toDate(advanceByFrequency(base, 'quarterly'))).toBe('2026-06-15')
  })

  it('should advance semiannual', () => {
    expect(toDate(advanceByFrequency(base, 'semiannual'))).toBe('2026-09-15')
  })

  it('should advance annual', () => {
    expect(toDate(advanceByFrequency(base, 'annual'))).toBe('2027-03-15')
  })

  it('should handle "once" by advancing far into the future', () => {
    const result = advanceByFrequency(base, 'once')
    expect(result.getFullYear()).toBeGreaterThanOrEqual(2126)
  })

  it('should default to monthly for unknown frequency', () => {
    expect(toDate(advanceByFrequency(base, 'unknown'))).toBe('2026-04-15')
  })
})
