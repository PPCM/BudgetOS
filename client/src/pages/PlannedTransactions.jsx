import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, categoriesApi, payeesApi } from '../lib/api'
import { translateError } from '../lib/errorHelper'
import { useFormatters, parseAmount } from '../hooks/useFormatters'
import FormattedAmountInput from '../components/FormattedAmountInput'
import * as LucideIcons from 'lucide-react'
import {
  Plus, Calendar, Clock, Repeat, Trash2, X, Pencil, Tag,
  TrendingUp, TrendingDown, ArrowLeftRight, Play, Users
} from 'lucide-react'
import axios from 'axios'
import SearchableSelect from '../components/SearchableSelect'
import Modal from '../components/Modal'

// Get icon component by name
const getIconComponent = (iconName) => {
  if (!iconName) return Tag
  const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1)
  return LucideIcons[formattedName] || Tag
}

function PlannedModal({ planned, accounts, categories, payees, onClose, onSave, onCreatePayee, onCreateCategory }) {
  const { t } = useTranslation()

  const frequencies = [
    { value: 'once', label: t('planned.frequencies.once') },
    { value: 'daily', label: t('planned.frequencies.daily') },
    { value: 'weekly', label: t('planned.frequencies.weekly') },
    { value: 'biweekly', label: t('planned.frequencies.biweekly') },
    { value: 'monthly', label: t('planned.frequencies.monthly') },
    { value: 'bimonthly', label: t('planned.frequencies.bimonthly') },
    { value: 'quarterly', label: t('planned.frequencies.quarterly') },
    { value: 'semiannual', label: t('planned.frequencies.semiannual') },
    { value: 'annual', label: t('planned.frequencies.annual') },
  ]

  const [formData, setFormData] = useState(() => {
    if (planned) {
      return { ...planned, amount: planned.amount != null ? String(Math.abs(planned.amount)) : '' }
    }
    return {
      accountId: accounts?.[0]?.id || '',
      toAccountId: '',
      categoryId: '',
      payeeId: '',
      amount: '',
      description: '',
      type: 'expense',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      executeBeforeHoliday: false,
      deleteOnEnd: false,
    }
  })

  const sortedPayees = payees?.sort((a, b) => a.name.localeCompare(b.name, 'fr')) || []

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = parseAmount(formData.amount)
    // Filter data to only send required fields
    const data = {
      accountId: formData.accountId,
      categoryId: formData.categoryId || null,
      payeeId: formData.payeeId || null,
      amount: (formData.type === 'expense' || formData.type === 'transfer') ? -Math.abs(amount) : Math.abs(amount),
      description: formData.description,
      type: formData.type,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      executeBeforeHoliday: formData.executeBeforeHoliday || false,
      deleteOnEnd: formData.deleteOnEnd || false,
    }
    // For transfers, add destination account (exclusive with payee)
    if (formData.type === 'transfer' && formData.toAccountId) {
      data.toAccountId = formData.toAccountId
      data.payeeId = null // No payee if destination account
    }
    onSave(data)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {planned ? t('planned.editPlanned') : t('planned.newPlannedTitle')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {[
              { value: 'expense', label: t('transactions.types.expense'), icon: TrendingDown, color: 'red' },
              { value: 'income', label: t('transactions.types.income'), icon: TrendingUp, color: 'green' },
              { value: 'transfer', label: t('transactions.types.transfer'), icon: ArrowLeftRight, color: 'blue' },
            ].map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, type: value })}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                  formData.type === value
                    ? `border-${color}-500 bg-${color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${formData.type === value ? `text-${color}-600` : 'text-gray-400'}`} />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.amount')}</label>
            <FormattedAmountInput
              value={formData.amount}
              onChange={(val) => setFormData({ ...formData, amount: val })}
              className="input text-xl font-bold text-center"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description')}</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              placeholder={t('planned.descriptionPlaceholder')}
              required
            />
          </div>

          {/* Accounts - different layout for transfers */}
          {formData.type === 'transfer' ? (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('planned.sourceAccount')}</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">{t('planned.selectSource')}</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === formData.toAccountId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-center">
                <ArrowLeftRight className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('planned.destAccount')}
                  {formData.payeeId && <span className="text-xs text-amber-600 ml-2">({t('planned.disabledPayee')})</span>}
                </label>
                <select
                  value={formData.toAccountId}
                  onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                  className="input"
                  disabled={!!formData.payeeId}
                >
                  <option value="">{t('planned.noDestExternal')}</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === formData.accountId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.account')}</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('planned.frequency')}</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="input"
                >
                  {frequencies.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Frequency (for transfers, displayed separately) */}
          {formData.type === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('planned.frequency')}</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="input"
              >
                {frequencies.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('planned.startDate')}</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('planned.endDate')}</label>
              <input
                type="date"
                value={formData.endDate || ''}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value || null })}
                className="input"
                min={formData.startDate}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.category')}</label>
            <SearchableSelect
              value={formData.categoryId}
              onChange={(id) => setFormData({ ...formData, categoryId: id })}
              options={categories?.filter(c => c.type === formData.type || c.type === 'transfer')
                .sort((a, b) => a.name.localeCompare(b.name, 'fr')) || []}
              placeholder={t('transactions.searchCategories')}
              emptyMessage={t('transactions.noCategory')}
              allowCreate={!!onCreateCategory}
              createLabel={t('transactions.createCategory')}
              onCreate={(name) => onCreateCategory(name, formData.type)}
              renderOption={(cat) => {
                const IconComp = getIconComponent(cat.icon)
                return (
                  <span className="flex items-center gap-2">
                    <span style={{ color: cat.color || '#6B7280' }}>
                      <IconComp className="w-4 h-4" />
                    </span>
                    {cat.name}
                  </span>
                )
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('transactions.payeeOptional')}
              {formData.type === 'transfer' && formData.toAccountId && (
                <span className="text-xs text-amber-600 ml-2">({t('planned.disabledDestAccount')})</span>
              )}
            </label>
            <SearchableSelect
              value={formData.payeeId}
              onChange={(id) => setFormData({ ...formData, payeeId: id })}
              options={sortedPayees}
              placeholder={t('transactions.searchPayees')}
              emptyMessage={t('transactions.noPayee')}
              allowCreate={!!onCreatePayee}
              createLabel={t('transactions.createPayee')}
              onCreate={onCreatePayee}
              disabled={formData.type === 'transfer' && !!formData.toAccountId}
              renderOption={(p) => (
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  {p.name}
                </span>
              )}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="executeBeforeHoliday"
              checked={formData.executeBeforeHoliday}
              onChange={(e) => setFormData({ ...formData, executeBeforeHoliday: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="executeBeforeHoliday" className="text-sm text-gray-700">
              {t('planned.executeBeforeHoliday')}
            </label>
          </div>

          {/* Delete on end date option */}
          {formData.endDate && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <input
                type="checkbox"
                id="deleteOnEnd"
                checked={formData.deleteOnEnd}
                onChange={(e) => setFormData({ ...formData, deleteOnEnd: e.target.checked })}
                className="rounded border-amber-400"
              />
              <label htmlFor="deleteOnEnd" className="text-sm text-amber-800">
                {t('planned.deleteOnEnd')}
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {planned ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function PlannedTransactions() {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useFormatters()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlanned, setEditingPlanned] = useState(null)
  const queryClient = useQueryClient()

  // Build frequencies lookup for display in the list
  const frequencyLabels = {
    once: t('planned.frequencies.once'),
    daily: t('planned.frequencies.daily'),
    weekly: t('planned.frequencies.weekly'),
    biweekly: t('planned.frequencies.biweekly'),
    monthly: t('planned.frequencies.monthly'),
    bimonthly: t('planned.frequencies.bimonthly'),
    quarterly: t('planned.frequencies.quarterly'),
    semiannual: t('planned.frequencies.semiannual'),
    annual: t('planned.frequencies.annual'),
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['planned-transactions'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/planned-transactions', { withCredentials: true })
      return data
    },
  })

  const { data: upcoming } = useQuery({
    queryKey: ['upcoming-transactions'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/planned-transactions/upcoming?days=30', { withCredentials: true })
      return data.data?.upcoming || []
    },
  })

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories', { flat: true }],
    queryFn: () => categoriesApi.getAll({ flat: 'true' }).then(r => r.data.data.categories),
  })

  const { data: payeesData } = useQuery({
    queryKey: ['payees'],
    queryFn: () => payeesApi.getAll().then(r => r.data.data),
  })

  const accounts = accountsData?.data
  const categories = categoriesData
  const payees = payeesData
  const dataReady = !accountsLoading && !categoriesLoading && accounts?.length > 0

  // Mutations for inline payee and category creation
  const createPayeeMutation = useMutation({
    mutationFn: payeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const handleCreatePayee = async (name) => {
    try {
      const result = await createPayeeMutation.mutateAsync({ name })
      return result.data.data
    } catch (err) {
      alert(translateError(err))
      return null
    }
  }

  const handleCreateCategory = async (name, type) => {
    try {
      const result = await createCategoryMutation.mutateAsync({
        name,
        type: type || 'expense',
        icon: 'tag',
        color: '#6B7280'
      })
      return result.data.data.category
    } catch (err) {
      alert(translateError(err))
      return null
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.post('/api/v1/planned-transactions', data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['planned-transactions'])
      queryClient.invalidateQueries(['upcoming-transactions'])
      setModalOpen(false)
    },
    onError: (err) => {
      alert(translateError(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.put(`/api/v1/planned-transactions/${id}`, data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['planned-transactions'])
      queryClient.invalidateQueries(['upcoming-transactions'])
      setModalOpen(false)
      setEditingPlanned(null)
    },
    onError: (err) => {
      alert(translateError(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.delete(`/api/v1/planned-transactions/${id}`, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['planned-transactions'])
      queryClient.invalidateQueries(['upcoming-transactions'])
    },
  })

  const handleEdit = (tx) => {
    setEditingPlanned({
      ...tx,
      amount: Math.abs(tx.amount),
      startDate: tx.startDate?.split('T')[0] || tx.startDate,
      endDate: tx.endDate?.split('T')[0] || tx.endDate || '',
    })
    setModalOpen(true)
  }

  const handleSave = (formData) => {
    if (editingPlanned) {
      updateMutation.mutate({ id: editingPlanned.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  }

  if (error) {
    return <div className="text-center py-12 text-red-600">
      {t('common.error')}: {error.message}
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('planned.title')}</h1>
          <p className="text-gray-600">{t('planned.subtitle')}</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('planned.newPlanned')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" />
            {t('planned.upcoming')}
          </h2>
          {upcoming?.length > 0 ? (
            <div className="space-y-3">
              {upcoming.slice(0, 10).map((tx, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${
                    tx.type === 'income' ? 'bg-green-100' :
                    tx.type === 'transfer' ? 'bg-blue-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : tx.type === 'transfer' ? (
                      <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {tx.nextOccurrence ? formatDate(tx.nextOccurrence) : '-'}
                      {tx.payeeName && (
                        <span className="ml-1 inline-flex items-center gap-1">
                          •
                          {tx.payeeImageUrl ? (
                            <img src={tx.payeeImageUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover inline" />
                          ) : (
                            <Users className="w-3 h-3 text-gray-400 inline" />
                          )}
                          {tx.payeeName}
                        </span>
                      )}
                      {tx.type === 'transfer' && tx.toAccountName && (
                        <span className="ml-1">• {tx.accountName} → {tx.toAccountName}</span>
                      )}
                    </p>
                  </div>
                  <span className={`font-semibold text-sm ${
                    tx.type === 'income' ? 'text-green-600' :
                    tx.type === 'transfer' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">{t('planned.noUpcoming')}</p>
          )}
        </div>

        {/* Planned list */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary-600" />
            {t('planned.listTitle')}
          </h2>
          {data?.data?.length > 0 ? (
            <div className="space-y-3">
              {data.data.map((tx) => {
                // Consider ended if isActive=false OR if end date is in the past
                const isEnded = !tx.isActive || (tx.endDate && new Date(tx.endDate) < new Date(new Date().toDateString()))
                return (
                <div key={tx.id} className={`flex items-center gap-4 p-4 border rounded-xl hover:shadow-sm transition-shadow group ${
                  isEnded ? 'bg-gray-200' : ''
                }`}>
                  <div className={`p-3 rounded-xl ${
                    isEnded ? 'bg-gray-300' :
                    tx.type === 'income' ? 'bg-green-100' :
                    tx.type === 'transfer' ? 'bg-blue-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className={`w-5 h-5 ${isEnded ? 'text-gray-400' : 'text-green-600'}`} />
                    ) : tx.type === 'transfer' ? (
                      <ArrowLeftRight className={`w-5 h-5 ${isEnded ? 'text-gray-400' : 'text-blue-600'}`} />
                    ) : (
                      <TrendingDown className={`w-5 h-5 ${isEnded ? 'text-gray-400' : 'text-red-600'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold flex items-center gap-2 ${isEnded ? 'text-gray-400' : 'text-gray-900'}`}>
                      {tx.description}
                      {isEnded && (
                        <span className="text-xs px-2 py-0.5 bg-gray-400 text-gray-100 rounded-full">{t('planned.ended')}</span>
                      )}
                    </p>
                    <div className={`flex items-center gap-2 text-sm ${isEnded ? 'text-gray-400' : 'text-gray-500'}`}>
                      <span>{frequencyLabels[tx.frequency] || tx.frequency}</span>
                      {tx.type === 'transfer' && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {tx.accountName}
                            {tx.toAccountName && (
                              <>
                                <ArrowLeftRight className="w-3 h-3 text-blue-500" />
                                {tx.toAccountName}
                              </>
                            )}
                          </span>
                        </>
                      )}
                      {tx.payeeName && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {tx.payeeImageUrl ? (
                              <img src={tx.payeeImageUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <Users className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            {tx.payeeName}
                          </span>
                        </>
                      )}
                      {tx.categoryName && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            {(() => {
                              const IconComp = getIconComponent(tx.categoryIcon)
                              return (
                                <span style={{ color: tx.categoryColor || '#6B7280' }}>
                                  <IconComp className="w-3.5 h-3.5" />
                                </span>
                              )
                            })()}
                            {tx.categoryName}
                          </span>
                        </>
                      )}
                      {tx.nextOccurrence && (
                        <>
                          <span>•</span>
                          <span>{t('planned.next')} {formatDate(tx.nextOccurrence)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${
                    isEnded ? 'text-gray-400' :
                    tx.type === 'income' ? 'text-green-600' :
                    tx.type === 'transfer' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(tx)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(t('planned.confirmDelete', { description: tx.description }))) {
                          deleteMutation.mutate(tx.id)
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('planned.noPlanned')}</p>
          )}
        </div>
      </div>

      {modalOpen && (
        dataReady ? (
          <PlannedModal
            key={editingPlanned?.id || 'new'}
            planned={editingPlanned}
            accounts={accounts}
            categories={categories}
            payees={payees}
            onClose={() => { setModalOpen(false); setEditingPlanned(null); }}
            onSave={handleSave}
            onCreatePayee={handleCreatePayee}
            onCreateCategory={handleCreateCategory}
          />
        ) : (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('planned.loadingData')}</p>
              <button
                onClick={() => setModalOpen(false)}
                className="btn btn-secondary mt-4"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
