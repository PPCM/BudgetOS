import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSelector from '../../src/components/LanguageSelector'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: (props) => <svg data-testid="chevron-down" {...props} />,
  Check: (props) => <svg data-testid="check-icon" {...props} />,
}))

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

const LANGUAGE_NAMES = [
  'Français', 'English', 'Deutsch', 'Español',
  'Italiano', 'Português', 'Русский', '中文',
]

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLanguage = 'fr'
    localStorage.clear()
  })

  it('renders the trigger button with current language flag and code', () => {
    render(<LanguageSelector />)
    const trigger = screen.getByRole('button', { name: /🇫🇷\s*FR/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the trigger button for English when active', () => {
    mockLanguage = 'en'
    render(<LanguageSelector />)
    const trigger = screen.getByRole('button', { name: /🇬🇧\s*EN/i })
    expect(trigger).toBeInTheDocument()
  })

  it('dropdown is hidden by default', () => {
    render(<LanguageSelector />)
    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('opacity-0')
    expect(listbox.className).toContain('pointer-events-none')
  })

  it('opens the dropdown when trigger is clicked', () => {
    render(<LanguageSelector />)
    const trigger = screen.getByRole('button', { name: /🇫🇷\s*FR/i })
    fireEvent.click(trigger)

    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('opacity-100')
    expect(listbox.className).toContain('pointer-events-auto')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows all 8 language options in the dropdown', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(8)

    for (const name of LANGUAGE_NAMES) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('marks the active language with aria-selected and font-semibold', () => {
    mockLanguage = 'fr'
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))

    const frOption = screen.getByRole('option', { name: /Français/ })
    expect(frOption).toHaveAttribute('aria-selected', 'true')
    expect(frOption.className).toContain('font-semibold')

    const enOption = screen.getByRole('option', { name: /English/ })
    expect(enOption).toHaveAttribute('aria-selected', 'false')
    expect(enOption.className).not.toContain('font-semibold')
  })

  it('shows a check icon next to the active language', () => {
    mockLanguage = 'fr'
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))

    const checkIcons = screen.getAllByTestId('check-icon')
    expect(checkIcons).toHaveLength(1)
  })

  it('changes language when an option is clicked', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))
    fireEvent.click(screen.getByRole('option', { name: /English/ }))

    expect(mockChangeLanguage).toHaveBeenCalledWith('en')
  })

  it('saves selected language to localStorage', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))
    fireEvent.click(screen.getByRole('option', { name: /English/ }))

    expect(localStorage.getItem('budgetos-lang')).toBe('en')
  })

  it('closes the dropdown after selecting a language', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))
    fireEvent.click(screen.getByRole('option', { name: /English/ }))

    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('opacity-0')
    expect(listbox.className).toContain('pointer-events-none')
  })

  it('closes the dropdown on click outside', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*FR/i }))

    // Verify it's open
    expect(screen.getByRole('listbox').className).toContain('opacity-100')

    // Click outside
    fireEvent.mouseDown(document.body)

    expect(screen.getByRole('listbox').className).toContain('opacity-0')
  })

  it('toggles the dropdown open and closed on repeated clicks', () => {
    render(<LanguageSelector />)
    const trigger = screen.getByRole('button', { name: /🇫🇷\s*FR/i })

    // Open
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox').className).toContain('opacity-100')

    // Close
    fireEvent.click(trigger)
    expect(screen.getByRole('listbox').className).toContain('opacity-0')
  })
})
