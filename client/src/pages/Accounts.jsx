import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '../lib/api'
import { formatCurrency } from '../lib/utils'
import { 
  Plus, Wallet, PiggyBank, Landmark, CreditCard, 
  MoreVertical, Pencil, Trash2, X 
} from 'lucide-react'

const accountTypes = {
  checking: { label: 'Compte courant', icon: Wallet },
  savings: { label: 'Épargne', icon: PiggyBank },
  cash: { label: 'Espèces', icon: Wallet },
  investment: { label: 'Investissement', icon: Landmark },
  credit_card: { label: 'Carte de crédit', icon: CreditCard },
}

function AccountModal({ account, onClose, onSave }) {
  const [formData, setFormData] = useState(account || {
    name: '', type: 'checking', institution: '', initialBalance: 0, color: '#3b82f6'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {account ? 'Modifier le compte' : 'Nouveau compte'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Établissement</label>
            <input
              type="text"
              value={formData.institution || ''}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solde initial</label>
            <input
              type="number"
              step="0.01"
              value={formData.initialBalance}
              onChange={(e) => setFormData({ ...formData, initialBalance: parseFloat(e.target.value) || 0 })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full h-10 rounded cursor-pointer"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {account ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Accounts() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)
  const queryClient = useQueryClient()

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
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['accounts'])
      setEditingAccount(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['accounts']),
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
          <h1 className="text-2xl font-bold text-gray-900">Comptes</h1>
          <p className="text-gray-600">Gérez vos comptes bancaires</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouveau compte
        </button>
      </div>

      {/* Totals */}
      {data?.totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Solde total</p>
            <p className="text-2xl font-bold">{formatCurrency(data.totals.totalBalance)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Disponible</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(data.totals.availableBalance)}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Investissements</p>
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(data.totals.investmentBalance)}</p>
          </div>
        </div>
      )}

      {/* Accounts list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data?.map((account) => {
          const TypeIcon = accountTypes[account.type]?.icon || Wallet
          return (
            <div key={account.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: account.color + '20', color: account.color }}
                >
                  <TypeIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{account.name}</h3>
                  <p className="text-sm text-gray-500">{accountTypes[account.type]?.label}</p>
                  {account.institution && (
                    <p className="text-xs text-gray-400">{account.institution}</p>
                  )}
                </div>
                <div className="relative group">
                  <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={() => setEditingAccount(account)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Pencil className="w-4 h-4" /> Modifier
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(account.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </div>
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
