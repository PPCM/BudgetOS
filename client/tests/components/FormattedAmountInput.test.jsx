import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FormattedAmountInput from '../../src/components/FormattedAmountInput'

// Mock useAuth to return user preferences
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      decimalSeparator: ',',
      digitGrouping: ' ',
    },
  }),
}))

describe('FormattedAmountInput', () => {
  describe('display formatting', () => {
    it('displays empty string for empty value', () => {
      render(<FormattedAmountInput value="" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('')
    })

    it('displays formatted value with decimal separator', () => {
      render(<FormattedAmountInput value="1234.56" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('1 234,56')
    })

    it('displays value without decimal part', () => {
      render(<FormattedAmountInput value="1000" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('1 000')
    })

    it('displays small numbers without grouping', () => {
      render(<FormattedAmountInput value="42" onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('42')
    })

    it('displays decimal point without digits after', () => {
      render(<FormattedAmountInput value="100." onChange={() => {}} />)
      expect(screen.getByRole('textbox').value).toBe('100,')
    })
  })

  describe('input handling', () => {
    it('extracts digits from input', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '123', selectionStart: 3 } })
      expect(onChange).toHaveBeenCalledWith('123')
    })

    it('converts comma to decimal point in raw value', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="100" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '100,', selectionStart: 4 } })
      expect(onChange).toHaveBeenCalledWith('100.')
    })

    it('converts dot to decimal point in raw value', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="100" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '100.', selectionStart: 4 } })
      expect(onChange).toHaveBeenCalledWith('100.')
    })

    it('limits decimal places to 2', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="100.99" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      // Try to add a third decimal digit
      fireEvent.change(input, { target: { value: '100,999', selectionStart: 7 } })
      expect(onChange).toHaveBeenCalledWith('100.99')
    })

    it('allows only one decimal separator', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="100.5" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '100,5,', selectionStart: 6 } })
      expect(onChange).toHaveBeenCalledWith('100.5')
    })

    it('strips non-numeric characters', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'abc123def', selectionStart: 9 } })
      expect(onChange).toHaveBeenCalledWith('123')
    })

    it('removes leading zeros', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '007', selectionStart: 3 } })
      expect(onChange).toHaveBeenCalledWith('7')
    })

    it('keeps 0. for decimal starting with zero', () => {
      const onChange = vi.fn()
      render(<FormattedAmountInput value="" onChange={onChange} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '0,5', selectionStart: 3 } })
      expect(onChange).toHaveBeenCalledWith('0.5')
    })
  })

  describe('attributes', () => {
    it('sets inputMode to decimal', () => {
      render(<FormattedAmountInput value="" onChange={() => {}} />)
      expect(screen.getByRole('textbox').getAttribute('inputMode')).toBe('decimal')
    })

    it('sets placeholder using user decimal separator', () => {
      render(<FormattedAmountInput value="" onChange={() => {}} />)
      expect(screen.getByRole('textbox').placeholder).toBe('0,00')
    })

    it('passes className to input', () => {
      render(<FormattedAmountInput value="" onChange={() => {}} className="input text-2xl" />)
      expect(screen.getByRole('textbox').className).toBe('input text-2xl')
    })

    it('passes required attribute', () => {
      render(<FormattedAmountInput value="" onChange={() => {}} required />)
      expect(screen.getByRole('textbox').required).toBe(true)
    })
  })
})
