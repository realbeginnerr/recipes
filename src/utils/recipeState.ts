import { recipes } from '../data/recipe'
import type { Language } from '../i18n/translations'
import type { Recipe, RecipeRowState } from '../types'

export type RecipeStates = Record<string, RecipeRowState[]>

function rowWithPreferredUnit(
  ingredientId: string,
  amount: number,
  unit: string,
  _language: Language,
): RecipeRowState {
  // Language changes labels in UnitSelect, never the saved quantity or unit.
  return { ingredientId, amount, unit }
}

export function buildInitialRecipeStates(language: Language, sourceRecipes: Recipe[] = recipes): RecipeStates {
  return Object.fromEntries(
    sourceRecipes.map((recipe) => [
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
