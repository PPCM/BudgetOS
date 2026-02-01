import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useMutation } from '@tanstack/react-query'
import { translateError } from '../lib/errorHelper'
import {
  User, Lock, Bell, Palette, Globe,
  Save, CheckCircle, AlertCircle
} from 'lucide-react'
import axios from 'axios'

export default function Settings() {
  const { t } = useTranslation()
  const { user, checkAuth } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const tabs = [
    { id: 'profile', label: t('settings.tabs.profile'), icon: User },
    { id: 'security', label: t('settings.tabs.security'), icon: Lock },
    { id: 'preferences', label: t('settings.tabs.preferences'), icon: Palette },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSuccess(''); setError(''); }}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <ProfileSettings user={user} onSuccess={setSuccess} onError={setError} checkAuth={checkAuth} />
          )}
          {activeTab === 'security' && (
            <SecuritySettings onSuccess={setSuccess} onError={setError} />
          )}
          {activeTab === 'preferences' && (
            <PreferencesSettings user={user} onSuccess={setSuccess} onError={setError} checkAuth={checkAuth} />
          )}
        </div>
      </div>
    </div>
  )
}

function ProfileSettings({ user, onSuccess, onError, checkAuth }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
  })

  const mutation = useMutation({
    mutationFn: async (data) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.put('/api/v1/auth/profile', data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      onSuccess(t('settings.profile.saved'))
      checkAuth()
    },
    onError: (err) => onError(translateError(err)),
  })

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-6">{t('settings.profile.title')}</h2>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(formData); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.profile.email')}</label>
          <input type="email" value={user?.email || ''} disabled className="input bg-gray-50" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.profile.firstName')}</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.profile.lastName')}</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="input"
            />
          </div>
        </div>
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
      </form>
    </div>
  )
}

function SecuritySettings({ onSuccess, onError }) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const mutation = useMutation({
    mutationFn: async (data) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.put('/api/v1/auth/password', data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      onSuccess(t('settings.security.saved'))
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (err) => onError(translateError(err)),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      onError(t('settings.security.passwordMismatch'))
      return
    }
    mutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    })
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-6">{t('settings.security.title')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.security.currentPassword')}</label>
          <input
            type="password"
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.security.newPassword')}</label>
          <input
            type="password"
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            className="input"
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.security.confirmPassword')}</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="input"
            required
          />
        </div>
        <button type="submit" disabled={mutation.isPending} className="btn btn-primary flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {t('settings.security.submit')}
        </button>
      </form>
    </div>
  )
}

function PreferencesSettings({ user, onSuccess, onError, checkAuth }) {
  const { t } = useTranslation()
  const { userSettings, updateSettings } = useAuth()
  const [formData, setFormData] = useState({
    locale: user?.locale || 'fr',
    currency: user?.currency || 'EUR',
  })
  const [settingsData, setSettingsData] = useState({
    weekStartDay: userSettings?.weekStartDay ?? 1,
  })

  const profileMutation = useMutation({
    mutationFn: async (data) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.put('/api/v1/auth/profile', data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      checkAuth()
    },
    onError: (err) => onError(translateError(err)),
  })

  const settingsMutation = useMutation({
    mutationFn: async (data) => updateSettings(data),
    onError: (err) => onError(translateError(err)),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await profileMutation.mutateAsync(formData)
      await settingsMutation.mutateAsync(settingsData)
      onSuccess(t('settings.preferences.saved'))
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-6">{t('settings.preferences.title')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.preferences.language')}</label>
          <select
            value={formData.locale}
            onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
            className="input"
          >
            <option value="fr">{t('settings.preferences.languages.fr')}</option>
            <option value="en">{t('settings.preferences.languages.en')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.preferences.currency')}</label>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="input"
          >
            <option value="EUR">{t('settings.preferences.currencies.EUR')}</option>
            <option value="USD">{t('settings.preferences.currencies.USD')}</option>
            <option value="GBP">{t('settings.preferences.currencies.GBP')}</option>
            <option value="CHF">{t('settings.preferences.currencies.CHF')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.preferences.weekStartDay')}</label>
          <select
            value={settingsData.weekStartDay}
            onChange={(e) => setSettingsData({ ...settingsData, weekStartDay: parseInt(e.target.value) })}
            className="input"
          >
            <option value={1}>{t('settings.preferences.weekDays.monday')}</option>
            <option value={0}>{t('settings.preferences.weekDays.sunday')}</option>
            <option value={6}>{t('settings.preferences.weekDays.saturday')}</option>
          </select>
        </div>
        <button type="submit" disabled={profileMutation.isPending || settingsMutation.isPending} className="btn btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
      </form>
    </div>
  )
}
