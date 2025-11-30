import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateRelative(date) {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  if (diff < 7) return `Il y a ${diff} jours`
  return formatDate(date)
}
