import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payeesApi } from '../lib/api'
import { translateError } from '../lib/errorHelper'
import { Plus, Search, Pencil, Trash2, X, User, Users, AlertTriangle } from 'lucide-react'
import PayeeImageEditor from '../components/PayeeImageEditor'
import SearchableSelect from '../components/SearchableSelect'
import Modal from '../components/Modal'
import { findKnownLogo } from '../lib/knownLogos'

// Delete confirmation modal with transaction handling
function DeletePayeeModal({ payee, payees, transactionCount, onClose, onConfirm, onCreatePayee }) {
  const { t } = useTranslation()
  const [reassignTo, setReassignTo] = useState(null)
  const [action, setAction] = useState('none') // 'none' = dissociate, 'reassign' = reassign

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
            <h2 className="text-lg font-semibold text-gray-900">{t('payees.delete.title', { name: payee.name })}</h2>
            <p className="text-sm text-amber-700">
              {t('payees.delete.transactionCount', { count: transactionCount })}
            </p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            {t('payees.delete.question')}
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
                <p className="font-medium text-gray-900">{t('payees.delete.dissociate')}</p>
                <p className="text-sm text-gray-500">{t('payees.delete.dissociateDesc')}</p>
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
                <p className="font-medium text-gray-900">{t('payees.delete.reassign')}</p>
                <p className="text-sm text-gray-500 mb-2">{t('payees.delete.reassignDesc')}</p>
                {action === 'reassign' && (
                  <SearchableSelect
                    value={reassignTo}
                    onChange={setReassignTo}
                    options={otherPayees}
                    placeholder={t('payees.delete.searchPayee')}
                    emptyMessage={t('payees.delete.noPayeeFound')}
                    allowCreate={!!onCreatePayee}
                    createLabel={t('payees.delete.createPayee')}
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
            {t('common.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
            disabled={action === 'reassign' && !reassignTo}
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PayeeModal({ payee, onClose, onSave }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState(payee || {
    name: '',
    imageUrl: null,
    notes: '',
  })
  const [autoLogoApplied, setAutoLogoApplied] = useState(false)

  // Auto-detect logo on mount (for existing payees without image)
  useEffect(() => {
    if (payee && !payee.imageUrl && formData.name) {
      const knownLogo = findKnownLogo(formData.name)
      if (knownLogo) {
        setFormData(prev => ({ ...prev, imageUrl: knownLogo }))
        setAutoLogoApplied(true)
      }
    }
  }, []) // Only on mount

  // Auto-detect logo when name changes
  useEffect(() => {
    // Don't overwrite a manually set or existing image
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

    // Reset auto-logo if user clears the name
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
            {payee ? t('payees.editPayee') : t('payees.newPayee')}
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
          <p className="text-center text-xs text-gray-500">{t('payees.clickToEditImage')}</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              className="input"
              placeholder={t('payees.payeeName')}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('payees.notesOptional')}</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder={t('payees.notesPlaceholder')}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {payee ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function Payees() {
  const { t } = useTranslation()
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

  // Fetch all payees for reassignment
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

  // On-the-fly payee creation (for delete modal)
  const handleCreatePayee = async (name) => {
    try {
      const imageUrl = findKnownLogo(name)
      const result = await createMutation.mutateAsync({ name, imageUrl })
      return result.data.data
    } catch (err) {
      alert(translateError(err))
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
      alert(translateError(err))
    }
  }

  const handleEdit = (payee) => {
    setEditingPayee(payee)
    setModalOpen(true)
  }

  const handleDelete = async (payee) => {
    try {
      // Check associated transaction count
      const response = await payeesApi.getTransactionCount(payee.id)
      const count = response.data.data.count

      if (count === 0) {
        // No transactions, simple confirmation
        if (confirm(t('payees.confirmDelete', { name: payee.name }))) {
          deleteMutation.mutate(payee.id)
        }
      } else {
        // Transactions exist, open choice modal
        setDeletingPayee(payee)
        setDeleteTransactionCount(count)
        setDeleteModalOpen(true)
      }
    } catch (err) {
      alert(translateError(err))
    }
  }

  const handleConfirmDelete = async (toPayeeId) => {
    try {
      // Reassign or dissociate transactions
      await reassignMutation.mutateAsync({ id: deletingPayee.id, toPayeeId })
      // Then delete the payee
      await deleteMutation.mutateAsync(deletingPayee.id)
      setDeleteModalOpen(false)
      setDeletingPayee(null)
    } catch (err) {
      alert(translateError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('payees.title')}</h1>
          <p className="text-gray-600">{t('payees.subtitle')}</p>
        </div>
        <button
          onClick={() => { setEditingPayee(null); setModalOpen(true); }}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('payees.newPayee')}
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t('payees.searchPlaceholder')}
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
            <p>{t('payees.noPayees')}</p>
            <p className="text-sm mt-1">{t('payees.createFirst')}</p>
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
