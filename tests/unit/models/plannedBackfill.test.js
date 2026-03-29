import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PlannedTransaction } from '../../../src/models/PlannedTransaction.js'

describe('PlannedTransaction.getPastOccurrences', () => {
  beforeEach(() => {
    // Fix "today" to 2026-03-29
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 29, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return empty array when startDate is in the future', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-04-01',
      frequency: 'monthly',
    })
    expect(result).toEqual([])
  })

  it('should return empty array when startDate is today', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-03-29',
      frequency: 'monthly',
    })
    expect(result).toEqual([])
  })

  it('should return single date for once frequency in the past', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-03-15',
      frequency: 'once',
    })
    expect(result).toEqual(['2026-03-15'])
  })

  it('should return monthly occurrences from past start date', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-01-15',
      frequency: 'monthly',
    })
    expect(result).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })

  it('should return weekly occurrences', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-03-08',
      frequency: 'weekly',
    })
    expect(result).toEqual(['2026-03-08', '2026-03-15', '2026-03-22'])
  })

  it('should respect endDate and stop early', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-01-15',
      frequency: 'monthly',
      endDate: '2026-02-20',
    })
    expect(result).toEqual(['2026-01-15', '2026-02-15'])
  })

  it('should handle daily frequency', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2026-03-26',
      frequency: 'daily',
    })
    expect(result).toEqual(['2026-03-26', '2026-03-27', '2026-03-28'])
  })

  it('should handle quarterly frequency', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2025-06-15',
      frequency: 'quarterly',
    })
    expect(result).toEqual(['2025-06-15', '2025-09-15', '2025-12-15', '2026-03-15'])
  })

  it('should handle annual frequency with only one past occurrence', () => {
    const result = PlannedTransaction.getPastOccurrences({
      startDate: '2025-06-01',
      frequency: 'annual',
    })
    expect(result).toEqual(['2025-06-01'])
  })
})
