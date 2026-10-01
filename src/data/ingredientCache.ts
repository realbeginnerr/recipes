import type { Ingredient } from '../types'

export const ingredients: Ingredient[] = []
export const ingredientById = new Map<string, Ingredient>()

export function cacheIngredient(ingredient: Ingredient, legacyIds: string[] = [], retired = false): void {
  ingredientById.set(ingredient.id, ingredient)
  for (const legacyId of legacyIds) ingredientById.set(legacyId, ingredient)

  const existingIndex = ingredients.findIndex((entry) => entry.id === ingredient.id)
  if (retired) {
    if (existingIndex !== -1) ingredients.splice(existingIndex, 1)
    return
  }
  if (existingIndex === -1) ingredients.push(ingredient)
  else ingredients[existingIndex] = ingredient
}

export function removeCachedIngredient(id: string): void {
  const ingredient = ingredientById.get(id)
  if (!ingredient) return

  for (const [key, value] of ingredientById) {
    if (value.id === ingredient.id) ingredientById.delete(key)
  }
  const index = ingredients.findIndex((entry) => entry.id === ingredient.id)
  if (index !== -1) ingredients.splice(index, 1)
}