import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Plus, X } from 'lucide-react'

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner...',
  emptyMessage = 'Aucun résultat',
  allowCreate = false,
  createLabel = 'Créer',
  onCreate,
  displayValue,
  renderOption,
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Obtenir le label d'une option
  const getLabel = (opt) => typeof opt === 'string' ? opt : (opt.name || opt.label || '')
  const getId = (opt) => typeof opt === 'string' ? opt : opt.id

  // Option sélectionnée
  const selectedOption = options.find((opt) => getId(opt) === value)

  // Mettre à jour l'input quand la sélection change
  useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedOption ? getLabel(selectedOption) : '')
    }
  }, [selectedOption, isOpen])

  // Calculer la position du dropdown
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [isOpen])

  // Fermer le dropdown quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        const dropdown = document.getElementById('searchable-dropdown')
        if (dropdown && !dropdown.contains(e.target)) {
          setIsOpen(false)
          setInputValue(selectedOption ? getLabel(selectedOption) : '')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedOption])

  // Filtrer les options
  const filteredOptions = options.filter((opt) => {
    if (!inputValue) return true
    return getLabel(opt).toLowerCase().includes(inputValue.toLowerCase())
  })

  // Première suggestion (pour auto-complétion visuelle)
  const firstMatch = inputValue ? filteredOptions[0] : null

  const handleInputChange = (e) => {
    const val = e.target.value
    setInputValue(val)
    if (!isOpen) setIsOpen(true)
  }

  const handleSelect = (opt) => {
    onChange(getId(opt))
    setInputValue(getLabel(opt))
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (firstMatch) {
        handleSelect(firstMatch)
      } else if (allowCreate && inputValue.trim() && filteredOptions.length === 0) {
        handleCreate()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setInputValue(selectedOption ? getLabel(selectedOption) : '')
    } else if (e.key === 'Tab' && firstMatch && inputValue) {
      // Auto-complétion avec Tab
      e.preventDefault()
      handleSelect(firstMatch)
    }
  }

  const handleCreate = async () => {
    if (!inputValue.trim() || !onCreate) return
    setCreating(true)
    try {
      const newItem = await onCreate(inputValue.trim())
      if (newItem) {
        onChange(newItem.id)
        setInputValue(newItem.name || inputValue.trim())
        setIsOpen(false)
      }
    } finally {
      setCreating(false)
    }
  }

  const showCreateOption = allowCreate && inputValue.trim() && filteredOptions.length === 0

  // Dropdown content
  const dropdownContent = isOpen && (
    <div
      id="searchable-dropdown"
      style={dropdownStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
    >
      {filteredOptions.length > 0 ? (
        filteredOptions.map((opt, idx) => {
          const id = getId(opt)
          const isSelected = id === value
          return (
            <button
              key={id || idx}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 ${
                isSelected ? 'bg-primary-50 text-primary-700' : ''
              }`}
            >
              {renderOption ? renderOption(opt) : <span>{getLabel(opt)}</span>}
            </button>
          )
        })
      ) : !showCreateOption ? (
        <div className="px-3 py-3 text-sm text-gray-500 text-center">
          {emptyMessage}
        </div>
      ) : null}

      {showCreateOption && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-primary-50 text-primary-600"
        >
          <Plus className="w-4 h-4" />
          <span>{creating ? 'Création...' : `${createLabel} "${inputValue}"`}</span>
        </button>
      )}
    </div>
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => !disabled && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`input w-full pr-16 ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            className={`p-1 hover:bg-gray-200 rounded ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Portal pour sortir de la modal */}
      {!disabled && createPortal(dropdownContent, document.body)}
    </div>
  )
}
