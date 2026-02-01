import i18n from '../i18n'

/**
 * Translate a backend error response
 * Falls back to the original message if no translation key matches
 * @param {Object} error - Axios error object or error response
 * @returns {string} Translated error message
 */
export function translateError(error) {
  const data = error?.response?.data?.error || error
  const code = data?.code
  const message = data?.message || error?.message || ''

  if (code) {
    const key = `errors.${code}`
    const translated = i18n.t(key)
    if (translated !== key) {
      // Interpolate details if present
      if (data?.details?.length > 0) {
        return data.details.map(d => {
          const detailKey = `validation.${d.code || d.message}`
          const detailTranslated = i18n.t(detailKey)
          return detailTranslated !== detailKey ? detailTranslated : d.message
        }).join(', ')
      }
      return translated
    }
  }

  // If error has validation details, translate them
  if (data?.details?.length > 0) {
    return data.details.map(d => {
      const detailKey = `validation.${d.code || d.message}`
      const detailTranslated = i18n.t(detailKey)
      return detailTranslated !== detailKey ? detailTranslated : d.message
    }).join(', ')
  }

  return message
}
