import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, LineChart, Line
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function Reports() {
  const [activeTab, setActiveTab] = useState('trend')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-gray-600">Analysez vos finances</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'trend', label: 'Évolution', icon: TrendingUp },
          { id: 'categories', label: 'Par catégorie', icon: PieChart },
          { id: 'forecast', label: 'Prévisions', icon: Calendar },
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
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-trend'],
    queryFn: () => reportsApi.getMonthlyTrend({ months: 12 }).then(r => r.data.data.trend),
  })

  if (isLoading) return <LoadingState />

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-6">Revenus vs Dépenses (12 derniers mois)</h3>
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
            <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CategoryBreakdown() {
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
        <h3 className="text-lg font-semibold mb-6">Répartition des dépenses</h3>
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
        <h3 className="text-lg font-semibold mb-6">Détail par catégorie</h3>
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
  const { data, isLoading } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => reportsApi.getForecast({ days: 90 }).then(r => r.data.data.forecast),
  })

  if (isLoading) return <LoadingState />

  const chartData = data?.dailyBalances?.filter((_, i) => i % 7 === 0) || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-600">Solde actuel</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.currentBalance || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Dans 30 jours</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.forecast?.days30 || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Dans 60 jours</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.forecast?.days60 || 0)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-600">Dans 90 jours</p>
          <p className="text-2xl font-bold">{formatCurrency(data?.forecast?.days90 || 0)}</p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-6">Prévision de trésorerie</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => new Date(label).toLocaleDateString('fr-FR')}
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
