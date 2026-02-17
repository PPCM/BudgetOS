import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Password input with show/hide toggle button.
 * Only reveals passwords being typed — never stored passwords.
 * Wraps the input in a relative div with an eye icon toggle.
 * @param {Object} props - Standard input props (value, onChange, className, required, etc.)
 */
export default function PasswordInput({ className = 'input', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        tabIndex={-1}
      >
        {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
      </button>
    </div>
  )
}
