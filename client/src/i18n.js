import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'

const savedLang = localStorage.getItem('budgetos-lang') || 'fr'

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: savedLang,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

export default i18n
