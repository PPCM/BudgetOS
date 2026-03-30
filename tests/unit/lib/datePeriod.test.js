import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getDatePeriod } from '../../../client/src/lib/utils.js'

describe('getDatePeriod - forecast periods', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 30, 12, 0, 0)) // March 30, 2026
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('currentMonthFull should return full current month', () => {
    const { startDate, endDate } = getDatePeriod('currentMonthFull')
    expect(startDate).toBe('2026-03-01')
    expect(endDate).toBe('2026-03-31')
  })

  it('nextMonth should return full next month', () => {
    const { startDate, endDate } = getDatePeriod('nextMonth')
    expect(startDate).toBe('2026-04-01')
    expect(endDate).toBe('2026-04-30')
  })

  it('nextMonth in December should wrap to January next year', () => {
    vi.setSystemTime(new Date(2026, 11, 15, 12, 0, 0)) // December 15, 2026
    const { startDate, endDate } = getDatePeriod('nextMonth')
    expect(startDate).toBe('2027-01-01')
    expect(endDate).toBe('2027-01-31')
  })

  it('currentMonthFull in February should handle 28 days', () => {
    vi.setSystemTime(new Date(2026, 1, 10, 12, 0, 0)) // Feb 10, 2026
    const { startDate, endDate } = getDatePeriod('currentMonthFull')
    expect(startDate).toBe('2026-02-01')
    expect(endDate).toBe('2026-02-28')
  })
})
