import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../lib/api'
import { useFormatters } from '../hooks/useFormatters'
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Reports() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('trend')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <p className="text-gray-600">{t('reports.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'trend', label: t('reports.tabs.trend'), icon: TrendingUp },
          { id: 'categories', label: t('reports.tabs.categories'), icon: PieChart },
          { id: 'forecast', label: t('reports.tabs.forecast'), icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'trend' && <MonthlyTrend />}
      {activeTab === 'categories' && <CategoryBreakdown />}
      {activeTab === 'forecast' && <Forecast />}
    </div>
  )
}

function MonthlyTrend() {
  const { t } = useTranslation()
  const { formatCurrency } = useFormatters()
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => reportsApi.getMonthlyTrend({ months: 12 }).then(r => r.data.data.trend),
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-6">{t('reports.trend.title')}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
            <Tooltip
              formatter={(value) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px' }}
            />
            <Bar dataKey="income" name={t('reports.trend.income')} fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name={t('reports.trend.expenses')} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CategoryBreakdown() {
  const { t } = useTranslation()
  const { formatCurrency } = useFormatters()
  const { data, isLoading } = useQuery({
    queryKey: ['expenses-category-report'],
    queryFn: () => reportsApi.getExpensesByCategory({}).then(r => r.data.data.expenses),
  })

  if (isLoading) return <LoadingState />

  const pieData = data?.slice(0, 8).map((e, i) => ({
    name: e.categoryName,
    value: e.total,
    color: e.color || COLORS[i % COLORS.length],
  })) || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-6">{t('reports.categoryBreakdown.title')}</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-6">{t('reports.categoryBreakdown.detail')}</h3>
        <div className="space-y-4">
          {data?.slice(0, 8).map((cat, i) => (
            <div key={cat.categoryId || i} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.color || COLORS[i % COLORS.length] }}
              />
              <span className="flex-1 text-gray-700 truncate">{cat.categoryName}</span>
              <span className="text-sm text-gray-500">{cat.percentage}%</span>
              <span className="font-semibold">{formatCurrency(cat.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Forecast() {
  const { t } = useTranslation()
  const { formatCurrency, locale } = useFormatters()
  const { data, isLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => reportsApi.getForecast({ days: 90 }).then(r => r.data.data.forecast),
  })

  if (isLoading) return <LoadingState />

  const chartData = data?.dailyBalances?.filter((_, i) => i % 7 === 0) || []
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-US'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">{t('reports.forecast.currentBalance')}</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.currentBalance || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">{t('reports.forecast.in30days')}</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.forecast?.days30 || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">{t('reports.forecast.in60days')}</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.forecast?.days60 || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">{t('reports.forecast.in90days')}</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.forecast?.days90 || 0)}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-6">{t('reports.forecast.title')}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: 'short' }).format(new Date(v))}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => new Intl.DateTimeFormat(intlLocale).format(new Date(label))}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="card flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  )
}
