import { useRef, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Formatted amount input that respects user's decimal/grouping preferences.
 * - Both "," and "." keys produce the user's decimal separator
 * - Digit grouping symbols appear automatically
 * - Grouping symbols are skipped when navigating/deleting
 *
 * @param {Object} props
 * @param {string} props.value - Raw value (digits + optional '.') e.g. "1234.56"
 * @param {Function} props.onChange - Called with the new raw value string
 * @param {string} [props.className] - CSS classes
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.required] - HTML required attribute
 */
export default function FormattedAmountInput({ value, onChange, className, placeholder, required, ...props }) {
  const { user } = useAuth()
  const decimalSep = user?.decimalSeparator || ','
  const digitGroup = user?.digitGrouping || ' '
  const inputRef = useRef(null)

  // Format raw value (digits + optional '.') for display
  const toDisplay = useCallback((raw) => {
    if (!raw) return ''
    const [intPart, decPart] = raw.split('.')

    let grouped = intPart || ''
    if (digitGroup && grouped.length > 3) {
      grouped = grouped.replace(/\B(?=(\d{3})+(?!\d))/g, digitGroup)
    }

    if (decPart !== undefined) {
      return `${grouped}${decimalSep}${decPart}`
    }
    return grouped
  }, [decimalSep, digitGroup])

  // Check if a character is a grouping symbol
  const isGroupChar = useCallback((ch) => {
    return digitGroup && ch === digitGroup
  }, [digitGroup])

  // Count significant chars (digits + decimal sep) up to position in display string
  const countSignificant = useCallback((display, pos) => {
    let count = 0
    for (let i = 0; i < pos && i < display.length; i++) {
      if (!isGroupChar(display[i])) count++
    }
    return count
  }, [isGroupChar])

  // Find display position corresponding to N significant chars
  const findDisplayPos = useCallback((display, sigCount) => {
    let count = 0
    for (let i = 0; i < display.length; i++) {
      if (count >= sigCount) return i
      if (!isGroupChar(display[i])) count++
    }
    return display.length
  }, [isGroupChar])

  // Extract raw value from an arbitrary input string
  const extractRaw = useCallback((input) => {
    let raw = ''
    let hasDecimal = false
    let decimalDigits = 0

    for (const ch of input) {
      if (/\d/.test(ch)) {
        if (hasDecimal) {
          if (decimalDigits < 2) {
            raw += ch
            decimalDigits++
          }
        } else {
          raw += ch
        }
      } else if ((ch === ',' || ch === '.' || ch === decimalSep) && !hasDecimal) {
        raw += '.'
        hasDecimal = true
      }
    }

    // Remove leading zeros (but keep "0." for decimals)
    if (raw.length > 1 && raw[0] === '0' && raw[1] !== '.') {
      raw = raw.replace(/^0+/, '') || '0'
    }

    return raw
  }, [decimalSep])

  const setCursor = useCallback((pos) => {
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(pos, pos)
      }
    })
  }, [])

  const handleChange = useCallback((e) => {
    const input = e.target
    const cursorPos = input.selectionStart
    const inputValue = input.value

    // Count significant chars before cursor in the current input
    const sigBefore = countSignificant(inputValue, cursorPos)

    // Extract raw value
    const newRaw = extractRaw(inputValue)
    onChange(newRaw)

    // Restore cursor position in the new formatted display
    const newDisplay = toDisplay(newRaw)
    const newPos = findDisplayPos(newDisplay, sigBefore)
    setCursor(newPos)
  }, [countSignificant, extractRaw, findDisplayPos, onChange, setCursor, toDisplay])

  // Skip grouping symbols on arrow keys and handle backspace/delete
  const handleKeyDown = useCallback((e) => {
    const input = e.target
    const pos = input.selectionStart
    const selEnd = input.selectionEnd
    const display = toDisplay(value)

    // If there's a selection, let onChange handle it
    if (pos !== selEnd) return

    if (e.key === 'ArrowLeft') {
      // Skip grouping symbols when moving left
      let newPos = pos - 1
      while (newPos > 0 && isGroupChar(display[newPos])) {
        newPos--
      }
      if (newPos !== pos - 1) {
        e.preventDefault()
        input.setSelectionRange(newPos, newPos)
      }
    } else if (e.key === 'ArrowRight') {
      // Skip grouping symbols when moving right
      let newPos = pos + 1
      while (newPos < display.length && isGroupChar(display[newPos])) {
        newPos++
      }
      if (newPos !== pos + 1) {
        e.preventDefault()
        input.setSelectionRange(newPos, newPos)
      }
    } else if (e.key === 'Backspace') {
      // If char before cursor is a grouping symbol, skip it
      if (pos > 0 && isGroupChar(display[pos - 1])) {
        e.preventDefault()
        // Remove the significant char before the grouping symbol
        const sigPos = countSignificant(display, pos - 1)
        if (sigPos > 0) {
          // Remove the char at raw position sigPos - 1
          const rawChars = value.split('')
          rawChars.splice(sigPos - 1, 1)
          const newRaw = rawChars.join('')
          onChange(newRaw)
          const newDisplay = toDisplay(newRaw)
          const newCursorPos = findDisplayPos(newDisplay, sigPos - 1)
          setCursor(newCursorPos)
        }
      }
    } else if (e.key === 'Delete') {
      // If char after cursor is a grouping symbol, skip it
      if (pos < display.length && isGroupChar(display[pos])) {
        e.preventDefault()
        // Delete the significant char after the grouping symbol
        const sigPos = countSignificant(display, pos + 1)
        if (sigPos < value.length) {
          const rawChars = value.split('')
          rawChars.splice(sigPos, 1)
          const newRaw = rawChars.join('')
          onChange(newRaw)
          const newDisplay = toDisplay(newRaw)
          const newCursorPos = findDisplayPos(newDisplay, sigPos)
          setCursor(newCursorPos)
        }
      }
    }
  }, [countSignificant, findDisplayPos, isGroupChar, onChange, setCursor, toDisplay, value])

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={toDisplay(value)}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder || `0${decimalSep}00`}
      required={required}
      {...props}
    />
  )
}
