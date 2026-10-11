import { useLanguage } from '../context/LanguageContext'
import type { Language } from '../i18n/translations'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const base = import.meta.env.BASE_URL

const options: { value: Language; label: string; icon: string }[] = [
  { value: 'ko', label: 'Korean', icon: `${base}icons/kr.svg` },
  { value: 'en', label: 'English', icon: `${base}icons/us.svg` },
]

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  return (
    <ToggleGroup
      value={[language]}
      onValueChange={(vals) => { if (vals.length > 0) setLanguage(vals[0] as Language) }}
      aria-label="Language"
      className="gap-1"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className="h-auto w-auto p-1 rounded-md opacity-50 aria-pressed:opacity-100  "
        >
          <img src={option.icon} alt={option.label} width="22" height="22" style={{ width: 22, height: 22, boxSizing: 'border-box', borderRadius: 0, border: '1px solid rgba(18, 43, 34, 0.12)', objectFit: 'cover', filter: language === option.value ? 'none' : 'grayscale(1)' }} />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
