/**
 * @fileoverview Forecast page
 * Displays merged actual + projected transactions for a given period
 */

import { useState, useCallback, useMemo, useDeferredValue, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsApi, accountsApi, categoriesApi } from '../lib/api'
import { getDatePeriod } from '../lib/utils'
import { useFormatters } from '../hooks/useFormatters'
import { useAuth } from '../contexts/AuthContext'
import { getPersistedAccountTab, setPersistedAccountTab } from '../lib/accountTabPersistence'
import AccountTabs from '../components/AccountTabs'
import { getIconComponent } from '../lib/iconMap'
import {
  Search, TrendingUp, TrendingDown, ArrowLeftRight,
  Calendar, X, ArrowUpDown, ArrowUp, ArrowDown,
  RotateCcw, Users, Tag, Loader2
} from 'lucide-react'

const SortIcon = ({ column, sort }) => {
  if (sort.sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-gray-400" />
  return sort.sortOrder === 'asc'
    ? <ArrowUp className="w-3 h-3 text-primary-600" />
    : <ArrowDown className="w-3 h-3 text-primary-600" />
}

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

const TransactionTypeIcon = ({ type, amount }) => {
  if (type === 'income') {
    return (
      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
      </div>
    )
  }
  if (type === 'transfer') {
    const isIncoming = amount > 0
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isIncoming ? 'bg-green-100' : 'bg-red-100'}`}>
        <ArrowLeftRight className={`w-3.5 h-3.5 ${isIncoming ? 'text-green-600 rotate-180' : 'text-red-600'}`} />
      </div>
    )
  }
  return (
    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
      <TrendingDown className="w-3.5 h-3.5 text-red-600" />
    </div>
  )
}

export default function Forecast() {
  const { t } = useTranslation()
  const { formatCurrency, formatDate } = useFormatters()
  const { userSettings } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [searchInput, setSearchInput] = useState('')
  const deferredSearch = useDeferredValue(searchInput)
  const initialAccount = searchParams.get('account') || getPersistedAccountTab()
  const [accountTab, setAccountTab] = useState(initialAccount)

  // Default to next month
  const defaultPeriod = 'nextMonth'
  const defaultDates = getDatePeriod(defaultPeriod, userSettings?.weekStartDay ?? 1)
  const [filters, setFilters] = useState({
    accountId: initialAccount,
    categoryId: '',
    type: '',
    isReconciled: '',
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate,
  })
  const [sort, setSort] = useState({ sortBy: 'date', sortOrder: 'asc' })
  const [quickPeriod, setQuickPeriod] = useState(defaultPeriod)

  const handleAccountTab = useCallback((accountId) => {
    setAccountTab(accountId)
    setFilters(prev => ({ ...prev, accountId }))
    setPersistedAccountTab(accountId)
    if (accountId) {
      setSearchParams({ account: accountId }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [setSearchParams])

  const hasActiveFilters = useMemo(() => {
    return searchInput || filters.accountId || filters.categoryId ||
      filters.type || filters.isReconciled
  }, [searchInput, filters])

  const resetAllFilters = useCallback(() => {
    setSearchInput('')
    setAccountTab('')
    setPersistedAccountTab('')
    const dates = getDatePeriod(defaultPeriod, userSettings?.weekStartDay ?? 1)
    setFilters({ accountId: '', categoryId: '', type: '', isReconciled: '', startDate: dates.startDate, endDate: dates.endDate })
    setQuickPeriod(defaultPeriod)
    setSearchParams({}, { replace: true })
  }, [setSearchParams, userSettings?.weekStartDay])

  const handleQuickPeriod = useCallback((value) => {
    setQuickPeriod(value)
    if (!value) {
      setFilters(prev => ({ ...prev, startDate: '', endDate: '' }))
      return
    }
    const { startDate, endDate } = getDatePeriod(value, userSettings?.weekStartDay ?? 1)
    setFilters(prev => ({ ...prev, startDate, endDate }))
  }, [userSettings?.weekStartDay])

  const handleSort = useCallback((column) => {
    setSort(prev => {
      if (prev.sortBy !== column) return { sortBy: column, sortOrder: 'asc' }
      if (prev.sortOrder === 'asc') return { sortBy: column, sortOrder: 'desc' }
      return { sortBy: 'date', sortOrder: 'asc' }
    })
  }, [])

  const queryFilters = useMemo(() => ({
    ...filters,
    search: deferredSearch,
  }), [filters, deferredSearch])

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })

  // Validate persisted account tab exists in loaded accounts
  useEffect(() => {
    if (accountsData?.data && accountTab) {
      const exists = accountsData.data.some(a => a.id === accountTab)
      if (!exists) {
        handleAccountTab('')
      }
    }
  }, [accountsData?.data])

  const { data: categoriesData } = useQuery({
    queryKey: ['categories', { flat: true }],
    queryFn: () => categoriesApi.getAll({ flat: 'true' }).then(r => r.data.data.categories),
  })

  const { data: forecastData, isLoading } = useQuery({
    queryKey: ['forecast-transactions', queryFilters],
    queryFn: () => reportsApi.getForecastTransactions(queryFilters).then(r => r.data.data),
    enabled: !!filters.startDate && !!filters.endDate,
  })

  const transactions = useMemo(() => {
    if (!forecastData?.data) return []
    const list = [...forecastData.data]
    if (sort.sortBy === 'date') {
      list.sort((a, b) => sort.sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
    } else if (sort.sortBy === 'amount') {
      list.sort((a, b) => sort.sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount)
    } else if (sort.sortBy === 'description') {
      list.sort((a, b) => sort.sortOrder === 'asc' ? a.description.localeCompare(b.description) : b.description.localeCompare(a.description))
    }
    return list
  }, [forecastData?.data, sort])

  const totalCount = forecastData?.counts?.total || 0
  const projectedCount = forecastData?.counts?.projected || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('forecast.title')}</h1>
        <p className="text-gray-600">
          {totalCount > 0
            ? `${t('forecast.operationCount', { count: totalCount })} — ${projectedCount} ${t('forecast.projected').toLowerCase()}`
            : t('forecast.subtitle')
          }
        </p>
      </div>

      <AccountTabs accounts={accountsData?.data} selected={accountTab} onSelect={handleAccountTab} />

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input pl-10 pr-9"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {!accountTab && (
            <div className="w-48">
              <select
                value={filters.accountId}
                onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                className="input"
              >
                <option value="">{t('transactions.filters.allAccounts')}</option>
                {accountsData?.data?.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="w-48">
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="input"
            >
              <option value="">{t('transactions.filters.allCategories')}</option>
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
              <option value="">{t('transactions.filters.allTypes')}</option>
              <option value="income">{t('transactions.filters.income')}</option>
              <option value="expense">{t('transactions.filters.expense')}</option>
              <option value="transfer">{t('transactions.filters.transfer')}</option>
            </select>
          </div>
          <div className="w-40">
            <select
              value={filters.isReconciled}
              onChange={(e) => setFilters({ ...filters, isReconciled: e.target.value })}
              className="input"
            >
              <option value="">{t('transactions.filters.allStatuses')}</option>
              <option value="true">{t('transactions.filters.reconciled')}</option>
              <option value="false">{t('transactions.filters.notReconciled')}</option>
            </select>
          </div>
        </div>

        {/* Date filters */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{t('transactions.filters.period')}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => { setFilters({ ...filters, startDate: e.target.value }); setQuickPeriod('') }}
              className="input w-36 text-sm"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => { setFilters({ ...filters, endDate: e.target.value }); setQuickPeriod('') }}
              className="input w-36 text-sm"
              min={filters.startDate}
            />
          </div>
          <select
            className="input w-44 text-sm"
            value={quickPeriod}
            onChange={(e) => handleQuickPeriod(e.target.value)}
          >
            <option value="">{t('transactions.filters.allDates')}</option>
            <option value="currentMonthFull">{t('forecast.currentMonth')}</option>
            <option value="nextMonth">{t('forecast.nextMonth')}</option>
            <option value="week">{t('transactions.filters.currentWeek')}</option>
            <option value="month">{t('transactions.filters.currentMonth')}</option>
            <option value="30days">{t('transactions.filters.last30days')}</option>
            <option value="year">{t('transactions.filters.currentYear')}</option>
          </select>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{t('transactions.filters.resetAll')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Transactions table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('forecast.noTransactions')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 w-10"></th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1">
                      {t('common.date')}
                      <SortIcon column="date" sort={sort} />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center gap-1">
                      {t('common.description')}
                      <SortIcon column="description" sort={sort} />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">
                    {t('transactions.payee')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-40">
                    {t('transactions.category')}
                  </th>
                  {!accountTab && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">
                      {t('transactions.account')}
                    </th>
                  )}
                  <th
                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-36 cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {t('common.amount')}
                      <SortIcon column="amount" sort={sort} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`transition-colors ${
                      tx.source === 'projected'
                        ? 'opacity-60 border-l-2 border-dashed border-primary-300'
                        : tx.isReconciled ? 'bg-green-50' : ''
                    } hover:bg-gray-50`}
                  >
                    <td className="px-2 py-3">
                      <TransactionTypeIcon type={tx.type} amount={tx.amount} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(tx.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{tx.description}</p>
                        {tx.source === 'projected' && (
                          <span className="text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded font-medium">
                            {t('forecast.projected')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {tx.payeeName ? (
                        <div className="flex items-center gap-2">
                          {tx.payeeImageUrl ? (
                            <img src={tx.payeeImageUrl} alt={tx.payeeName} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
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
                    {!accountTab && (
                      <td className="px-4 py-3 text-sm text-gray-600">{tx.accountName}</td>
                    )}
                    <td className={`px-4 py-3 text-right font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
