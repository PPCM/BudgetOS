import { useQuery } from '@tanstack/react-query'
import { reportsApi, accountsApi } from '../lib/api'
import { formatCurrency, formatDateRelative } from '../lib/utils'
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, 
  ArrowDownRight, Clock, PieChart
} from 'lucide-react'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

function StatCard({ title, value, icon: Icon, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(trend).toFixed(1)}% vs mois dernier
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function RecentTransactions({ transactions }) {
  if (!transactions?.length) {
    return <p className="text-gray-500 text-center py-8">Aucune transaction récente</p>
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50">
          <div className={`p-2 rounded-full ${tx.amount >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
            {tx.amount >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{tx.description}</p>
            <p className="text-sm text-gray-500">{tx.categoryName || 'Non catégorisé'}</p>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
            </p>
            <p className="text-xs text-gray-500">{formatDateRelative(tx.date)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.getDashboard().then(r => r.data.data),
  })

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.getAll().then(r => r.data),
  })

  const { data: expenses } = useQuery({
    queryKey: ['expenses-category'],
    queryFn: () => reportsApi.getExpensesByCategory({}).then(r => r.data.data.expenses),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const pieData = expenses?.slice(0, 6).map((e, i) => ({
    name: e.categoryName,
    value: e.total,
    color: e.color || COLORS[i % COLORS.length],
  })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-600">Vue d'ensemble de vos finances</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Solde total"
          value={formatCurrency(dashboard?.totalBalance || 0)}
          icon={Wallet}
          color="primary"
        />
        <StatCard
          title="Revenus du mois"
          value={formatCurrency(dashboard?.monthlyIncome || 0)}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Dépenses du mois"
          value={formatCurrency(dashboard?.monthlyExpenses || 0)}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Flux net"
          value={formatCurrency(dashboard?.monthlyNetFlow || 0)}
          icon={Clock}
          color={dashboard?.monthlyNetFlow >= 0 ? 'green' : 'red'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes comptes</h2>
          <div className="space-y-3">
            {accounts?.data?.map((account) => (
              <div key={account.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: account.color + '20', color: account.color }}
                >
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{account.name}</p>
                  <p className="text-xs text-gray-500">{account.institution}</p>
                </div>
                <p className={`font-semibold ${account.currentBalance >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                  {formatCurrency(account.currentBalance)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Expenses by category */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Dépenses par catégorie
          </h2>
          {pieData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
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
          ) : (
            <p className="text-gray-500 text-center py-8">Aucune donnée</p>
          )}
          <div className="mt-4 space-y-2">
            {pieData.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="flex-1 text-gray-600 truncate">{item.name}</span>
                <span className="font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transactions récentes</h2>
          <RecentTransactions transactions={dashboard?.recentTransactions} />
        </div>
      </div>
    </div>
  )
}
