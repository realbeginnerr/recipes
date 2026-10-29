import { ingredientById } from '../data/ingredientCache'
import type { Recipe, RecipeItem } from '../types'
import { amountToGrams, calculateMacros } from './nutrition'

export function recipeProteinPowderGrams(recipe: Recipe): number {
  return (recipe.sideItems ?? []).reduce((total, item) => {
    const ingredient = ingredientById.get(item.ingredientId)
    if (!ingredient) return total
    const names = `${ingredient.nameKo ?? ''} ${ingredient.name}`.replace(/\s+/g, '').toLowerCase()
    if (!/단백질파우[더서]|proteinpowder/.test(names)) return total
    const grams = amountToGrams(item.defaultAmount, item.defaultUnit, ingredient.conversions)
    return Number.isFinite(grams) && grams > 0 ? total + grams : total
  }, 0)
}

export function recipeMealMacros(recipe: Recipe) {
  const totals = { carbs: 0, protein: 0, fat: 0 }
  const divisions = Math.max(1, recipe.divisionCount ?? 4)
  const sides: RecipeItem[] = recipe.sideItems ?? []
  for (const [items, divisor] of [[recipe.items, divisions], [sides, 1]] as const) {
    for (const item of items) {
      const ingredient = ingredientById.get(item.ingredientId === '__multigrain_rice__' ? 'multigrain-rice' : item.ingredientId)
      if (!ingredient) continue
      const values = calculateMacros(amountToGrams(item.defaultAmount, item.defaultUnit, ingredient.conversions), ingredient)
      for (const key of ['carbs', 'protein', 'fat'] as const) totals[key] += values[key] / divisor
    }
  }
  return totals
}

export function macroRatio(carbs: number, protein: number, fat: number) {
  const energy = [carbs * 4, protein * 4, fat * 9]
  const total = energy.reduce((sum, value) => sum + value, 0)
  if (total === 0) return '—'
  const shares = energy.map(value => value / total * 10)
  const rounded = shares.map(Math.floor)
  const order = shares.map((value, index) => ({ index, remainder: value - rounded[index] })).sort((a, b) => b.remainder - a.remainder)
  const remaining = 10 - rounded.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < remaining; i++) rounded[order[i].index]++
  return rounded.join(':')
}
