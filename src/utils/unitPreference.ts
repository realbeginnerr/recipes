import type { Language } from '../i18n/translations'

const US_UNIT_PRIORITY = ['oz', 'piece', 'ml', 'g'] as const
const METRIC_UNIT_PRIORITY = ['g', 'ml', 'piece', 'oz'] as const

export function getPreferredUnit(
  allowedUnits: string[],
  language: Language,
): string {
  const priority =
    language === 'en' ? US_UNIT_PRIORITY : METRIC_UNIT_PRIORITY

  for (const unit of priority) {
    if (allowedUnits.includes(unit)) return unit
  }

  return allowedUnits[0]
}
