export const INGREDIENT_UNITS = [
  { ko: 'g', en: 'g' },
  { ko: 'ml', en: 'ml', field: 'gramsPerMl' },
  { ko: 'T', en: 'tbsp', field: 'gramsPerTbsp' },
  { ko: 't', en: 'tsp', field: 'gramsPerTsp' },
  { ko: '컵', en: 'cup', field: 'gramsPerCup' },
  { ko: '개', en: 'each', field: 'gramsPerEach' },
  { ko: '캔', en: 'can', field: 'gramsPerCan' },
  { ko: '팩', en: 'pack', field: 'gramsPerPack' },
  { ko: '꼬집', en: 'pinch', field: 'gramsPerPinch' },
  { ko: '줌', en: 'handful', field: 'gramsPerHandful' },
  { ko: 'oz', en: 'oz', grams: 28.3495 },
  { ko: 'lbs', en: 'lbs', grams: 453.592 },
  { ko: '', en: '' },
] as const

export const CONVERSION_FIELDS = INGREDIENT_UNITS.flatMap(unit => 'field' in unit
  ? [{ key: unit.field, labelKo: unit.ko, labelEn: unit.en }] : [])
export type ConversionField = (typeof CONVERSION_FIELDS)[number]['key']
