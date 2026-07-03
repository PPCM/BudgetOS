import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Global i18n mock: t() returns the translation key so tests can assert on keys
// without loading real translations. Individual test files may still declare
// their own vi.mock('react-i18next', ...) to override this (e.g. to spy on
// changeLanguage or interpolate params).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty', init: () => {} },
}))
