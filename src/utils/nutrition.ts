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
  return amount * conversions[unit]
}

export function baseReferenceGrams(ingredient: Ingredient): number {
  return ingredient.baseAmount * ingredient.conversions[ingredient.baseUnit]
}

export function calculateMacros(
  grams: number,
  ingredient: Ingredient,
): { carbs: number; protein: number; fat: number } {
  const baseGrams = baseReferenceGrams(ingredient)
  const factor = grams / baseGrams

  return {
    carbs: factor * ingredient.carbs,
    protein: factor * ingredient.protein,
    fat: factor * ingredient.fat,
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
  return roundToTwo(value).toFixed(2)
}
