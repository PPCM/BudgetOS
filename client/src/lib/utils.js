/**
 * @fileoverview Utility functions for BudgetOS frontend
 * Provides formatting helpers and class name utilities
 */

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS classes with conflict resolution
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 * @param {...(string|Object|Array)} inputs - Class names or conditional class objects
 * @returns {string} Merged class string
 * @example
 * cn('px-2 py-1', condition && 'bg-blue-500', 'px-4') // => 'py-1 bg-blue-500 px-4'
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency
 * @param {number} amount - The amount to format
 * @param {string} currency - ISO 4217 currency code (default: 'EUR')
 * @returns {string} Formatted currency string (e.g., "1 234,56 €")
 * @example
 * formatCurrency(1234.56) // => "1 234,56 €"
 * formatCurrency(1234.56, 'USD') // => "1 234,56 $US"
 */
export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
}

/**
 * Formats a date in French locale (dd/MM/yyyy)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string (e.g., "20/01/2026")
 * @example
 * formatDate('2026-01-20') // => "20/01/2026"
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

/**
 * Formats a date as a relative string in French
 * @param {string|Date} date - Date to format
 * @returns {string} Relative date string (e.g., "Aujourd'hui", "Hier", "Il y a 3 jours")
 * @example
 * formatDateRelative(new Date()) // => "Aujourd'hui"
 * formatDateRelative(yesterday) // => "Hier"
 */
export function formatDateRelative(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))

  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return `Il y a ${diff} jours`
  return formatDate(date)
}
