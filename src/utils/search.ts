import type { Ingredient } from '../types'
import type { Recipe } from '../types'
import { ingredientById } from '../data/ingredients'

export function ingredientMatchesSearch(
  ingredient: Ingredient,
  query: string,
): boolean {
  const normalized = query.toLowerCase()
  const names = [
    ingredient.id,
    ingredient.name,
    ingredient.nameKo ?? '',
  ]

  return names.some((name) => name.toLowerCase().includes(normalized))
}

export function recipeMatchesSearch(
  recipe: Recipe,
  query: string,
): boolean {
  const normalized = query.toLowerCase()
  if (recipe.nameKo.toLowerCase().includes(normalized)) return true
  if (recipe.name.toLowerCase().includes(normalized)) return true
  return recipe.items.some((item) => {
    const ingredient = ingredientById.get(item.ingredientId)
    return ingredient ? ingredientMatchesSearch(ingredient, query) : false
  })
}
