import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

/**
 * Hook providing locale-aware formatters for currency, dates, and relative dates
 * @returns {{ formatCurrency: Function, formatDate: Function, formatDateRelative: Function, locale: string }}
 */
export function useFormatters() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const locale = i18n.language || user?.locale || 'fr'

  const formatters = useMemo(() => {
    const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

    const formatCurrency = (amount, currency = 'EUR') => {
      return new Intl.NumberFormat(intlLocale, {
        style: 'currency',
        currency,
      }).format(amount)
    }

    const formatDate = (date) => {
      return new Intl.DateTimeFormat(intlLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(date))
    }

    const formatDateRelative = (date) => {
      const now = new Date()
      const d = new Date(date)
      const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))

      if (diff === 0) return t('dates.today')
      if (diff === 1) return t('dates.yesterday')
      if (diff < 7) return t('dates.daysAgo', { count: diff })
      return formatDate(date)
    }

    return { formatCurrency, formatDate, formatDateRelative, locale }
  }, [locale, t])

  return formatters
}
