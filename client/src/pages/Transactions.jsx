/**
 * @fileoverview Transactions management page
 * Provides CRUD operations with filtering, search, and infinite scroll
 */

import { useState, useRef, useEffect, useCallback, useMemo, useDeferredValue } from 'react'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi, accountsApi, categoriesApi, payeesApi } from '../lib/api'
import { formatCurrency, formatDate, getDatePeriod } from '../lib/utils'
import { getIconComponent } from '../lib/iconMap'
import {
  Plus, Search, TrendingUp, TrendingDown,
  ArrowLeftRight, X, Calendar, Pencil, Trash2, Tag, Users, Loader2,
  CheckCircle2, Scale, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import SearchableSelect from '../components/SearchableSelect'
import Modal from '../components/Modal'
import { findKnownLogo } from '../lib/knownLogos'
import { useAuth } from '../contexts/AuthContext'

/**
 * Sort icon component for table headers
 * Extracted outside component to prevent recreation on each render
 * @param {Object} props - Component props
 * @param {string} props.column - Column name
 * @param {Object} props.sort - Current sort state { sortBy, sortOrder }
 */
const SortIcon = ({ column, sort }) => {
  if (sort.sortBy !== column) {
    return <ArrowUpDown className="w-3 h-3 text-gray-400" />
  }
  return sort.sortOrder === 'asc'
    ? <ArrowUp className="w-3 h-3 text-primary-600" />
    : <ArrowDown className="w-3 h-3 text-primary-600" />
}

/**
 * Category icon component with background
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon name
 * @param {string} props.color - Icon color
 */
const CategoryIcon = ({ icon, color }) => {
  const IconComp = getIconComponent(icon)
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: (color || '#6B7280') + '20', color: color || '#6B7280' }}
    >
      <IconComp className="w-3 h-3" />
    </div>
  )
}

/**
 * Modal form for creating or editing a transaction
 * Supports income, expense, and transfer types
 * @param {Object} props - Component props
 * @param {Object|null} props.transaction - Existing transaction for editing, null for creation
 * @param {Array} props.accounts - Available bank accounts
 * @param {Array} props.categories - Available categories
 * @param {Array} props.payees - Available payees
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onSave - Callback with form data when saved
 * @param {Function} props.onCreatePayee - Callback to create a new payee inline
 * @param {Function} props.onCreateCategory - Callback to create a new category inline
 */
function TransactionModal({ transaction, accounts, categories, payees, onClose, onSave, onCreatePayee, onCreateCategory }) {
  const [formData, setFormData] = useState(transaction || {
    accountId: accounts?.[0]?.id || '',
    toAccountId: '',
    categoryId: '',
    payeeId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  // Filtrer les catégories par type
  const filteredCategories = categories?.filter(c => c.type === formData.type || c.type === 'transfer')
    .sort((a, b) => a.name.localeCompare(b.name, 'fr')) || []

  const sortedPayees = payees?.sort((a, b) => a.name.localeCompare(b.name, 'fr')) || []

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {transaction ? 'Modifier' : 'Nouvelle transaction'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {[
              { value: 'expense', label: 'Dépense', icon: TrendingDown, color: 'red' },
              { value: 'income', label: 'Revenu', icon: TrendingUp, color: 'green' },
              { value: 'transfer', label: 'Virement', icon: ArrowLeftRight, color: 'blue' },
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input text-2xl font-bold text-center"
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
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="input"
              required
            />
          </div>

          {/* Comptes - affichage différent pour les virements */}
          {formData.type === 'transfer' ? (
            <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compte source (débit)</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Sélectionner le compte source</option>
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
                  Compte destination (crédit) - optionnel
                  {formData.payeeId && <span className="text-xs text-amber-600 ml-2">(désactivé car tiers sélectionné)</span>}
                </label>
                <select
                  value={formData.toAccountId}
                  onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                  className="input"
                  disabled={!!formData.payeeId}
                >
                  <option value="">Aucun (virement externe)</option>
                  {accounts?.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === formData.accountId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
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
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <SearchableSelect
              value={formData.categoryId}
              onChange={(id) => setFormData({ ...formData, categoryId: id })}
              options={filteredCategories}
              placeholder="Tapez pour rechercher..."
              emptyMessage="Aucune catégorie trouvée"
              allowCreate={!!onCreateCategory}
              createLabel="Créer la catégorie"
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
              Tiers (optionnel)
              {formData.type === 'transfer' && formData.toAccountId && (
                <span className="text-xs text-amber-600 ml-2">(désactivé car compte destination sélectionné)</span>
              )}
            </label>
            <SearchableSelect
              value={formData.payeeId}
              onChange={(id) => setFormData({ ...formData, payeeId: id })}
              options={sortedPayees}
              placeholder="Tapez pour rechercher..."
              emptyMessage="Aucun tiers trouvé"
              allowCreate={!!onCreatePayee}
              createLabel="Créer le tiers"
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

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {transaction ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

/**
 * Transactions page component
 * Displays all transactions with filtering, search, and infinite scroll
 * Supports creating, editing, and deleting transactions
 * @returns {JSX.Element} The transactions page
 */
export default function Transactions() {
  const { userSettings } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  /** @type {boolean} Whether reconciliation mode is active */
  const [reconcileMode, setReconcileMode] = useState(false)
  /** @type {string} Search input value (immediate) */
  const [searchInput, setSearchInput] = useState('')
  /** @type {string} Deferred search value (debounced) */
  const deferredSearch = useDeferredValue(searchInput)
  /** @type {Object} Filter state for account, category, type, reconciliation status, and date range */
  const [filters, setFilters] = useState({
    accountId: '',
    categoryId: '',
    type: '',
    isReconciled: '',
    startDate: '',
    endDate: ''
  })
  /** @type {Object} Sort state for column sorting */
  const [sort, setSort] = useState({ sortBy: 'date', sortOrder: 'desc' })
  /** @type {string} Quick period filter selection */
  const [quickPeriod, setQuickPeriod] = useState('')
  const queryClient = useQueryClient()
  /** @type {React.RefObject} Reference for infinite scroll trigger element */
  const loadMoreRef = useRef(null)

  // Combine filters with deferred search for API call
  const queryFilters = useMemo(() => ({
    ...filters,
    search: deferredSearch
  }), [filters, deferredSearch])

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['transactions', queryFilters, sort],
    queryFn: ({ pageParam = 1 }) =>
      transactionsApi.getAll({ ...queryFilters, ...sort, page: pageParam, limit: 10 }).then(r => r.data),
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1
      }
      return undefined
    },
  })

  /**
   * Handles column header click for sorting
   * Cycle: desc -> asc -> neutral (default: date desc)
   */
  const handleSort = useCallback((column) => {
    setSort(prev => {
      if (prev.sortBy !== column) {
        return { sortBy: column, sortOrder: 'desc' }
      }
      if (prev.sortOrder === 'desc') {
        return { sortBy: column, sortOrder: 'asc' }
      }
      return { sortBy: 'date', sortOrder: 'desc' }
    })
  }, [])

  /**
   * Handles quick period selection
   */
  const handleQuickPeriod = useCallback((value) => {
    setQuickPeriod(value)
    if (!value) {
      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
      return
    }
    const { startDate, endDate } = getDatePeriod(value, userSettings?.weekStartDay ?? 1)
    setFilters(prev => ({ ...prev, startDate, endDate }))
  }, [userSettings?.weekStartDay])

  // Scroll infini avec IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Aplatir les pages de transactions
  const transactions = data?.pages?.flatMap(page => page.data) || []
  const totalCount = data?.pages?.[0]?.pagination?.total || 0

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', { flat: true }],
    queryFn: () => categoriesApi.getAll({ flat: 'true' }).then(r => r.data.data.categories),
  })

  const { data: payeesData } = useQuery({
    queryKey: ['payees'],
    queryFn: () => payeesApi.getAll().then(r => r.data.data),
  })

  const createPayeeMutation = useMutation({
    mutationFn: payeesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] })
    },
  })

  const handleCreatePayee = async (name) => {
    try {
      // Rechercher un logo connu pour cette entreprise
      const imageUrl = findKnownLogo(name)
      const result = await createPayeeMutation.mutateAsync({ name, imageUrl })
      return result.data.data
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
      return null
    }
  }

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

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
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
      return null
    }
  }

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setModalOpen(false)
    },
    onError: (err) => {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => transactionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setModalOpen(false)
      setEditingTx(null)
    },
    onError: (err) => {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  /**
   * Mutation for toggling transaction reconciliation status
   * Uses optimistic update for better UX
   */
  const toggleReconcileMutation = useMutation({
    mutationFn: transactionsApi.toggleReconcile,
    onMutate: async (txId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['transactions'] })

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['transactions', queryFilters, sort])

      // Optimistically update
      queryClient.setQueryData(['transactions', queryFilters, sort], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.map(tx =>
              tx.id === txId
                ? { ...tx, isReconciled: !tx.isReconciled }
                : tx
            )
          }))
        }
      })

      return { previousData }
    },
    onError: (err, txId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['transactions', queryFilters, sort], context.previousData)
      }
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  /**
   * Handles toggling reconciliation status for a transaction
   */
  const handleToggleReconcile = useCallback((tx) => {
    toggleReconcileMutation.mutate(tx.id)
  }, [toggleReconcileMutation])

  const handleSave = (formData) => {
    // Filtrer les données pour n'envoyer que les champs nécessaires
    const cleanData = {
      accountId: formData.accountId,
      categoryId: formData.categoryId || null,
      payeeId: formData.payeeId || null,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      type: formData.type,
    }

    // Pour les virements, gérer le compte destination
    if (formData.type === 'transfer') {
      if (formData.toAccountId) {
        // Destination account selected
        cleanData.toAccountId = formData.toAccountId
      } else if (editingTx) {
        // Editing a transfer with no destination = external transfer
        // Send null to remove linked transaction
        cleanData.toAccountId = null
      }
    }

    // Ajuster le montant selon le type
    if (cleanData.type === 'expense' || cleanData.type === 'transfer') {
      cleanData.amount = -Math.abs(cleanData.amount)
    } else {
      cleanData.amount = Math.abs(cleanData.amount)
    }

    if (editingTx) {
      updateMutation.mutate({ id: editingTx.id, data: cleanData })
    } else {
      createMutation.mutate(cleanData)
    }
  }

  const handleEdit = useCallback((tx) => {
    setEditingTx({
      ...tx,
      amount: Math.abs(tx.amount),
      date: tx.date.split('T')[0],
      // Pour les virements, récupérer le compte destination depuis la transaction liée
      toAccountId: tx.linkedAccountId || '',
    })
    setModalOpen(true)
  }, [])

  const handleDelete = useCallback((tx) => {
    if (confirm(`Supprimer la transaction "${tx.description}" ?`)) {
      deleteMutation.mutate(tx.id)
    }
  }, [deleteMutation])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">
            {totalCount > 0 ? `${totalCount} opération${totalCount > 1 ? 's' : ''}` : 'Historique de vos opérations'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setReconcileMode(!reconcileMode)}
            className={`btn flex items-center gap-2 ${
              reconcileMode
                ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                : 'btn-secondary'
            }`}
            title="Mode rapprochement bancaire"
          >
            <Scale className="w-5 h-5" />
            {reconcileMode ? 'Quitter rapprochement' : 'Rapprochement'}
          </button>
          {!reconcileMode && (
            <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nouvelle
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="w-48">
            <select
              value={filters.accountId}
              onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
              className="input"
            >
              <option value="">Tous les comptes</option>
              {accountsData?.data?.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="input"
            >
              <option value="">Toutes catégories</option>
              {categoriesData?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-36">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="input"
            >
              <option value="">Tous types</option>
              <option value="income">Revenus</option>
              <option value="expense">Dépenses</option>
              <option value="transfer">Virements</option>
            </select>
          </div>
          <div className="w-40">
            <select
              value={filters.isReconciled}
              onChange={(e) => setFilters({ ...filters, isReconciled: e.target.value })}
              className="input"
            >
              <option value="">Tous statuts</option>
              <option value="true">Rapprochées</option>
              <option value="false">Non rapprochées</option>
            </select>
          </div>
        </div>
        
        {/* Filtres de date */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Période :</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value })
                setQuickPeriod('')
              }}
              className="input w-36 text-sm"
              placeholder="Du"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value })
                setQuickPeriod('')
              }}
              className="input w-36 text-sm"
              min={filters.startDate}
              placeholder="Au"
            />
          </div>
          <select
            className="input w-40 text-sm"
            value={quickPeriod}
            onChange={(e) => handleQuickPeriod(e.target.value)}
          >
            <option value="">Toutes les dates</option>
            <option value="week">Semaine en cours</option>
            <option value="7days">7 derniers jours</option>
            <option value="month">Mois en cours</option>
            <option value="30days">30 derniers jours</option>
            <option value="year">Année en cours</option>
            <option value="365days">365 derniers jours</option>
          </select>
          {(filters.startDate || filters.endDate) && (
            <button
              onClick={() => {
                setFilters({ ...filters, startDate: '', endDate: '' })
                setQuickPeriod('')
              }}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Transactions list */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-1">
                        Date
                        <SortIcon column="date" sort={sort} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center gap-1">
                        Description
                        <SortIcon column="description" sort={sort} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('payee')}
                    >
                      <div className="flex items-center gap-1">
                        Tiers
                        <SortIcon column="payee" sort={sort} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('category')}
                    >
                      <div className="flex items-center gap-1">
                        Catégorie
                        <SortIcon column="category" sort={sort} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('account')}
                    >
                      <div className="flex items-center gap-1">
                        Compte
                        <SortIcon column="account" sort={sort} />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-28 cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Montant
                        <SortIcon column="amount" sort={sort} />
                      </div>
                    </th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`group transition-colors ${
                        tx.isReconciled
                          ? 'bg-green-50 hover:bg-green-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{tx.description}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.payeeName ? (
                          <div className="flex items-center gap-2">
                            {tx.payeeImageUrl ? (
                              <img 
                                src={tx.payeeImageUrl} 
                                alt={tx.payeeName}
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Users className="w-3 h-3 text-gray-400" />
                              </div>
                            )}
                            <span>{tx.payeeName}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.categoryName ? (
                          <div className="flex items-center gap-2">
                            <CategoryIcon icon={tx.categoryIcon} color={tx.categoryColor} />
                            <span>{tx.categoryName}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tx.accountName}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-1 h-7 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {reconcileMode ? (
                            <button
                              onClick={() => handleToggleReconcile(tx)}
                              className={`p-1.5 rounded transition-colors ${
                                tx.isReconciled
                                  ? 'text-green-600 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              }`}
                              title={tx.isReconciled ? 'Annuler le rapprochement' : 'Marquer comme rapproché'}
                            >
                              <CheckCircle2 className={`w-4 h-4 ${tx.isReconciled ? 'fill-green-100' : ''}`} />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(tx)}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(tx)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Élément de déclenchement du scroll infini */}
            <div ref={loadMoreRef} className="h-1" />

            {/* Loader de chargement */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4 border-t">
                <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <TransactionModal
          transaction={editingTx}
          accounts={accountsData?.data}
          categories={categoriesData}
          payees={payeesData}
          onClose={() => { setModalOpen(false); setEditingTx(null); }}
          onSave={handleSave}
          onCreatePayee={handleCreatePayee}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  )
}
