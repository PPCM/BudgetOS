import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const LANGUAGES = [
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'it', flag: '🇮🇹', name: 'Italiano' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'sv', flag: '🇸🇪', name: 'Svenska' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
]

/**
 * Form-compatible language dropdown with emoji flags
 * @param {Object} props
 * @param {string} props.value - Current language code
 * @param {Function} props.onChange - Callback with new language code
 * @param {string} [props.className] - Additional CSS classes for the container
 */
export default function FormLanguageSelect({ value, onChange, className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const currentLang = LANGUAGES.find((l) => l.code === value) || LANGUAGES[0]

  const handleSelect = (code) => {
    onChange(code)
    setIsOpen(false)
  }

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="input w-full flex items-center gap-2 text-left cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-base">{currentLang.flag}</span>
        <span className="flex-1 text-sm text-gray-900">{currentLang.name}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      <div
        role="listbox"
        aria-label="Language selection"
        className={`absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden transition-all duration-200 origin-top ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {LANGUAGES.map((lang) => {
          const isActive = value === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={isActive}
              onClick={() => handleSelect(lang.code)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.name}</span>
              {isActive && <Check size={16} className="text-primary-600" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
