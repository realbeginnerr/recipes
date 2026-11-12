import type { RecipeItem } from '../types'
import { hasNutritionConversion, recipeIngredient } from './recipeUnitValidation'

export function changeRecipeItemUnit(item: RecipeItem, unit: string): RecipeItem {
  if (unit === item.defaultUnit) return item
  const ingredient = recipeIngredient(item.ingredientId)
  if (!hasNutritionConversion(ingredient, item.defaultUnit) || !hasNutritionConversion(ingredient, unit)) {
    throw Object.assign(new Error('No unit conversion is available.'), { code: 'recipe/missing-conversion' })
  }
  const amount = item.defaultAmount * ingredient!.conversions[item.defaultUnit] / ingredient!.conversions[unit]
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid converted quantity')
  return { ...item, defaultAmount: amount, defaultUnit: unit }
}
