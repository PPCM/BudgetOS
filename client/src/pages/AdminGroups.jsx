/**
 * @fileoverview Admin groups management page
 * Provides group listing, creation, editing, deletion, and member management
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupsApi, adminApi } from '../lib/api'
import {
  Plus, X, Trash2, Pencil, Users, UserPlus, UserMinus,
  ChevronDown, ChevronUp, FolderTree
} from 'lucide-react'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'

/**
 * Modal form for creating or editing a group
 * @param {Object} props
 * @param {Object|null} props.group - Existing group for editing, null for creation
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onSave - Save callback with form data
 */
function GroupModal({ group, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
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
            {group ? 'Modifier le groupe' : 'Nouveau groupe'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              {group ? 'Modifier' : 'Creer'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

/**
 * Modal for adding a member to a group
 * @param {Object} props
 * @param {string} props.groupId - Group UUID
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onSave - Save callback with { userId, role }
 * @param {Array} props.users - Available users list
 * @param {Array} props.existingMemberIds - IDs of existing members to exclude
 */
function AddMemberModal({ onClose, onSave, users, existingMemberIds }) {
  const [formData, setFormData] = useState({
    userId: '',
    role: 'member',
  })

  const availableUsers = users.filter((u) => !existingMemberIds.includes(u.id))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.userId) return
    onSave(formData)
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Ajouter un membre</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="input"
              required
            >
              <option value="">Selectionner un utilisateur</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName || u.lastName
                    ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                    : u.email}
                  {' '}({u.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role dans le groupe</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input"
            >
              <option value="member">Membre</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Ajouter
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

/**
 * Expandable group card with member management
 * @param {Object} props
 * @param {Object} props.group - Group object
 * @param {Function} props.onEdit - Edit callback
 * @param {Function} props.onDelete - Delete callback
 * @param {Array} props.users - Available users for adding members
 */
function GroupCard({ group, onEdit, onDelete, users }) {
  const [expanded, setExpanded] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', group.id],
    queryFn: () => groupsApi.getMembers(group.id).then(r => r.data),
    enabled: expanded,
  })

  const addMemberMutation = useMutation({
    mutationFn: (data) => groupsApi.addMember(group.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] })
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setAddMemberOpen(false)
      toast.success('Membre ajoute')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, role }) => groupsApi.updateMember(group.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] })
      toast.success('Role du membre mis a jour')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => groupsApi.removeMember(group.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members', group.id] })
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      toast.success('Membre retire')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const members = membersData?.data || []
  const memberCount = group.memberCount ?? members.length

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <FolderTree className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            {group.description && (
              <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />
                {memberCount} membre{memberCount !== 1 ? 's' : ''}
              </span>
              {group.status && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {group.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(group)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Modifier"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Supprimer le groupe "${group.name}" ?`)) {
                onDelete(group.id)
              }
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expand/collapse members */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mt-3 text-sm text-primary-600 hover:text-primary-700"
      >
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {expanded ? 'Masquer les membres' : 'Voir les membres'}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Membres</h4>
            <button
              onClick={() => setAddMemberOpen(true)}
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
            >
              <UserPlus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {membersLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Aucun membre</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.userId || member.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-medium">
                        {member.firstName?.[0] || member.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.firstName || member.lastName
                          ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                          : member.email}
                      </p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={member.role || 'member'}
                      onChange={(e) => updateMemberMutation.mutate({ userId: member.userId || member.id, role: e.target.value })}
                      className="text-xs border rounded px-2 py-1 text-gray-600"
                    >
                      <option value="member">Membre</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => {
                        if (confirm(`Retirer ce membre du groupe ?`)) {
                          removeMemberMutation.mutate(member.userId || member.id)
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                      title="Retirer"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {addMemberOpen && (
            <AddMemberModal
              onClose={() => setAddMemberOpen(false)}
              onSave={(data) => addMemberMutation.mutate(data)}
              users={users || []}
              existingMemberIds={members.map((m) => m.userId || m.id)}
            />
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Admin groups management page
 * Lists all groups with creation, editing, deletion, and member management
 */
export default function AdminGroups() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: () => groupsApi.getAll().then(r => r.data),
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => adminApi.getUsers().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: groupsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setModalOpen(false)
      toast.success('Groupe cree avec succes')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      setEditingGroup(null)
      toast.success('Groupe mis a jour')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: groupsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      toast.success('Groupe supprime')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message)
    },
  })

  const handleSave = (formData) => {
    if (editingGroup) {
      updateMutation.mutate({ id: editingGroup.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const groups = data?.data || []

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groupes</h1>
          <p className="text-gray-600">Gerez les groupes et leurs membres</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nouveau groupe
        </button>
      </div>

      {/* Groups grid */}
      {groups.length === 0 ? (
        <div className="card text-center py-12">
          <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun groupe</p>
          <p className="text-sm text-gray-400 mt-1">Creez un groupe pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={(g) => setEditingGroup(g)}
              onDelete={(id) => deleteMutation.mutate(id)}
              users={usersData?.data || []}
            />
          ))}
        </div>
      )}

      {/* Create/edit group modal */}
      {(modalOpen || editingGroup) && (
        <GroupModal
          group={editingGroup}
          onClose={() => { setModalOpen(false); setEditingGroup(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
