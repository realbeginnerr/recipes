import { ingredientById } from '../data/ingredientCache'
import type { Ingredient } from '../types'

export function hasNutritionConversion(ingredient: Ingredient | undefined, unit: string): boolean {
  if (!ingredient) return false
  const unitFactor = ingredient.conversions[unit]
  const base = ingredient.baseAmount * ingredient.conversions[ingredient.baseUnit]
  return Number.isFinite(unitFactor) && unitFactor > 0 && Number.isFinite(base) && base > 0
}
export function recipeIngredient(id: string) {
  // The legacy rice row has its own fixed g/oz nutrition model in RecipeTable.
  if (id === '__multigrain_rice__') return {
    id, name: 'Multigrain rice', nameKo: '잡곡밥', baseAmount: 100, baseUnit: 'g',
    carbs: 28.5, protein: 3.1, fat: 0.8, conversions: { g: 1, oz: 28.3495 }, allowedUnits: ['g', 'oz'],
  }
  const normalizedId = id === '__multigrain_rice__' ? 'multigrain-rice' : id
  return ingredientById.get(normalizedId)
}
export function assertRecipeUnits(items: { ingredientId: string; unit: string }[]) {
  const invalid = items.filter(item => !hasNutritionConversion(recipeIngredient(item.ingredientId), item.unit))
  if (!invalid.length) return
  const names = invalid.map(item => `${recipeIngredient(item.ingredientId)?.nameKo ?? item.ingredientId} (${item.unit})`).join(', ')
  throw Object.assign(new Error(`${names}: 단위 환산 정보가 없습니다. 식재료의 단위 환산을 등록하거나 다른 단위를 선택해 주세요.`), { code: 'recipe/missing-conversion' })
}

export function missingRecipeUnits(items: { ingredientId: string; unit: string }[]): Set<string> {
  return new Set(items
    .filter(item => !hasNutritionConversion(recipeIngredient(item.ingredientId), item.unit))
    .map(item => `${item.ingredientId}\u0000${item.unit}`))
}

export function missingDraftRecipeUnits(items: { ingredientId: string; unit: string; isNew?: boolean; baseUnit?: string }[]): Set<string> {
  return new Set(items
    .filter(item => item.isNew && item.unit === item.baseUnit
      ? false
      : !hasNutritionConversion(recipeIngredient(item.ingredientId), item.unit))
    .map(item => `${item.ingredientId}\u0000${item.unit}`))
}
