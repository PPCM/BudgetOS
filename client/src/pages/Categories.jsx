import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi } from '../lib/api'
import { translateError } from '../lib/errorHelper'
import * as LucideIcons from 'lucide-react'
import {
  Tag, TrendingUp, TrendingDown, ArrowLeftRight, Plus,
  Pencil, Trash2, X, Download, Upload, Check
} from 'lucide-react'
import Modal from '../components/Modal'

// Available icons for categories
const availableIcons = [
  'Tag', 'Briefcase', 'Gift', 'ArrowLeft', 'PlusCircle', 'Home', 'Zap', 'Droplet',
  'Wifi', 'Phone', 'Fuel', 'Train', 'Car', 'Bus', 'Plane', 'Ship',
  'ShoppingCart', 'ShoppingBag', 'Utensils', 'Coffee', 'Pizza', 'Apple',
  'Heart', 'Activity', 'Pill', 'Stethoscope', 'Music', 'Tv', 'Gamepad2',
  'Shirt', 'Scissors', 'Book', 'GraduationCap', 'FileText', 'Landmark', 'Building2',
  'Wallet', 'CreditCard', 'Banknote', 'PiggyBank', 'TrendingUp', 'TrendingDown',
  'ArrowRightLeft', 'MoreHorizontal', 'Star', 'Award', 'Target', 'Flag',
  'Calendar', 'Clock', 'Bell', 'Mail', 'MessageSquare', 'Users', 'User',
  'Settings', 'Tool', 'Wrench', 'Hammer', 'Paintbrush', 'Camera', 'Image',
  'Sun', 'Moon', 'Cloud', 'Umbrella', 'Snowflake', 'Flame', 'Leaf',
]

// Get icon component by name
const getIconComponent = (iconName) => {
  const IconComponent = LucideIcons[iconName]
  return IconComponent || Tag
}

const defaultColors = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#6B7280', '#64748B',
]

/**
 * Build type configuration with translated labels
 * @param {Function} t - Translation function
 * @returns {Object} Type configuration with labels, icons, and colors
 */
function getTypeConfig(t) {
  return {
    income: { label: t('categories.types.income'), icon: TrendingUp, color: 'green', bg: 'bg-green-100', text: 'text-green-600' },
    expense: { label: t('categories.types.expense'), icon: TrendingDown, color: 'red', bg: 'bg-red-100', text: 'text-red-600' },
    transfer: { label: t('categories.types.transfer'), icon: ArrowLeftRight, color: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' },
  }
}

function CategoryModal({ category, onClose, onSave }) {
  const { t } = useTranslation()
  const typeConfig = getTypeConfig(t)

  const [formData, setFormData] = useState(category || {
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: 'tag',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {category ? t('categories.editCategory') : t('categories.newCategoryTitle')}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder={t('categories.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.type')}</label>
            <div className="flex gap-2">
              {Object.entries(typeConfig).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                    formData.type === type
                      ? `border-${config.color}-500 ${config.bg}`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <config.icon className={`w-5 h-5 ${formData.type === type ? config.text : 'text-gray-400'}`} />
                  <span className="text-xs">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.color')}</label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                    formData.color === color ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {formData.color === color && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.icon')}</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
              {availableIcons.map((iconName) => {
                const IconComp = getIconComponent(iconName)
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: iconName.toLowerCase() })}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      formData.icon === iconName.toLowerCase()
                        ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-500'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    title={iconName}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {category ? t('common.edit') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

export default function Categories() {
  const { t } = useTranslation()
  const typeConfig = getTypeConfig(t)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const fileInputRef = useRef()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll({ flat: 'true' }).then(r => r.data.data.categories),
  })

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
      setModalOpen(false)
      setEditingCategory(null)
    },
    onError: (err) => alert(translateError(err)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories'])
      setModalOpen(false)
      setEditingCategory(null)
    },
    onError: (err) => alert(translateError(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['categories']),
    onError: (err) => alert(translateError(err)),
  })

  const handleSave = (formData) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (category) => {
    setEditingCategory(category)
    setModalOpen(true)
  }

  const handleDelete = (category) => {
    if (confirm(t('categories.confirmDelete', { name: category.name }))) {
      deleteMutation.mutate(category.id)
    }
  }

  const handleExport = () => {
    const exportData = data?.map(({ id, userId, createdAt, updatedAt, ...rest }) => rest) || []
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `categories-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const categories = JSON.parse(event.target.result)
        if (!Array.isArray(categories)) {
          throw new Error(t('categories.invalidFormat'))
        }

        let created = 0, updated = 0
        for (const cat of categories) {
          // Check if a category with the same name exists
          const existing = data?.find(c => c.name === cat.name && c.type === cat.type)

          try {
            if (existing) {
              // Update existing category
              await updateMutation.mutateAsync({ id: existing.id, data: cat })
              updated++
            } else {
              // Create new category
              await createMutation.mutateAsync(cat)
              created++
            }
          } catch (err) {
            console.warn('Import error:', cat.name, err)
          }
        }
        alert(t('categories.importDone', { created, updated }))
        queryClient.invalidateQueries(['categories'])
      } catch (err) {
        alert(t('categories.importError') + ': ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  if (isLoading) {
    return <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  }

  const sortByName = (a, b) => a.name.localeCompare(b.name, 'fr')

  const groupedCategories = {
    income: data?.filter(c => c.type === 'income').sort(sortByName) || [],
    expense: data?.filter(c => c.type === 'expense').sort(sortByName) || [],
    transfer: data?.filter(c => c.type === 'transfer').sort(sortByName) || [],
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('categories.title')}</h1>
          <p className="text-gray-600">{t('categories.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {t('common.import')}
          </button>
          <button
            onClick={handleExport}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('common.export')}
          </button>
          <button
            onClick={() => { setEditingCategory(null); setModalOpen(true); }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('categories.newCategory')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(typeConfig).map(([type, config]) => (
          <div key={type} className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${config.bg}`}>
                <config.icon className={`w-5 h-5 ${config.text}`} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{config.label}</h2>
              <span className="ml-auto px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                {groupedCategories[type].length}
              </span>
            </div>

            <div className="space-y-2">
              {groupedCategories[type].map((category) => {
                const IconComp = getIconComponent(category.icon?.charAt(0).toUpperCase() + category.icon?.slice(1) || 'Tag')
                return (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: category.color + '20', color: category.color }}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-gray-900 flex-1">{category.name}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )})}

              {groupedCategories[type].length === 0 && (
                <p className="text-gray-400 text-center py-4">{t('categories.noCategories')}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => { setModalOpen(false); setEditingCategory(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
