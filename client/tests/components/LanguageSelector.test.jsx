import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSelector from '../../src/components/LanguageSelector'

// Mock i18next
const mockChangeLanguage = vi.fn()
let mockLanguage = 'fr'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      get language() { return mockLanguage },
      changeLanguage: mockChangeLanguage,
    },
  }),
}))

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLanguage = 'fr'
    localStorage.clear()
  })

  it('renders FR and EN buttons', () => {
    render(<LanguageSelector />)
    expect(screen.getByText('FR')).toBeInTheDocument()
    expect(screen.getByText('EN')).toBeInTheDocument()
  })

  it('renders separator between languages', () => {
    render(<LanguageSelector />)
    expect(screen.getByText('|')).toBeInTheDocument()
  })

  it('calls i18n.changeLanguage when clicking EN', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByText('EN'))
    expect(mockChangeLanguage).toHaveBeenCalledWith('en')
  })

  it('calls i18n.changeLanguage when clicking FR', () => {
    mockLanguage = 'en'
    render(<LanguageSelector />)
    fireEvent.click(screen.getByText('FR'))
    expect(mockChangeLanguage).toHaveBeenCalledWith('fr')
  })

  it('saves selected language to localStorage', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByText('EN'))
    expect(localStorage.getItem('budgetos-lang')).toBe('en')
  })

  it('applies bold style to active language (FR)', () => {
    mockLanguage = 'fr'
    render(<LanguageSelector />)
    const frButton = screen.getByText('FR')
    expect(frButton.className).toContain('font-bold')
    expect(frButton.className).toContain('opacity-100')
  })

  it('applies semi-transparent style to inactive language', () => {
    mockLanguage = 'fr'
    render(<LanguageSelector />)
    const enButton = screen.getByText('EN')
    expect(enButton.className).toContain('text-white/50')
  })
})
