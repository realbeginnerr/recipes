import { ingredientById } from '../data/ingredients'
import type { Recipe, RecipeItem } from '../types'
import { amountToGrams, calculateMacros } from './nutrition'

export function recipeMealMacros(recipe: Recipe) {
  const totals = { carbs: 0, protein: 0, fat: 0 }
  const divisions = Math.max(1, recipe.divisionCount ?? 4)
  const sides: RecipeItem[] = recipe.sideItems?.length ? recipe.sideItems : [{ ingredientId: 'multigrain-rice', defaultAmount: 150, defaultUnit: 'g' }]
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
