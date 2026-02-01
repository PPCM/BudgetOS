import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../lib/api'
import {
  Plus, Wand2, Trash2, X, CheckCircle,
  ToggleLeft, ToggleRight, GripVertical
} from 'lucide-react'
import axios from 'axios'
import Modal from '../components/Modal'

function RuleModal({ rule, categories, onClose, onSave }) {
  const { t } = useTranslation()

  const operators = [
    { value: 'contains', label: t('rules.operators.contains') },
    { value: 'not_contains', label: t('rules.operators.not_contains') },
    { value: 'equals', label: t('rules.operators.equals') },
    { value: 'not_equals', label: t('rules.operators.not_equals') },
    { value: 'starts_with', label: t('rules.operators.starts_with') },
    { value: 'ends_with', label: t('rules.operators.ends_with') },
    { value: 'greater_than', label: t('rules.operators.greater_than') },
    { value: 'less_than', label: t('rules.operators.less_than') },
  ]

  const fields = [
    { value: 'description', label: t('rules.fields.description') },
    { value: 'amount', label: t('rules.fields.amount') },
  ]

  const [formData, setFormData] = useState(rule || {
    name: '',
    priority: 0,
    isActive: true,
    conditions: [{ field: 'description', operator: 'contains', value: '' }],
    conditionLogic: 'and',
    actionCategoryId: '',
  })

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [...formData.conditions, { field: 'description', operator: 'contains', value: '' }],
    })
  }

  const removeCondition = (index) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    })
  }

  const updateCondition = (index, updates) => {
    const newConditions = [...formData.conditions]
    newConditions[index] = { ...newConditions[index], ...updates }
    setFormData({ ...formData, conditions: newConditions })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {rule ? t('rules.editRule') : t('rules.newRule')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('rules.ruleName')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder={t('rules.ruleNamePlaceholder')}
              required
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">{t('rules.conditions')}</label>
              <select
                value={formData.conditionLogic}
                onChange={(e) => setFormData({ ...formData, conditionLogic: e.target.value })}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="and">{t('rules.conditionLogic.and')}</option>
                <option value="or">{t('rules.conditionLogic.or')}</option>
              </select>
            </div>
            <div className="space-y-3">
              {formData.conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <select
                    value={cond.field}
                    onChange={(e) => updateCondition(i, { field: e.target.value })}
                    className="input py-1.5"
                  >
                    {fields.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <select
                    value={cond.operator}
                    onChange={(e) => updateCondition(i, { operator: e.target.value })}
                    className="input py-1.5"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <input
                    type={cond.field === 'amount' ? 'number' : 'text'}
                    value={cond.value}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    className="input py-1.5 flex-1"
                    placeholder={t('rules.valuePlaceholder')}
                    required
                  />
                  {formData.conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCondition(i)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addCondition}
              className="mt-2 text-sm text-primary-600 hover:underline"
            >
              {t('rules.addCondition')}
            </button>
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t('rules.assignCategory')}</label>
            <select
              value={formData.actionCategoryId || ''}
              onChange={(e) => setFormData({ ...formData, actionCategoryId: e.target.value })}
              className="input"
              required
            >
              <option value="">{t('rules.selectCategory')}</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              {t('rules.activeRule')}
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {rule ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function Rules() {
  const { t } = useTranslation()
  const [modalOpen, setModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const { data } = await axios.get('/api/v1/rules', { withCredentials: true })
      return data.data.rules
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories', { flat: true }],
    queryFn: () => categoriesApi.getAll({ flat: 'true' }).then(r => r.data.data.categories),
  })

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.post('/api/v1/rules', data, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rules'])
      setModalOpen(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.put(`/api/v1/rules/${id}`, { isActive }, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => queryClient.invalidateQueries(['rules']),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const csrfRes = await axios.get('/api/v1/csrf-token', { withCredentials: true })
      return axios.delete(`/api/v1/rules/${id}`, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfRes.data.csrfToken },
      })
    },
    onSuccess: () => queryClient.invalidateQueries(['rules']),
  })

  if (isLoading) {
    return <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('rules.title')}</h1>
          <p className="text-gray-600">{t('rules.subtitle')}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {t('rules.newRule')}
        </button>
      </div>

      <div className="card">
        {data?.length > 0 ? (
          <div className="space-y-3">
            {data.map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 p-4 border rounded-xl hover:shadow-sm transition-shadow">
                <div className={`p-3 rounded-xl ${rule.isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
                  <Wand2 className={`w-5 h-5 ${rule.isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{rule.name}</p>
                  <p className="text-sm text-gray-500">
                    {t('rules.conditionCount', { count: rule.conditions?.length || 0 })}
                    {rule.actionCategoryId && ` → ${categories?.find(c => c.id === rule.actionCategoryId)?.name || t('transactions.category')}`}
                  </p>
                </div>
                <button
                  onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  {rule.isActive ? (
                    <ToggleRight className="w-6 h-6 text-primary-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => deleteMutation.mutate(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Wand2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">{t('rules.noRules')}</p>
            <p className="text-sm text-gray-400">
              {t('rules.noRulesDesc')}
            </p>
          </div>
        )}
      </div>

      {modalOpen && (
        <RuleModal
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSave={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  )
}
