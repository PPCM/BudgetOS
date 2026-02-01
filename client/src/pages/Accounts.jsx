/**
 * @fileoverview Accounts management page
 * Provides CRUD operations for bank accounts with balance tracking
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../lib/api'
import { translateError } from '../lib/errorHelper'
import { useFormatters } from '../hooks/useFormatters'
import {
  Plus, Wallet, PiggyBank, Landmark,
  Pencil, Trash2, X, HandCoins
} from 'lucide-react'
import Modal from '../components/Modal'

/**
 * Account type icons mapping
 * @type {Object.<string, React.Component>}
 */
const accountTypeIcons = {
  checking: Wallet,
  savings: PiggyBank,
  cash: HandCoins,
  investment: Landmark,
}

/**
 * Modal form for creating or editing a bank account
 * @param {Object} props - Component props
 * @param {Object|null} props.account - Existing account for editing, null for creation
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onSave - Callback with form data when saved
 */
function AccountModal({ account, onClose, onSave }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: account?.name || '',
    type: account?.type || 'checking',
    institution: account?.institution || '',
    initialBalance: account?.initialBalance || 0,
    color: account?.color || '#3b82f6'
  })

  const accountTypes = {
    checking: { label: t('accounts.types.checking'), icon: Wallet },
    savings: { label: t('accounts.types.savings'), icon: PiggyBank },
    cash: { label: t('accounts.types.cash'), icon: HandCoins },
    investment: { label: t('accounts.types.investment'), icon: Landmark },
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Only send necessary fields
    const data = {
      name: formData.name,
      type: formData.type,
      color: formData.color
    }
    // Optional fields - do not send if empty
    if (formData.institution?.trim()) {
      data.institution = formData.institution.trim()
    }
    // Initial balance only for new accounts
    if (!account) {
      data.initialBalance = parseFloat(formData.initialBalance) || 0
    }
    onSave(data)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {account ? t('accounts.editAccount') : t('accounts.newAccount')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type')}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              {Object.entries(accountTypes).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounts.institution')}</label>
            <input
              type="text"
              value={formData.institution || ''}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="input"
            />
          </div>
          {/* Initial balance only for new accounts */}
          {!account && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('accounts.initialBalance')}</label>
              <input
                type="number"
                step="0.01"
                value={formData.initialBalance}
                onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
                className="input"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.color')}</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {account ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

/**
 * Accounts page component
 * Displays all bank accounts with their current balances
 * Supports creating, editing, and deleting accounts
 * @returns {JSX.Element} The accounts page
 */
export default function Accounts() {
  const { t } = useTranslation()
  const { formatCurrency } = useFormatters()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const queryClient = useQueryClient()

  const accountTypes = {
    checking: { label: t('accounts.types.checking'), icon: Wallet },
    savings: { label: t('accounts.types.savings'), icon: PiggyBank },
    cash: { label: t('accounts.types.cash'), icon: HandCoins },
    investment: { label: t('accounts.types.investment'), icon: Landmark },
  }

  const { data, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts'])
      setModalOpen(false)
    },
    onError: (err) => {
      alert(translateError(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts'])
      setEditingAccount(null)
    },
    onError: (err) => {
      alert(translateError(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['accounts']),
    onError: (err) => {
      alert(translateError(err))
    },
  })

  const handleSave = (formData) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('accounts.title')}</h1>
          <p className="text-gray-600">{t('accounts.subtitle')}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {t('accounts.newAccount')}
        </button>
      </div>

      {/* Totals */}
      {data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">{t('accounts.totalBalance')}</p>
            <p className="text-2xl font-bold">{formatCurrency(data.totals.totalBalance)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">{t('accounts.available')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totals.availableBalance)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">{t('accounts.investments')}</p>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(data.totals.investmentBalance)}</p>
          </div>
        </div>
      )}

      {/* Accounts list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data?.map((account) => {
          const TypeIcon = accountTypeIcons[account.type] || Wallet
          return (
            <div key={account.id} className="card hover:shadow-md transition-shadow relative group">
              {/* Hover actions */}
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingAccount(account)}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title={t('common.edit')}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(t('accounts.confirmDelete', { name: account.name }))) {
                      deleteMutation.mutate(account.id)
                    }
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('common.delete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: account.color + '20', color: account.color }}
                >
                  <TypeIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <h3 className="font-semibold text-gray-900 truncate">{account.name}</h3>
                  <p className="text-sm text-gray-500">{accountTypes[account.type]?.label}</p>
                  {account.institution && (
                    <p className="text-xs text-gray-400">{account.institution}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className={`text-2xl font-bold ${account.currentBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {(modalOpen || editingAccount) && (
        <AccountModal
          account={editingAccount}
          onClose={() => { setModalOpen(false); setEditingAccount(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
