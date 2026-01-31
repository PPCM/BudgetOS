/**
 * @fileoverview Unit tests for AdminGroups page component
 * Tests rendering, group CRUD, member panel, and member management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminGroups from '../../src/pages/AdminGroups'

// Mock the API module
vi.mock('../../src/lib/api', () => ({
  groupsApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getMembers: vi.fn(),
    addMember: vi.fn(),
    updateMember: vi.fn(),
    removeMember: vi.fn(),
  },
  adminApi: {
    getUsers: vi.fn(),
  },
}))

// Mock the Toast component
const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
vi.mock('../../src/components/Toast', () => ({
  useToast: () => mockToast,
}))

import { groupsApi, adminApi } from '../../src/lib/api'

const mockGroups = [
  {
    id: 'g1',
    name: 'Famille',
    description: 'Groupe familial',
    status: 'active',
    memberCount: 3,
  },
  {
    id: 'g2',
    name: 'Travail',
    description: 'Collegues',
    status: 'active',
    memberCount: 5,
  },
  {
    id: 'g3',
    name: 'Archive',
    description: 'Ancien groupe',
    status: 'inactive',
    memberCount: 0,
  },
]

const mockMembers = [
  { userId: 'u1', email: 'alice@test.com', firstName: 'Alice', lastName: 'Martin', role: 'admin' },
  { userId: 'u2', email: 'bob@test.com', firstName: 'Bob', lastName: 'Dupont', role: 'member' },
]

const mockUsers = [
  { id: 'u1', email: 'alice@test.com', firstName: 'Alice', lastName: 'Martin' },
  { id: 'u2', email: 'bob@test.com', firstName: 'Bob', lastName: 'Dupont' },
  { id: 'u3', email: 'carol@test.com', firstName: 'Carol', lastName: 'Leroy' },
]

/**
 * Creates a fresh QueryClient for test isolation
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

/**
 * Renders a component wrapped with QueryClientProvider
 */
function renderWithProviders(ui) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

/**
 * Helper: wait for groups to be rendered (data loaded)
 */
async function waitForGroupsLoaded() {
  await waitFor(() => {
    expect(screen.getByText('Famille')).toBeInTheDocument()
  })
}

describe('AdminGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    groupsApi.getAll.mockResolvedValue({ data: { data: mockGroups } })
    groupsApi.getMembers.mockResolvedValue({ data: { data: mockMembers } })
    adminApi.getUsers.mockResolvedValue({ data: { data: mockUsers } })
  })

  describe('rendering', () => {
    it('renders page title and description after loading', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      expect(screen.getByText('Groupes')).toBeInTheDocument()
      expect(screen.getByText('Gerez les groupes et leurs membres')).toBeInTheDocument()
    })

    it('renders the new group button after loading', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      expect(screen.getByText('Nouveau groupe')).toBeInTheDocument()
    })

    it('renders loading spinner initially', () => {
      groupsApi.getAll.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<AdminGroups />)

      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders group cards with names', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      expect(screen.getByText('Travail')).toBeInTheDocument()
      expect(screen.getByText('Archive')).toBeInTheDocument()
    })

    it('renders group descriptions', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      expect(screen.getByText('Groupe familial')).toBeInTheDocument()
      expect(screen.getByText('Collegues')).toBeInTheDocument()
    })

    it('displays member counts', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      expect(screen.getByText('3 membres')).toBeInTheDocument()
      expect(screen.getByText('5 membres')).toBeInTheDocument()
      // 0 uses singular "membre"
      expect(screen.getByText(/0 membre/)).toBeInTheDocument()
    })

    it('displays status badges', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const activeBadges = screen.getAllByText('Actif')
      expect(activeBadges.length).toBe(2)
      expect(screen.getByText('Inactif')).toBeInTheDocument()
    })

    it('shows empty state when no groups', async () => {
      groupsApi.getAll.mockResolvedValue({ data: { data: [] } })
      renderWithProviders(<AdminGroups />)

      await waitFor(() => {
        expect(screen.getByText('Aucun groupe')).toBeInTheDocument()
        expect(screen.getByText('Creez un groupe pour commencer')).toBeInTheDocument()
      })
    })

    it('renders edit and delete buttons for each group', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const editButtons = screen.getAllByTitle('Modifier')
      const deleteButtons = screen.getAllByTitle('Supprimer')
      expect(editButtons.length).toBe(3)
      expect(deleteButtons.length).toBe(3)
    })

    it('renders "Voir les membres" toggle for each group', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const toggleButtons = screen.getAllByText('Voir les membres')
      expect(toggleButtons.length).toBe(3)
    })
  })

  describe('create group modal', () => {
    it('opens modal when clicking new group button', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getByText('Nouveau groupe'))

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument()
      })
    })

    it('closes modal when clicking cancel', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getByText('Nouveau groupe'))

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Annuler'))

      await waitFor(() => {
        expect(screen.queryByText('Description')).not.toBeInTheDocument()
      })
    })

    it('calls create API on form submit', async () => {
      groupsApi.create.mockResolvedValue({ data: { data: { id: 'new' } } })
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getByText('Nouveau groupe'))

      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument()
      })

      // Find inputs in the modal
      const modal = document.querySelector('.fixed.inset-0')
      const nameInput = modal.querySelector('input[type="text"]')
      const descTextarea = modal.querySelector('textarea')

      fireEvent.change(nameInput, { target: { value: 'New Group' } })
      fireEvent.change(descTextarea, { target: { value: 'A new group' } })

      // Submit the form inside the modal
      const form = modal.querySelector('form')
      await act(async () => {
        fireEvent.submit(form)
      })

      // React Query v5 passes extra context arg to mutationFn
      expect(groupsApi.create).toHaveBeenCalled()
      const callArgs = groupsApi.create.mock.calls[0][0]
      expect(callArgs).toMatchObject({
        name: 'New Group',
        description: 'A new group',
      })
    })
  })

  describe('edit group', () => {
    it('opens edit modal when clicking edit button', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const editButtons = screen.getAllByTitle('Modifier')
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Modifier le groupe')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Famille')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Groupe familial')).toBeInTheDocument()
      })
    })

    it('calls update API on edit form submit', async () => {
      groupsApi.update.mockResolvedValue({ data: { data: {} } })
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const editButtons = screen.getAllByTitle('Modifier')
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByDisplayValue('Famille')).toBeInTheDocument()
      })

      const nameInput = screen.getByDisplayValue('Famille')
      fireEvent.change(nameInput, { target: { value: 'Famille Updated' } })

      // Submit the form inside the modal
      const modal = document.querySelector('.fixed.inset-0')
      await act(async () => {
        fireEvent.submit(modal.querySelector('form'))
      })

      // React Query v5: mutationFn receives { id, data } from mutate call
      expect(groupsApi.update).toHaveBeenCalled()
      const updateCallArgs = groupsApi.update.mock.calls[0]
      expect(updateCallArgs[0]).toBe('g1')
      expect(updateCallArgs[1]).toMatchObject({
        name: 'Famille Updated',
        description: 'Groupe familial',
      })
    })
  })

  describe('delete group', () => {
    it('calls delete API when confirming deletion', async () => {
      groupsApi.delete.mockResolvedValue({ data: {} })
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const deleteButtons = screen.getAllByTitle('Supprimer')
      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })

      expect(groupsApi.delete).toHaveBeenCalledWith('g1', expect.anything())

      window.confirm.mockRestore()
    })

    it('does not delete when cancelling confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false)

      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      const deleteButtons = screen.getAllByTitle('Supprimer')
      fireEvent.click(deleteButtons[0])

      expect(groupsApi.delete).not.toHaveBeenCalled()

      window.confirm.mockRestore()
    })
  })

  describe('members panel', () => {
    it('expands to show members when clicking toggle', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('Membres')).toBeInTheDocument()
      })
    })

    it('shows member names after expanding', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('Alice Martin')).toBeInTheDocument()
        expect(screen.getByText('Bob Dupont')).toBeInTheDocument()
      })
    })

    it('shows member emails', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('alice@test.com')).toBeInTheDocument()
        expect(screen.getByText('bob@test.com')).toBeInTheDocument()
      })
    })

    it('collapses members when clicking toggle again', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('Masquer les membres')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Masquer les membres'))

      await waitFor(() => {
        expect(screen.queryByText('Masquer les membres')).not.toBeInTheDocument()
      })
    })

    it('shows empty message when group has no members', async () => {
      groupsApi.getMembers.mockResolvedValue({ data: { data: [] } })
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('Aucun membre')).toBeInTheDocument()
      })
    })

    it('shows remove button for each member', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        const removeButtons = screen.getAllByTitle('Retirer')
        expect(removeButtons.length).toBe(2)
      })
    })

    it('calls removeMember API when confirming removal', async () => {
      groupsApi.removeMember.mockResolvedValue({ data: {} })
      vi.spyOn(window, 'confirm').mockReturnValue(true)

      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getAllByTitle('Retirer').length).toBeGreaterThan(0)
      })

      fireEvent.click(screen.getAllByTitle('Retirer')[0])

      await waitFor(() => {
        expect(groupsApi.removeMember).toHaveBeenCalledWith('g1', 'u1')
      })

      window.confirm.mockRestore()
    })
  })

  describe('add member modal', () => {
    it('opens add member modal from expanded panel', async () => {
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('Ajouter')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ajouter'))

      await waitFor(() => {
        expect(screen.getByText('Ajouter un membre')).toBeInTheDocument()
        expect(screen.getByText('Utilisateur')).toBeInTheDocument()
        expect(screen.getByText('Role dans le groupe')).toBeInTheDocument()
      })
    })

    it('calls addMember API on form submit', async () => {
      groupsApi.addMember.mockResolvedValue({ data: { data: {} } })
      renderWithProviders(<AdminGroups />)
      await waitForGroupsLoaded()

      fireEvent.click(screen.getAllByText('Voir les membres')[0])

      await waitFor(() => {
        expect(screen.getByText('Ajouter')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Ajouter'))

      await waitFor(() => {
        expect(screen.getByText('Ajouter un membre')).toBeInTheDocument()
      })

      // Select a user (Carol is the only one not already a member)
      const userSelect = screen.getByText('Selectionner un utilisateur').closest('select')
      fireEvent.change(userSelect, { target: { value: 'u3' } })

      // Find submit button inside the add member modal
      const modal = document.querySelectorAll('.fixed.inset-0')
      // The add member modal is the last overlay
      const addMemberModal = modal[modal.length - 1]
      const submitBtn = within(addMemberModal).getAllByRole('button').find(b => b.textContent === 'Ajouter')
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(groupsApi.addMember).toHaveBeenCalledWith('g1', {
          userId: 'u3',
          role: 'member',
        })
      })
    })
  })
})
