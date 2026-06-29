import { useLanguage } from '../context/LanguageContext'
import type { Language } from '../i18n/translations'

const options: { value: Language; label: string }[] = [
  { value: 'en', label: 'ENG' },
  { value: 'ko', label: '한글' },
]

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`lang-toggle__btn${language === option.value ? ' lang-toggle__btn--active' : ''}`}
          onClick={() => setLanguage(option.value)}
          aria-pressed={language === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
