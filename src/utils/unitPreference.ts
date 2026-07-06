import type { Language } from '../i18n/translations'

// EN 모드에서 선호하는 단위 순서 (EN 단위 먼저, KO 단위는 fallback)
const EN_UNIT_PRIORITY = [
  'oz', 'lbs', 'each', 'pinch', 'cup', 'tbsp', 'tsp', 'ml', 'g',
  '개', '꼬집', '컵', 'T', 't',
]

// KO 모드에서 선호하는 단위 순서 (KO 단위 먼저, EN 단위는 fallback)
const KO_UNIT_PRIORITY = [
  'g', 'ml', '개', '꼬집', '컵', 'T', 't', 'oz', 'lbs',
  'each', 'pinch', 'cup', 'tbsp', 'tsp',
]

export function getPreferredUnit(
  allowedUnits: string[],
  language: Language,
): string {
  const priority = language === 'en' ? EN_UNIT_PRIORITY : KO_UNIT_PRIORITY

  for (const unit of priority) {
    if (allowedUnits.includes(unit)) return unit
  }

  return allowedUnits[0]
}
