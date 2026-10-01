import { ingredientById } from './ingredientCache'

export function canonicalIngredientId(id: string): string {
  return ingredientById.get(id)?.id ?? id
}
