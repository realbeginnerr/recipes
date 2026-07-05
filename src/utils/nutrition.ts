import type { Ingredient } from '../types'

export function convertUnit(
  amount: number,
  fromUnit: string,
  toUnit: string,
  conversions: Record<string, number>,
): number {
  const grams = amount * conversions[fromUnit]
  return grams / conversions[toUnit]
}

export function amountToGrams(
  amount: number,
  unit: string,
  conversions: Record<string, number>,
): number {
  const factor = conversions[unit]
  if (factor === undefined || Number.isNaN(factor)) return 0
  return amount * factor
}

export function baseReferenceGrams(ingredient: Ingredient): number {
  return ingredient.baseAmount * ingredient.conversions[ingredient.baseUnit]
}

export function calculateMacros(
  grams: number,
  ingredient: Ingredient,
): { carbs: number; protein: number; fat: number } {
  const baseGrams = baseReferenceGrams(ingredient)
  if (!baseGrams || Number.isNaN(baseGrams)) return { carbs: 0, protein: 0, fat: 0 }
  const factor = grams / baseGrams

  return {
    carbs: Number.isFinite(factor * ingredient.carbs) ? factor * ingredient.carbs : 0,
    protein: Number.isFinite(factor * ingredient.protein) ? factor * ingredient.protein : 0,
    fat: Number.isFinite(factor * ingredient.fat) ? factor * ingredient.fat : 0,
  }
}

export function roundToOne(value: number): number {
  return Math.round(value * 10) / 10
}

export function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100
}

export function formatAmount(value: number): string {
  return roundToOne(value).toFixed(1)
}

export function formatMacro(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0.0'
  return (Math.round(value * 10) / 10).toFixed(1)
}
