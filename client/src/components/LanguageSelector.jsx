import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    localStorage.setItem('budgetos-lang', lang)
  }

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1 text-sm">
      {LANGUAGES.map((lang, idx) => (
        <span key={lang.code} className="flex items-center">
          {idx > 0 && <span className="text-white/40 mx-1">|</span>}
          <button
            type="button"
            onClick={() => changeLanguage(lang.code)}
            className={`transition-opacity ${
              i18n.language === lang.code
                ? 'text-white font-bold opacity-100'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {lang.label}
          </button>
        </span>
      ))}
    </div>
  )
}
