import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, categoriesApi } from '../lib/api'
import { formatCurrency, formatDate } from '../lib/utils'
import * as LucideIcons from 'lucide-react'
import { 
  Plus, Calendar, Clock, Repeat, Trash2, X, Pencil, Tag,
  TrendingUp, TrendingDown, ArrowLeftRight, Play 
} from 'lucide-react'
import axios from 'axios'

// Fonction pour obtenir le composant icône par nom
const getIconComponent = (iconName) => {
  if (!iconName) return Tag
  const formattedName = iconName.charAt(0).toUpperCase() + iconName.slice(1)
  return LucideIcons[formattedName] || Tag
}

const frequencies = [
  { value: 'once', label: 'Une fois' },
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'biweekly', label: 'Bi-hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'bimonthly', label: 'Bimestriel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'semiannual', label: 'Semestriel' },
  { value: 'annual', label: 'Annuel' },
]

function PlannedModal({ planned, accounts, categories, onClose, onSave }) {
  const [formData, setFormData] = useState(planned || {
    accountId: accounts?.[0]?.id || '',
    categoryId: '',
    amount: '',
    description: '',
    type: 'expense',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    executeBeforeHoliday: false,
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const amount = parseFloat(formData.amount)
    // Filtrer les données pour n'envoyer que les champs nécessaires
    onSave({
      accountId: formData.accountId,
      categoryId: formData.categoryId || null,
      amount: formData.type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      description: formData.description,
      type: formData.type,
      frequency: formData.frequency,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      executeBeforeHoliday: formData.executeBeforeHoliday || false,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {planned ? 'Modifier' : 'Nouvelle transaction récurrente'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {[
              { value: 'expense', label: 'Dépense', icon: TrendingDown },
              { value: 'income', label: 'Revenu', icon: TrendingUp },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, type: value })}
                className={`flex-1 p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                  formData.type === value ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input text-xl font-bold text-center"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              placeholder="Ex: Loyer, Salaire..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="input"
                required
              >
                <option value="">Sélectionner</option>
                {accounts?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin (optionnel)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={formData.categoryId || ''}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
              className="input"
            >
              <option value="">Non catégorisé</option>
              {categories?.filter(c => c.type === formData.type)
                .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
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
              Exécution le dernier jour ouvré avant échéance
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {planned ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PlannedTransactions() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlanned, setEditingPlanned] = useState(null)
  const queryClient = useQueryClient()

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

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories', { flat: true }],
    queryFn: () => categoriesApi.getAll({ flat: 'true' }).then(r => r.data.data.categories),
  })

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
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
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
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
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
      Erreur: {error.message}
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions récurrentes</h1>
          <p className="text-gray-600">Gérez vos opérations automatiques</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouvelle
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-600" />
            À venir (30 jours)
          </h2>
          {upcoming?.length > 0 ? (
            <div className="space-y-3">
              {upcoming.slice(0, 10).map((tx, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.nextOccurrence ? formatDate(tx.nextOccurrence) : '-'}</p>
                  </div>
                  <span className={`font-semibold text-sm ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Aucune transaction à venir</p>
          )}
        </div>

        {/* Planned list */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-primary-600" />
            Liste des transactions récurrentes
          </h2>
          {data?.data?.length > 0 ? (
            <div className="space-y-3">
              {data.data.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-sm transition-shadow group">
                  <div className={`p-3 rounded-xl ${tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'income' ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{tx.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{frequencies.find(f => f.value === tx.frequency)?.label || tx.frequency}</span>
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
                          <span>Prochaine: {formatDate(tx.nextOccurrence)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-lg font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                        if (confirm(`Supprimer "${tx.description}" ?`)) {
                          deleteMutation.mutate(tx.id)
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune transaction récurrente</p>
          )}
        </div>
      </div>

      {modalOpen && (
        <PlannedModal
          planned={editingPlanned}
          accounts={accounts}
          categories={categories}
          onClose={() => { setModalOpen(false); setEditingPlanned(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
