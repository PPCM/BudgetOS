/**
 * @fileoverview Reusable confirmation modal.
 * Used for reversible lifecycle actions (suspend/reactivate, deactivate/reactivate,
 * remove-from-group) so they share the same look as the permanent-delete modals.
 *
 * For irreversible destructive actions, use the typed-confirmation modals defined
 * inline in Accounts.jsx / AdminUsers.jsx instead - they require retyping the
 * resource name/email before enabling the confirm button.
 */

import { X, AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react'
import Modal from './Modal'

const variants = {
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    titleClass: 'text-amber-700',
    confirmClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  danger: {
    icon: Trash2,
    iconClass: 'text-red-600',
    titleClass: 'text-red-700',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-600',
    titleClass: 'text-green-700',
    confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
  },
  default: {
    icon: Info,
    iconClass: 'text-primary-600',
    titleClass: 'text-gray-900',
    confirmClass: 'btn-primary',
  },
}

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} props.message
 * @param {string} props.confirmLabel
 * @param {string} props.cancelLabel
 * @param {'default' | 'warning' | 'success'} [props.variant='default']
 * @param {React.ComponentType} [props.icon] - Override the default variant icon
 * @param {Function} props.onConfirm
 * @param {Function} props.onClose
 * @param {boolean} [props.isPending]
 */
export default function ConfirmModal({
  title, message, confirmLabel, cancelLabel, variant = 'default', icon: IconOverride,
  onConfirm, onClose, isPending = false,
}) {
  const style = variants[variant] || variants.default
  const Icon = IconOverride || style.icon

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${style.iconClass}`} />
            <h2 className={`text-lg font-semibold ${style.titleClass}`}>{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 text-sm text-gray-700 whitespace-pre-line">{message}</div>
        <div className="flex items-center justify-end gap-2 p-4 border-t">
          <button type="button" onClick={onClose} className="btn">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`btn ${style.confirmClass} flex items-center gap-2 disabled:opacity-50`}
          >
            {isPending && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
