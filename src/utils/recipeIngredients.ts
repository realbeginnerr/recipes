import type { Recipe } from '../types'
import { canonicalIngredientId } from '../data/ingredientCatalogOverrides'

export function recipeContainsIngredient(recipe: Recipe, ingredientId: string) {
  const normalize = (id: string) => id === '__multigrain_rice__' ? 'multigrain-rice' : canonicalIngredientId(id)
  return [...recipe.items, ...(recipe.sideItems ?? [])].some(item => normalize(item.ingredientId) === normalize(ingredientId))
}
