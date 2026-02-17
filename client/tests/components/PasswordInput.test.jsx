import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PasswordInput from '../../src/components/PasswordInput'

describe('PasswordInput', () => {
  it('renders as password type by default', () => {
    render(<PasswordInput value="" onChange={() => {}} />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')
  })

  it('toggles to text type when eye button is clicked', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />)
    const input = screen.getByDisplayValue('secret')
    const toggleBtn = screen.getByRole('button')

    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(toggleBtn)
    expect(input).toHaveAttribute('type', 'text')
  })

  it('toggles back to password type on second click', () => {
    render(<PasswordInput value="secret" onChange={() => {}} />)
    const input = screen.getByDisplayValue('secret')
    const toggleBtn = screen.getByRole('button')

    fireEvent.click(toggleBtn)
    fireEvent.click(toggleBtn)
    expect(input).toHaveAttribute('type', 'password')
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<PasswordInput value="" onChange={onChange} />)
    const input = screen.getByDisplayValue('')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('passes className with pr-10 appended', () => {
    render(<PasswordInput value="" onChange={() => {}} className="input pl-10" />)
    const input = screen.getByDisplayValue('')
    expect(input.className).toBe('input pl-10 pr-10')
  })

  it('passes required attribute', () => {
    render(<PasswordInput value="" onChange={() => {}} required />)
    expect(screen.getByDisplayValue('')).toBeRequired()
  })

  it('passes minLength attribute', () => {
    render(<PasswordInput value="" onChange={() => {}} minLength={8} />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('minLength', '8')
  })

  it('passes placeholder attribute', () => {
    render(<PasswordInput value="" onChange={() => {}} placeholder="Enter password" />)
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  })

  it('toggle button has tabIndex -1', () => {
    render(<PasswordInput value="" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1')
  })

  it('toggle button has type="button" to prevent form submission', () => {
    render(<PasswordInput value="" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
