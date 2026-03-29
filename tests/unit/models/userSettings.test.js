import { describe, it, expect } from 'vitest'
import User from '../../../src/models/User.js'

describe('User.formatSettings - UI preferences', () => {
  it('should format modalPersistent as boolean true', () => {
    const raw = {
      date_format: 'dd/MM/yyyy', number_format: 'fr-FR', week_start_day: 1,
      dashboard_layout: null, default_account_id: null,
      email_notifications: 1, notify_low_balance: 0, low_balance_threshold: 100,
      notify_upcoming_bills: 1, bills_reminder_days: 3,
      default_import_config: null, theme: 'system',
      modal_persistent: 1, projection_expanded: 0,
    }
    const formatted = User.formatSettings(raw)
    expect(formatted.modalPersistent).toBe(true)
    expect(formatted.projectionExpanded).toBe(false)
  })

  it('should format projectionExpanded as boolean true', () => {
    const raw = {
      date_format: 'dd/MM/yyyy', number_format: 'fr-FR', week_start_day: 1,
      dashboard_layout: null, default_account_id: null,
      email_notifications: 1, notify_low_balance: 0, low_balance_threshold: 100,
      notify_upcoming_bills: 1, bills_reminder_days: 3,
      default_import_config: null, theme: 'system',
      modal_persistent: 0, projection_expanded: 1,
    }
    const formatted = User.formatSettings(raw)
    expect(formatted.modalPersistent).toBe(false)
    expect(formatted.projectionExpanded).toBe(true)
  })

  it('should handle null/undefined modal_persistent gracefully', () => {
    const raw = {
      date_format: 'dd/MM/yyyy', number_format: 'fr-FR', week_start_day: 1,
      dashboard_layout: null, default_account_id: null,
      email_notifications: 1, notify_low_balance: 0, low_balance_threshold: 100,
      notify_upcoming_bills: 1, bills_reminder_days: 3,
      default_import_config: null, theme: 'system',
      modal_persistent: null, projection_expanded: undefined,
    }
    const formatted = User.formatSettings(raw)
    expect(formatted.modalPersistent).toBe(false)
    expect(formatted.projectionExpanded).toBe(false)
  })

  it('should include both new fields in allowedFields', () => {
    // Verify the fields exist in formatSettings output
    const raw = {
      date_format: 'dd/MM/yyyy', number_format: 'fr-FR', week_start_day: 1,
      dashboard_layout: null, default_account_id: null,
      email_notifications: 1, notify_low_balance: 1, low_balance_threshold: 100,
      notify_upcoming_bills: 1, bills_reminder_days: 3,
      default_import_config: null, theme: 'dark',
      modal_persistent: 1, projection_expanded: 1,
    }
    const formatted = User.formatSettings(raw)
    expect(formatted).toHaveProperty('modalPersistent')
    expect(formatted).toHaveProperty('projectionExpanded')
    expect(formatted).toHaveProperty('theme', 'dark')
    expect(formatted).toHaveProperty('weekStartDay', 1)
  })
})
