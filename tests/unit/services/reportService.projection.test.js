import { describe, it, expect } from 'vitest'
import { ReportService } from '../../../src/services/reportService.js'

describe('ReportService.advanceDate', () => {
  // Use noon to avoid timezone issues
  const base = new Date(2026, 2, 15, 12, 0, 0) // March 15, 2026

  const toDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  it('should advance daily', () => {
    expect(toDate(ReportService.advanceDate(base, 'daily'))).toBe('2026-03-16')
  })

  it('should advance weekly', () => {
    expect(toDate(ReportService.advanceDate(base, 'weekly'))).toBe('2026-03-22')
  })

  it('should advance biweekly', () => {
    expect(toDate(ReportService.advanceDate(base, 'biweekly'))).toBe('2026-03-29')
  })

  it('should advance monthly', () => {
    expect(toDate(ReportService.advanceDate(base, 'monthly'))).toBe('2026-04-15')
  })

  it('should advance bimonthly', () => {
    expect(toDate(ReportService.advanceDate(base, 'bimonthly'))).toBe('2026-05-15')
  })

  it('should advance quarterly', () => {
    expect(toDate(ReportService.advanceDate(base, 'quarterly'))).toBe('2026-06-15')
  })

  it('should advance semiannual', () => {
    expect(toDate(ReportService.advanceDate(base, 'semiannual'))).toBe('2026-09-15')
  })

  it('should advance annual', () => {
    expect(toDate(ReportService.advanceDate(base, 'annual'))).toBe('2027-03-15')
  })

  it('should handle "once" by advancing far into the future', () => {
    const result = ReportService.advanceDate(base, 'once')
    expect(result.getFullYear()).toBeGreaterThanOrEqual(2126)
  })

  it('should default to monthly for unknown frequency', () => {
    expect(toDate(ReportService.advanceDate(base, 'unknown'))).toBe('2026-04-15')
  })
})
