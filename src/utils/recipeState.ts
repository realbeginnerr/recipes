import { ingredientById } from '../data/ingredients'
import { recipes } from '../data/recipe'
import type { Language } from '../i18n/translations'
import type { RecipeRowState } from '../types'
import { convertUnit, roundToOne } from './nutrition'
import { getPreferredUnit } from './unitPreference'

export type RecipeStates = Record<string, RecipeRowState[]>

function rowWithPreferredUnit(
  ingredientId: string,
  amount: number,
  unit: string,
  language: Language,
): RecipeRowState {
  const ingredient = ingredientById.get(ingredientId)
  if (!ingredient) {
    return { ingredientId, amount, unit }
  }

  const preferredUnit = getPreferredUnit(ingredient.allowedUnits, language)
  if (unit === preferredUnit) {
    return { ingredientId, amount, unit }
  }

  return {
    ingredientId,
    unit: preferredUnit,
    amount: roundToOne(
      convertUnit(amount, unit, preferredUnit, ingredient.conversions),
    ),
  }
}

export function buildInitialRecipeStates(language: Language): RecipeStates {
  return Object.fromEntries(
    recipes.map((recipe) => [
      recipe.id,
      recipe.items.map((item) =>
        rowWithPreferredUnit(
          item.ingredientId,
          item.defaultAmount,
          item.defaultUnit,
          language,
        ),
      ),
    ]),
  )
}

export function applyLanguageToRecipeStates(
  states: RecipeStates,
  language: Language,
): RecipeStates {
  return Object.fromEntries(
    Object.entries(states).map(([recipeId, rows]) => [
      recipeId,
      rows.map((row) =>
        rowWithPreferredUnit(
          row.ingredientId,
          row.amount,
          row.unit,
          language,
        ),
      ),
    ]),
  )
}
