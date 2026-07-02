import { useLanguage } from '../context/LanguageContext'
import type { Language } from '../i18n/translations'

const options: { value: Language; label: string; icon: string }[] = [
  { value: 'en', label: 'English', icon: '/icons/us.svg' },
  { value: 'ko', label: 'Korean', icon: '/icons/kr.svg' },
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
          <img src={option.icon} alt={option.label} width="22" height="16" />
        </button>
      ))}
    </div>
  )
}
