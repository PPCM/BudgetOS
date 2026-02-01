/**
 * @fileoverview Unit tests for AdminSettings page component
 * Tests rendering, toggle, default group select, and save functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Prevent i18n side-effect initialization via errorHelper
vi.mock('../../src/lib/errorHelper', () => ({
  translateError: (err) => err?.response?.data?.message || err?.message || 'Error',
}))

import AdminSettings from '../../src/pages/AdminSettings'

// Mock the API module
vi.mock('../../src/lib/api', () => ({
  adminApi: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
  groupsApi: {
    getAll: vi.fn(),
  },
}))

// Mock the Toast component
const mockToast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
vi.mock('../../src/components/Toast', () => ({
  useToast: () => mockToast,
}))

import { adminApi, groupsApi } from '../../src/lib/api'

const mockSettings = {
  allowPublicRegistration: false,
  defaultRegistrationGroupId: '',
  defaultLocale: 'fr',
}

const mockGroups = [
  { id: 'g1', name: 'Default Group' },
  { id: 'g2', name: 'Premium Group' },
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
 * Helper: wait for settings page to fully load
 */
async function waitForSettingsLoaded() {
  await waitFor(() => {
    expect(screen.getByText('admin.settings.publicRegistration')).toBeInTheDocument()
  })
}

/**
 * Helper: find the toggle button for public registration
 */
function getToggleButton() {
  // The toggle is a button[type="button"] inside the same flex container as the label
  const label = screen.getByText('admin.settings.publicRegistration')
  const container = label.closest('.flex.items-center.justify-between')
  return container.querySelector('button[type="button"]')
}

describe('AdminSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    adminApi.getSettings.mockResolvedValue({ data: { data: mockSettings } })
    adminApi.updateSettings.mockResolvedValue({ data: { data: {} } })
    groupsApi.getAll.mockResolvedValue({ data: { data: mockGroups } })
  })

  describe('rendering', () => {
    it('renders page title and description', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      expect(screen.getByText('admin.settings.title')).toBeInTheDocument()
      expect(screen.getByText('admin.settings.subtitle')).toBeInTheDocument()
    })

    it('renders loading spinner initially', () => {
      adminApi.getSettings.mockReturnValue(new Promise(() => {}))
      renderWithProviders(<AdminSettings />)

      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('renders configuration section header', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      expect(screen.getByText('admin.settings.generalConfig')).toBeInTheDocument()
    })

    it('renders public registration toggle', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      expect(screen.getByText('admin.settings.publicRegistrationDesc')).toBeInTheDocument()
    })

    it('renders default group select', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      expect(screen.getByText('admin.settings.defaultGroup')).toBeInTheDocument()
      expect(screen.getByText('admin.settings.defaultGroupDesc')).toBeInTheDocument()
    })

    it('renders save button as disabled when form is not dirty', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      const saveButton = screen.getByText('common.save').closest('button')
      expect(saveButton).toBeDisabled()
    })
  })

  describe('toggle', () => {
    it('reflects initial publicRegistration value as false (gray toggle)', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      const toggleButton = getToggleButton()
      expect(toggleButton).toHaveClass('bg-gray-300')
    })

    it('reflects initial publicRegistration value as true (primary toggle)', async () => {
      adminApi.getSettings.mockResolvedValue({
        data: { data: { allowPublicRegistration: true, defaultRegistrationGroupId: '' } }
      })

      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      await waitFor(() => {
        const toggleButton = getToggleButton()
        expect(toggleButton).toHaveClass('bg-primary-600')
      })
    })

    it('toggles publicRegistration when clicking the toggle button', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      const toggleButton = getToggleButton()

      // Initially off (gray)
      expect(toggleButton).toHaveClass('bg-gray-300')

      fireEvent.click(toggleButton)

      // After click should be on (primary)
      expect(toggleButton).toHaveClass('bg-primary-600')
    })

    it('enables save button after toggling', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      const saveButton = screen.getByText('common.save').closest('button')
      expect(saveButton).toBeDisabled()

      fireEvent.click(getToggleButton())

      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('default group select', () => {
    it('renders group options from API', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      expect(screen.getByText('Default Group')).toBeInTheDocument()
      expect(screen.getByText('Premium Group')).toBeInTheDocument()
    })

    it('renders "no default group" option', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      expect(screen.getByText('admin.settings.noDefaultGroup')).toBeInTheDocument()
    })

    it('reflects initial defaultRegistrationGroupId value', async () => {
      adminApi.getSettings.mockResolvedValue({
        data: { data: { allowPublicRegistration: false, defaultRegistrationGroupId: 'g1' } }
      })

      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      await waitFor(() => {
        const select = screen.getByText('Default Group').closest('select')
        expect(select.value).toBe('g1')
      })
    })

    it('enables save button after changing group', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      const saveButton = screen.getByText('common.save').closest('button')
      expect(saveButton).toBeDisabled()

      const select = screen.getByText('Default Group').closest('select')
      fireEvent.change(select, { target: { value: 'g1' } })

      expect(saveButton).not.toBeDisabled()
    })
  })

  describe('save', () => {
    it('calls updateSettings API when toggling and saving', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      // Toggle public registration on
      fireEvent.click(getToggleButton())

      // Submit the form directly
      await act(async () => {
        fireEvent.submit(document.querySelector('form'))
      })

      // React Query v5 passes extra context arg to mutationFn
      expect(adminApi.updateSettings).toHaveBeenCalled()
      expect(adminApi.updateSettings.mock.calls[0][0]).toMatchObject({
        allowPublicRegistration: true,
        defaultRegistrationGroupId: null,
      })
    })

    it('sends selected group in save payload', async () => {
      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      // Change group to make form dirty
      const select = screen.getByText('Default Group').closest('select')
      fireEvent.change(select, { target: { value: 'g2' } })

      // Submit the form directly
      await act(async () => {
        fireEvent.submit(document.querySelector('form'))
      })

      expect(adminApi.updateSettings).toHaveBeenCalled()
      expect(adminApi.updateSettings.mock.calls[0][0]).toMatchObject({
        allowPublicRegistration: false,
        defaultRegistrationGroupId: 'g2',
      })
    })

    it('sends null for empty defaultRegistrationGroupId', async () => {
      adminApi.getSettings.mockResolvedValue({
        data: { data: { allowPublicRegistration: false, defaultRegistrationGroupId: 'g1' } }
      })

      renderWithProviders(<AdminSettings />)
      await waitForSettingsLoaded()

      await waitFor(() => {
        const select = screen.getByText('Default Group').closest('select')
        expect(select.value).toBe('g1')
      })

      // Change to no group
      const select = screen.getByText('Default Group').closest('select')
      fireEvent.change(select, { target: { value: '' } })

      // Submit the form directly
      await act(async () => {
        fireEvent.submit(document.querySelector('form'))
      })

      expect(adminApi.updateSettings).toHaveBeenCalled()
      expect(adminApi.updateSettings.mock.calls[0][0]).toMatchObject({ defaultRegistrationGroupId: null })
    })
  })
})
