import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormLanguageSelect from '../../src/components/FormLanguageSelect'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: (props) => <svg data-testid="chevron-down" {...props} />,
  Check: (props) => <svg data-testid="check-icon" {...props} />,
}))

const LANGUAGE_NAMES = [
  'Français', 'English', 'Deutsch', 'Español',
  'Italiano', 'Português', 'Русский', '中文',
]

describe('FormLanguageSelect', () => {
  let onChange

  beforeEach(() => {
    onChange = vi.fn()
  })

  it('renders the trigger button with current language flag and name', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: /🇫🇷\s*Français/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the trigger for English when value is en', () => {
    render(<FormLanguageSelect value="en" onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: /🇬🇧\s*English/i })
    expect(trigger).toBeInTheDocument()
  })

  it('dropdown is hidden by default', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('opacity-0')
    expect(listbox.className).toContain('pointer-events-none')
  })

  it('opens the dropdown when trigger is clicked', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*Français/i }))

    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('opacity-100')
    expect(listbox.className).toContain('pointer-events-auto')
  })

  it('shows all 8 language options', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*Français/i }))

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(8)

    // Check each option has the expected language name
    const optionTexts = options.map((opt) => opt.textContent)
    for (const name of LANGUAGE_NAMES) {
      expect(optionTexts.some((text) => text.includes(name))).toBe(true)
    }
  })

  it('marks the active language with aria-selected and font-semibold', () => {
    render(<FormLanguageSelect value="de" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇩🇪\s*Deutsch/i }))

    const deOption = screen.getByRole('option', { name: /Deutsch/ })
    expect(deOption).toHaveAttribute('aria-selected', 'true')
    expect(deOption.className).toContain('font-semibold')

    const frOption = screen.getByRole('option', { name: /Français/ })
    expect(frOption).toHaveAttribute('aria-selected', 'false')
    expect(frOption.className).not.toContain('font-semibold')
  })

  it('shows a check icon only on the active language', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*Français/i }))

    const checkIcons = screen.getAllByTestId('check-icon')
    expect(checkIcons).toHaveLength(1)
  })

  it('calls onChange with the selected language code', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*Français/i }))
    fireEvent.click(screen.getByRole('option', { name: /English/ }))

    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('closes the dropdown after selecting a language', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*Français/i }))
    fireEvent.click(screen.getByRole('option', { name: /English/ }))

    const listbox = screen.getByRole('listbox')
    expect(listbox.className).toContain('opacity-0')
    expect(listbox.className).toContain('pointer-events-none')
  })

  it('closes the dropdown on click outside', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /🇫🇷\s*Français/i }))
    expect(screen.getByRole('listbox').className).toContain('opacity-100')

    fireEvent.mouseDown(document.body)
    expect(screen.getByRole('listbox').className).toContain('opacity-0')
  })

  it('toggles the dropdown on repeated clicks', () => {
    render(<FormLanguageSelect value="fr" onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: /🇫🇷\s*Français/i })

    fireEvent.click(trigger)
    expect(screen.getByRole('listbox').className).toContain('opacity-100')

    fireEvent.click(trigger)
    expect(screen.getByRole('listbox').className).toContain('opacity-0')
  })

  it('falls back to first language if value is unknown', () => {
    render(<FormLanguageSelect value="xx" onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: /🇫🇷\s*Français/i })
    expect(trigger).toBeInTheDocument()
  })

  it('applies additional className to the container', () => {
    const { container } = render(
      <FormLanguageSelect value="fr" onChange={onChange} className="max-w-md" />
    )
    expect(container.firstChild.className).toContain('max-w-md')
  })
})
