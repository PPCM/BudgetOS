/**
 * Expandable detail row for a transaction.
 * Displays fields not visible in the main table columns.
 */
import {
  FileText, Hash, Tag, Calendar, RefreshCw, ArrowLeftRight
} from 'lucide-react'
import { formatDate } from '../lib/utils'

/**
 * Check whether a transaction has expandable details to display.
 * Used by the parent list to decide if the expand chevron should appear.
 * @param {Object} tx - The transaction object
 * @returns {boolean}
 */
export function hasExpandableDetails(tx) {
  return !!(
    tx.notes ||
    tx.checkNumber ||
    (tx.tags && tx.tags.length > 0) ||
    tx.valueDate ||
    tx.purchaseDate ||
    tx.accountingDate ||
    tx.isRecurring ||
    (tx.type === 'transfer' && tx.linkedAccountName)
  )
}

/**
 * @param {Object} props
 * @param {Object} props.tx - The transaction object
 * @param {number} props.colSpan - Number of columns to span
 */
export default function TransactionExpandedRow({ tx, colSpan }) {
  const details = []

  if (tx.notes) {
    details.push({ icon: FileText, label: 'Notes', value: tx.notes })
  }

  if (tx.checkNumber) {
    details.push({ icon: Hash, label: 'N° de chèque', value: tx.checkNumber })
  }

  if (tx.tags && tx.tags.length > 0) {
    details.push({
      icon: Tag,
      label: 'Tags',
      value: (
        <div className="flex flex-wrap gap-1">
          {tx.tags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      ),
    })
  }

  if (tx.valueDate) {
    details.push({ icon: Calendar, label: 'Date de valeur', value: formatDate(tx.valueDate) })
  }

  if (tx.purchaseDate) {
    details.push({ icon: Calendar, label: "Date d'achat", value: formatDate(tx.purchaseDate) })
  }

  if (tx.accountingDate) {
    details.push({ icon: Calendar, label: 'Date comptable', value: formatDate(tx.accountingDate) })
  }

  if (tx.isRecurring) {
    details.push({ icon: RefreshCw, label: 'Récurrente', value: 'Oui' })
  }

  if (tx.type === 'transfer' && tx.linkedAccountName) {
    details.push({ icon: ArrowLeftRight, label: 'Compte lié', value: tx.linkedAccountName })
  }

  return (
    <tr className="bg-gray-50 border-b border-gray-200">
      <td colSpan={colSpan} className="px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {details.map((detail) => {
            const Icon = detail.icon
            return (
              <div key={detail.label} className="flex items-start gap-2 text-sm">
                <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-gray-500">{detail.label} :</span>{' '}
                  <span className="text-gray-800 font-medium">
                    {detail.value}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </td>
    </tr>
  )
}
