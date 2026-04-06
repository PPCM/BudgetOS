import { useTranslation } from 'react-i18next'

/**
 * Reusable account tabs bar for filtering by account
 * @param {Object} props
 * @param {Array} props.accounts - List of account objects
 * @param {string} props.selected - Currently selected account ID ('' = all)
 * @param {Function} props.onSelect - Callback when tab is clicked
 */
export default function AccountTabs({ accounts, selected, onSelect }) {
  const { t } = useTranslation()

  if (!accounts?.length) return null

  return (
    <div className="flex gap-1 border-b border-gray-200 overflow-x-auto pb-px">
      <button
        onClick={() => onSelect('')}
        className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
          !selected
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        {t('transactions.filters.allAccounts')}
      </button>
      {accounts.map((account) => (
        <button
          key={account.id}
          onClick={() => onSelect(account.id)}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
            selected === account.id
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: account.color }}
          />
          {account.name}
        </button>
      ))}
    </div>
  )
}
