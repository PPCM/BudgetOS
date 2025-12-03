import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payeesApi } from '../lib/api'
import { Plus, Search, Pencil, Trash2, X, User, Users, AlertTriangle } from 'lucide-react'
import PayeeImageEditor from '../components/PayeeImageEditor'
import SearchableSelect from '../components/SearchableSelect'
import Modal from '../components/Modal'
import { findKnownLogo } from '../lib/knownLogos'

// Modal de confirmation de suppression avec gestion des transactions
function DeletePayeeModal({ payee, payees, transactionCount, onClose, onConfirm, onCreatePayee }) {
  const [reassignTo, setReassignTo] = useState(null)
  const [action, setAction] = useState('none') // 'none' = dissocier, 'reassign' = réassigner

  const otherPayees = payees?.filter(p => p.id !== payee.id).sort((a, b) => a.name.localeCompare(b.name, 'fr')) || []

  const handleConfirm = () => {
    const toPayeeId = action === 'reassign' ? reassignTo : null
    onConfirm(toPayeeId)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center gap-3 p-4 border-b bg-amber-50">
          <div className="p-2 rounded-full bg-amber-100">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Supprimer "{payee.name}"</h2>
            <p className="text-sm text-amber-700">
              {transactionCount} transaction{transactionCount > 1 ? 's' : ''} associée{transactionCount > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Ce tiers est associé à des transactions. Que souhaitez-vous faire ?
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="action"
                value="none"
                checked={action === 'none'}
                onChange={() => setAction('none')}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-gray-900">Dissocier les transactions</p>
                <p className="text-sm text-gray-500">Les transactions n'auront plus de tiers associé</p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="action"
                value="reassign"
                checked={action === 'reassign'}
                onChange={() => setAction('reassign')}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-900">Réassigner à un autre tiers</p>
                <p className="text-sm text-gray-500 mb-2">Les transactions seront transférées</p>
                {action === 'reassign' && (
                  <SearchableSelect
                    value={reassignTo}
                    onChange={setReassignTo}
                    options={otherPayees}
                    placeholder="Tapez pour rechercher ou créer..."
                    emptyMessage="Aucun tiers trouvé"
                    allowCreate={!!onCreatePayee}
                    createLabel="Créer le tiers"
                    onCreate={onCreatePayee}
                    renderOption={(p) => (
                      <span className="flex items-center gap-2">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                        {p.name}
                      </span>
                    )}
                  />
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-3 p-4 border-t">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Annuler
          </button>
          <button 
            onClick={handleConfirm} 
            className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
            disabled={action === 'reassign' && !reassignTo}
          >
            Supprimer
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PayeeModal({ payee, onClose, onSave }) {
  const [formData, setFormData] = useState(payee || {
    name: '',
    imageUrl: null,
    notes: '',
  })
  const [autoLogoApplied, setAutoLogoApplied] = useState(false)

  // Détection automatique du logo au montage (pour les tiers existants sans image)
  useEffect(() => {
    if (payee && !payee.imageUrl && formData.name) {
      const knownLogo = findKnownLogo(formData.name)
      if (knownLogo) {
        setFormData(prev => ({ ...prev, imageUrl: knownLogo }))
        setAutoLogoApplied(true)
      }
    }
  }, []) // Seulement au montage

  // Détection automatique du logo quand le nom change
  useEffect(() => {
    // Ne pas écraser une image déjà définie manuellement ou existante
    if (payee?.imageUrl || autoLogoApplied) return
    
    const knownLogo = findKnownLogo(formData.name)
    if (knownLogo && !formData.imageUrl) {
      setFormData(prev => ({ ...prev, imageUrl: knownLogo }))
      setAutoLogoApplied(true)
    }
  }, [formData.name])

  const handleNameChange = (e) => {
    const newName = e.target.value
    setFormData({ ...formData, name: newName })
    
    // Reset auto-logo si l'utilisateur efface le nom
    if (!newName.trim()) {
      setAutoLogoApplied(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {payee ? 'Modifier le tiers' : 'Nouveau tiers'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image */}
          <div className="flex justify-center">
            <PayeeImageEditor
              imageUrl={formData.imageUrl}
              payeeName={formData.name}
              onImageChange={(url) => setFormData({ ...formData, imageUrl: url })}
              size="xl"
            />
          </div>
          <p className="text-center text-xs text-gray-500">Cliquez pour modifier l'image</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className="input"
              placeholder="Nom du tiers"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optionnel)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder="Notes supplémentaires..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {payee ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function Payees() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPayee, setEditingPayee] = useState(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingPayee, setDeletingPayee] = useState(null)
  const [deleteTransactionCount, setDeleteTransactionCount] = useState(0)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payees', { search }],
    queryFn: () => payeesApi.getAll({ search: search || undefined }).then(r => r.data.data),
  })

  // Récupérer tous les tiers pour la réassignation
  const { data: allPayees } = useQuery({
    queryKey: ['payees-all'],
    queryFn: () => payeesApi.getAll().then(r => r.data.data),
  })

  const createMutation = useMutation({
    mutationFn: (data) => payeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] })
      queryClient.invalidateQueries({ queryKey: ['payees-all'] })
    },
  })

  // Création à la volée d'un tiers (pour le modal de suppression)
  const handleCreatePayee = async (name) => {
    try {
      const imageUrl = findKnownLogo(name)
      const result = await createMutation.mutateAsync({ name, imageUrl })
      return result.data.data
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
      return null
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => payeesApi.update(id, data),
  })

  const reassignMutation = useMutation({
    mutationFn: ({ id, toPayeeId }) => payeesApi.reassignTransactions(id, toPayeeId),
  })

  const deleteMutation = useMutation({
    mutationFn: payeesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payees'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
  })

  const handleSave = async (formData) => {
    const cleanData = {
      name: formData.name.trim(),
      imageUrl: formData.imageUrl || null,
      notes: formData.notes?.trim() || null,
    }
    
    try {
      if (editingPayee) {
        await updateMutation.mutateAsync({ id: editingPayee.id, data: cleanData })
      } else {
        await createMutation.mutateAsync(cleanData)
      }
      queryClient.invalidateQueries({ queryKey: ['payees'] })
      setModalOpen(false)
      setEditingPayee(null)
    } catch (err) {
      console.error('Save error:', err)
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    }
  }

  const handleEdit = (payee) => {
    setEditingPayee(payee)
    setModalOpen(true)
  }

  const handleDelete = async (payee) => {
    try {
      // Vérifier le nombre de transactions associées
      const response = await payeesApi.getTransactionCount(payee.id)
      const count = response.data.data.count

      if (count === 0) {
        // Pas de transactions, confirmation simple
        if (confirm(`Supprimer le tiers "${payee.name}" ?`)) {
          deleteMutation.mutate(payee.id)
        }
      } else {
        // Des transactions existent, ouvrir le modal de choix
        setDeletingPayee(payee)
        setDeleteTransactionCount(count)
        setDeleteModalOpen(true)
      }
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    }
  }

  const handleConfirmDelete = async (toPayeeId) => {
    try {
      // Réassigner ou dissocier les transactions
      await reassignMutation.mutateAsync({ id: deletingPayee.id, toPayeeId })
      // Puis supprimer le tiers
      await deleteMutation.mutateAsync(deletingPayee.id)
      setDeleteModalOpen(false)
      setDeletingPayee(null)
    } catch (err) {
      alert('Erreur: ' + (err.response?.data?.error?.message || err.message))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiers</h1>
          <p className="text-gray-600">Gérez vos fournisseurs, bénéficiaires et contacts</p>
        </div>
        <button 
          onClick={() => { setEditingPayee(null); setModalOpen(true); }} 
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nouveau tiers
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher un tiers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>
      </div>

      {/* List */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : data?.length > 0 ? (
          <div className="divide-y">
            {data.map((payee) => (
              <div 
                key={payee.id} 
                className="flex items-center gap-4 p-4 hover:bg-gray-50 group"
              >
                {payee.imageUrl ? (
                  <img 
                    src={payee.imageUrl} 
                    alt={payee.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{payee.name}</p>
                  {payee.notes && (
                    <p className="text-sm text-gray-500 truncate">{payee.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(payee)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(payee)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun tiers trouvé</p>
            <p className="text-sm mt-1">Créez votre premier tiers pour commencer</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <PayeeModal
          payee={editingPayee}
          onClose={() => { setModalOpen(false); setEditingPayee(null); }}
          onSave={handleSave}
        />
      )}

      {deleteModalOpen && deletingPayee && (
        <DeletePayeeModal
          payee={deletingPayee}
          payees={allPayees}
          transactionCount={deleteTransactionCount}
          onClose={() => { setDeleteModalOpen(false); setDeletingPayee(null); }}
          onConfirm={handleConfirmDelete}
          onCreatePayee={handleCreatePayee}
        />
      )}
    </div>
  )
}
