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

export function recipeContainsIngredient(
  recipe: Recipe,
  query: string,
): boolean {
  return recipe.items.some((item) => {
    const ingredient = ingredientById.get(item.ingredientId)
    return ingredient ? ingredientMatchesSearch(ingredient, query) : false
  })
}
