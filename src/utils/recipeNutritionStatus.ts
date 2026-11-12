import type { RecipeRowState } from '../types'
import { hasNutritionConversion, recipeIngredient } from './recipeUnitValidation'

export function canCalculateRecipeRow(row: RecipeRowState): boolean {
  const ingredient = recipeIngredient(row.ingredientId)
  if (!hasNutritionConversion(ingredient, row.unit) || !Number.isFinite(row.amount) || row.amount < 0) return false
  const grams = row.amount * ingredient!.conversions[row.unit]
  const factor = grams / (ingredient!.baseAmount * ingredient!.conversions[ingredient!.baseUnit])
  return Number.isFinite(grams) && Number.isFinite(factor)
    && [ingredient!.carbs, ingredient!.protein, ingredient!.fat].every(value => Number.isFinite(value) && value >= 0 && Number.isFinite(factor * value))
}
