/**
 * @fileoverview Reusable modal component
 * Provides a backdrop overlay with click-outside and escape key handling
 * Respects the user's modalPersistent setting to prevent accidental closes
 */

import { useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Modal component with overlay backdrop
 * Closes on Escape key press or click outside the content
 * When modalPersistent setting is enabled, click-outside is disabled
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Modal content
 * @param {Function} props.onClose - Callback when modal should close
 * @param {string} [props.className=''] - Additional CSS classes for the overlay
 * @returns {JSX.Element} The modal component
 */
export default function Modal({ children, onClose, className = '' }) {
  const overlayRef = useRef(null)
  const { userSettings } = useAuth()
  const persistent = userSettings?.modalPersistent ?? false

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  /**
   * Handles click on overlay to close modal
   * Only closes if click is directly on overlay, not on children
   * Disabled when modalPersistent setting is enabled
   */
  const handleOverlayClick = (e) => {
    if (persistent) return
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${className}`}
    >
      {children}
    </div>
  )
}
