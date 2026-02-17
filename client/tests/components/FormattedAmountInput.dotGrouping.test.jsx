import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormattedAmountInput from '../../src/components/FormattedAmountInput'

// Mock useAuth with dot as digit grouping (European format: 1.234,56)
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      decimalSeparator: ',',
      digitGrouping: '.',
    },
  }),
}))

describe('FormattedAmountInput (dot grouping)', () => {
  describe('display formatting', () => {
    it('displays grouped value with dot separators', () => {
      render(<FormattedAmountInput value="1234" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('1.234')
    })

    it('displays large number with multiple dot separators', () => {
      render(<FormattedAmountInput value="1234567" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('1.234.567')
    })

    it('displays value with decimals using comma', () => {
      render(<FormattedAmountInput value="1234.56" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('1.234,56')
    })

    it('displays 6-digit number correctly', () => {
      render(<FormattedAmountInput value="123456" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('123.456')
    })
  })

  describe('input handling with dot grouping', () => {
    it('strips dot grouping symbols when extracting raw value', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="1234" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "1.234", user types "5" at end → "1.2345"
      fireEvent.change(input, { target: { value: '1.2345', selectionStart: 6 } })
      expect(onChange).toHaveBeenCalledWith('12345')
    })

    it('handles 6-digit input with dot grouping correctly', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="12345" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "12.345", user types "6" at end → "12.3456"
      fireEvent.change(input, { target: { value: '12.3456', selectionStart: 7 } })
      expect(onChange).toHaveBeenCalledWith('123456')
    })

    it('handles 7-digit input with multiple dot groupings', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="123456" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "123.456", user types "7" at end → "123.4567"
      fireEvent.change(input, { target: { value: '123.4567', selectionStart: 8 } })
      expect(onChange).toHaveBeenCalledWith('1234567')
    })

    it('treats comma as decimal separator (not dot)', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="1234" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "1.234", user types comma at end → "1.234,"
      fireEvent.change(input, { target: { value: '1.234,', selectionStart: 6 } })
      expect(onChange).toHaveBeenCalledWith('1234.')
    })

    it('handles decimal input with dot grouping', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="1234." onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "1.234,", user types "5" after comma → "1.234,5"
      fireEvent.change(input, { target: { value: '1.234,5', selectionStart: 7 } })
      expect(onChange).toHaveBeenCalledWith('1234.5')
    })

    it('handles full decimal amount with dot grouping', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="1234.5" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "1.234,5", user types "6" → "1.234,56"
      fireEvent.change(input, { target: { value: '1.234,56', selectionStart: 8 } })
      expect(onChange).toHaveBeenCalledWith('1234.56')
    })

    it('limits decimal digits to 2 with dot grouping', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="1234.56" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Display is "1.234,56", user tries to add "7" → "1.234,567"
      fireEvent.change(input, { target: { value: '1.234,567', selectionStart: 9 } })
      expect(onChange).toHaveBeenCalledWith('1234.56')
    })

    it('does not treat dot as decimal when dot is grouping symbol', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="100" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // User types "." but it's the grouping symbol, should be ignored
      fireEvent.change(input, { target: { value: '100.', selectionStart: 4 } })
      expect(onChange).toHaveBeenCalledWith('100')
    })

    it('extracts pure digits from input with multiple grouping dots', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Simulating paste of a pre-formatted number
      fireEvent.change(input, { target: { value: '1.234.567', selectionStart: 9 } })
      expect(onChange).toHaveBeenCalledWith('1234567')
    })
  })
})
