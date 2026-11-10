import type { RecipeItem, RecipeRowState } from '../types'
import { ingredientById } from '../data/ingredientCache'

function rowGrams(row: RecipeRowState) {
  const factor = row.unit === 'g' ? 1 : ingredientById.get(row.ingredientId)?.conversions[row.unit]
  const grams = row.amount * (factor ?? NaN)
  return factor !== undefined && factor > 0 && Number.isFinite(grams) && grams >= 0 ? grams : -1
}

export function cookingGroupOrder(items: { cookingGroup?: string }[], preferred: string[] = []) {
  const names = [...new Set(items.map(item => item.cookingGroup?.trim() ?? ''))]
  const existing = new Set(names)
  return [...new Set([...preferred.map(name => name.trim()).filter(name => existing.has(name)), ...names])]
}

export function recipeCookingGroups(rows: RecipeRowState[], items: RecipeItem[], preferred: string[] = []) {
  const groups = new Map<string, { row: RecipeRowState; index: number }[]>()
  rows.forEach((row, index) => {
    const name = items[index]?.cookingGroup?.trim() ?? ''
    if (!groups.has(name)) groups.set(name, [])
    groups.get(name)!.push({ row, index })
  })
  return cookingGroupOrder(Array.from(groups.keys(), cookingGroup => ({ cookingGroup })), preferred)
    .map(name => ({ name, entries: groups.get(name)!.sort((a, b) => rowGrams(b.row) - rowGrams(a.row) || a.index - b.index) }))
}
