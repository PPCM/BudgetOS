import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const store = {}
const localStorageMock = {
  getItem: vi.fn((key) => store[key] || null),
  setItem: vi.fn((key, value) => { store[key] = value }),
  removeItem: vi.fn((key) => { delete store[key] }),
}
vi.stubGlobal('localStorage', localStorageMock)

// Import after mocking
const { getPersistedAccountTab, setPersistedAccountTab } = await import('../../../client/src/lib/accountTabPersistence.js')

describe('accountTabPersistence', () => {
  beforeEach(() => {
    Object.keys(store).forEach(key => delete store[key])
    vi.clearAllMocks()
  })

  it('should return empty string when no value stored', () => {
    expect(getPersistedAccountTab()).toBe('')
  })

  it('should return stored account ID', () => {
    store['budgetos_selected_account'] = 'abc-123'
    expect(getPersistedAccountTab()).toBe('abc-123')
  })

  it('should store account ID', () => {
    setPersistedAccountTab('def-456')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('budgetos_selected_account', 'def-456')
  })

  it('should remove when empty string', () => {
    setPersistedAccountTab('')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('budgetos_selected_account')
  })

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('blocked') })
    expect(getPersistedAccountTab()).toBe('')
  })
})
