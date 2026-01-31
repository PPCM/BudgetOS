/**
 * @fileoverview Admin system settings page
 * Provides system-level configuration: public registration toggle, default group
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, groupsApi } from '../lib/api'
import { Cog, Save } from 'lucide-react'
import { useToast } from '../components/Toast'

/**
 * Admin system settings page
 * Allows super_admin to configure public registration and default group
 */
export default function AdminSettings() {
  const [formData, setFormData] = useState({
    publicRegistration: false,
    defaultGroupId: '',
  })
  const [dirty, setDirty] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => adminApi.getSettings().then(r => r.data),
  })

  const { data: groupsData } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => groupsApi.getAll().then(r => r.data),
  })

  // Sync form data with server data
  useEffect(() => {
    if (settingsData?.data) {
      setFormData({
        publicRegistration: settingsData.data.publicRegistration ?? false,
        defaultGroupId: settingsData.data.defaultGroupId || '',
      })
      setDirty(false)
    }
  }, [settingsData])

  const updateMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setDirty(false)
      toast.success('Parametres mis a jour')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...formData }
    if (!data.defaultGroupId) data.defaultGroupId = null
    updateMutation.mutate(data)
  }

  const groups = groupsData?.data || []

  if (settingsLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Parametres systeme</h1>
        <p className="text-gray-600">Configurez les parametres globaux de l'application</p>
      </div>

      {/* Settings form */}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Cog className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Configuration generale</h2>
            <p className="text-sm text-gray-500">Parametres d'inscription et groupes par defaut</p>
          </div>
        </div>

        {/* Public registration toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Inscription publique</label>
            <p className="text-sm text-gray-500">
              Permettre aux utilisateurs de creer un compte sans invitation
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange('publicRegistration', !formData.publicRegistration)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              formData.publicRegistration ? 'bg-primary-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                formData.publicRegistration ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Default group */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            Groupe par defaut
          </label>
          <p className="text-sm text-gray-500 mb-2">
            Groupe auquel les nouveaux utilisateurs seront automatiquement ajoutes
          </p>
          <select
            value={formData.defaultGroupId}
            onChange={(e) => handleChange('defaultGroupId', e.target.value)}
            className="input max-w-md"
          >
            <option value="">Aucun groupe par defaut</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t">
          <button
            type="submit"
            disabled={!dirty || updateMutation.isPending}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
