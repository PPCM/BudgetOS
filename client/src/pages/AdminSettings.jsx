/**
 * @fileoverview Admin system settings page
 * Provides system-level configuration: public registration toggle, default group
 */

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, groupsApi } from '../lib/api'
import { translateError } from '../lib/errorHelper'
import { Cog, Save } from 'lucide-react'
import FormLanguageSelect from '../components/FormLanguageSelect'
import { useToast } from '../components/Toast'

/**
 * Admin system settings page
 * Allows super_admin to configure public registration and default group
 */
export default function AdminSettings() {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    publicRegistration: false,
    defaultGroupId: '',
    defaultLocale: 'fr',
    defaultDecimalSeparator: ',',
    defaultDigitGrouping: ' ',
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
        publicRegistration: settingsData.data.allowPublicRegistration ?? false,
        defaultGroupId: settingsData.data.defaultRegistrationGroupId || '',
        defaultLocale: settingsData.data.defaultLocale || 'fr',
        defaultDecimalSeparator: settingsData.data.defaultDecimalSeparator || ',',
        defaultDigitGrouping: settingsData.data.defaultDigitGrouping || ' ',
      })
      setDirty(false)
    }
  }, [settingsData])

  const updateMutation = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      setDirty(false)
      toast.success(t('admin.settings.saved'))
    },
    onError: (err) => {
      toast.error(translateError(err))
    },
  })

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      allowPublicRegistration: formData.publicRegistration,
      defaultRegistrationGroupId: formData.defaultGroupId || null,
      defaultLocale: formData.defaultLocale,
      defaultDecimalSeparator: formData.defaultDecimalSeparator,
      defaultDigitGrouping: formData.defaultDigitGrouping,
    }
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
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.settings.title')}</h1>
        <p className="text-gray-600">{t('admin.settings.subtitle')}</p>
      </div>

      {/* Settings form */}
      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Cog className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t('admin.settings.generalConfig')}</h2>
            <p className="text-sm text-gray-500">{t('admin.settings.configSubtitle')}</p>
          </div>
        </div>

        {/* Public registration toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">{t('admin.settings.publicRegistration')}</label>
            <p className="text-sm text-gray-500">
              {t('admin.settings.publicRegistrationDesc')}
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
            {t('admin.settings.defaultGroup')}
          </label>
          <p className="text-sm text-gray-500 mb-2">
            {t('admin.settings.defaultGroupDesc')}
          </p>
          <select
            value={formData.defaultGroupId}
            onChange={(e) => handleChange('defaultGroupId', e.target.value)}
            className="input max-w-md"
          >
            <option value="">{t('admin.settings.noDefaultGroup')}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* Default locale */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('admin.settings.defaultLocale')}
          </label>
          <p className="text-sm text-gray-500 mb-2">
            {t('admin.settings.defaultLocaleDesc')}
          </p>
          <FormLanguageSelect
            value={formData.defaultLocale}
            onChange={(locale) => handleChange('defaultLocale', locale)}
            className="max-w-md"
          />
        </div>

        {/* Default decimal separator */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('admin.settings.defaultDecimalSeparator')}
          </label>
          <p className="text-sm text-gray-500 mb-2">
            {t('admin.settings.defaultDecimalSeparatorDesc')}
          </p>
          <select
            value={formData.defaultDecimalSeparator}
            onChange={(e) => handleChange('defaultDecimalSeparator', e.target.value)}
            className="input max-w-md"
          >
            <option value=",">{t('settings.preferences.decimalSeparators.comma')}</option>
            <option value=".">{t('settings.preferences.decimalSeparators.dot')}</option>
          </select>
        </div>

        {/* Default digit grouping */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">
            {t('admin.settings.defaultDigitGrouping')}
          </label>
          <p className="text-sm text-gray-500 mb-2">
            {t('admin.settings.defaultDigitGroupingDesc')}
          </p>
          <select
            value={formData.defaultDigitGrouping}
            onChange={(e) => handleChange('defaultDigitGrouping', e.target.value)}
            className="input max-w-md"
          >
            <option value=" ">{t('settings.preferences.digitGroupings.space')}</option>
            <option value=",">{t('settings.preferences.digitGroupings.comma')}</option>
            <option value=".">{t('settings.preferences.digitGroupings.dot')}</option>
            <option value="">{t('settings.preferences.digitGroupings.none')}</option>
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
            {updateMutation.isPending ? t('admin.settings.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
