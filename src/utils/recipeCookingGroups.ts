import type { RecipeItem, RecipeRowState } from '../types'

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
    .map(name => ({ name, entries: groups.get(name)! }))
}
