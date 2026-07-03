const STORAGE_KEY = 'budgetos_selected_account'

/**
 * Get persisted account tab from localStorage
 * @returns {string} Account ID or empty string
 */
export function getPersistedAccountTab() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

/**
 * Persist account tab selection to localStorage
 * @param {string} accountId - Account ID or empty string to clear
 */
export function setPersistedAccountTab(accountId) {
  try {
    if (accountId) {
      localStorage.setItem(STORAGE_KEY, accountId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch { /* ignore storage errors (private mode, quota) */ }
}
